import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateContentSessions, submitContentResult } from "@/lib/tracks.functions";
import { goalLabel } from "@/lib/unlock";
import { NeededContentsButton } from "@/components/NeededContentsButton";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FoxMascot } from "@/components/FoxMascot";
import { BookOpen, Lightbulb, ClipboardCheck, ScrollText, Check, X, ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trilha/$contentId")({
  head: () => ({
    meta: [
      { title: "Sessões de estudo — Foxstudy" },
      { name: "description", content: "Apostila, explicação, prática e simulado do conteúdo da sua trilha." },
      { property: "og:title", content: "Sessões de estudo — Foxstudy" },
      { property: "og:description", content: "Apostila, explicação, prática e simulado do conteúdo da sua trilha." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrilhaContentPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Conteúdo não encontrado.</div>,
});

const STEPS = [
  { key: "apostila", label: "Apostila", icon: BookOpen },
  { key: "explicacao", label: "Explicação", icon: Lightbulb },
  { key: "pratica", label: "Prática", icon: ClipboardCheck },
  { key: "simulado", label: "Simulado", icon: ScrollText },
] as const;

function TrilhaContentPage() {
  const { contentId } = Route.useParams();
  const navigate = useNavigate();
  const gen = useServerFn(generateContentSessions);
  const submit = useServerFn(submitContentResult);

  const [sessions, setSessions] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [pAns, setPAns] = useState<Record<number, number>>({});
  const [pDone, setPDone] = useState(false);
  const [sAns, setSAns] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState<{ score: number; attempts: number; unlocked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: content } = useQuery({
    queryKey: ["track-content", contentId],
    queryFn: async () => (await supabase.from("track_contents").select("*").eq("id", contentId).maybeSingle()).data,
  });

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await gen({ data: { contentId } });
        if (!cancel) setSessions(res.sessions);
      } catch (e: any) {
        toast.error(e.message ?? "Falha ao gerar as sessões");
      }
    })();
    return () => { cancel = true; };
  }, [contentId]);

  if (!sessions) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-24 text-center">
        <FoxMascot className="h-24 w-24 animate-bounce" />
        <p className="font-display text-xl font-bold">Montando suas 4 sessões de estudo...</p>
        <p className="text-sm text-muted-foreground">Apostila, explicação, prática e simulado sobre {content?.title}.</p>
      </div>
    );
  }

  const pratica = sessions.pratica ?? { questions: [] };
  const simulado = sessions.simulado ?? { questions: [] };
  const pCorrect = (pratica.questions ?? []).reduce((a: number, q: any, i: number) => a + (pAns[i] === q.answer ? 1 : 0), 0);
  const sCorrect = (simulado.questions ?? []).reduce((a: number, q: any, i: number) => a + (sAns[i] === q.answer ? 1 : 0), 0);

  const finish = async () => {
    setBusy(true);
    try {
      const total = (pratica.questions?.length ?? 0) + (simulado.questions?.length ?? 0);
      const res = await submit({ data: { contentId, correct: pCorrect + sCorrect, total } });
      setFinished(res);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const rows = [...(pratica.questions ?? []), ...(simulado.questions ?? [])].map((q: any, idx: number) => {
          const isP = idx < (pratica.questions?.length ?? 0);
          const sel = isP ? pAns[idx] : sAns[idx - (pratica.questions?.length ?? 0)];
          return {
            user_id: uid,
            question: q.question,
            user_answer: q.options[sel] ?? null,
            correct_answer: q.options[q.answer],
            is_correct: sel === q.answer,
            explanation: q.explanation ?? null,
          };
        });
        await supabase.from("answers").insert(rows);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate({ to: "/trilhas" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar às trilhas
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-gradient">{content?.title}</h1>
        <NeededContentsButton topic={content?.title} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-xs transition ${
              i === step ? "border-primary bg-primary/10 text-primary shadow-[var(--shadow-glow)]" :
              i < step ? "border-green-500/50 bg-green-500/5 text-green-500" : "border-border/50 text-muted-foreground"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{sessions.apostila?.title}</h2>
          {sessions.apostila?.intro && <p className="text-muted-foreground">{sessions.apostila.intro}</p>}
          {(sessions.apostila?.blocks ?? []).map((b: any, i: number) => (
            <div key={i} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-2 font-semibold text-primary">{b.title}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.body}</p>
              {b.highlight && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">✨ {b.highlight}</div>}
            </div>
          ))}
          <Button size="lg" className="w-full" onClick={() => setStep(1)}>Ir para a explicação</Button>
        </Card>
      )}

      {step === 1 && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{sessions.explicacao?.title}</h2>
          <p className="text-base leading-relaxed">{sessions.explicacao?.summary}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(sessions.explicacao?.points ?? []).map((p: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border/60 p-4">
                <h3 className="mb-1 font-semibold text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(2)}>Ir para a prática</Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{pratica.title}</h2>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {pratica.theory}
          </div>
          {(pratica.questions ?? []).map((q: any, i: number) => (
            <QuestionCard key={i} q={q} index={i} selected={pAns[i]} revealed={pDone} onSelect={(oi) => setPAns({ ...pAns, [i]: oi })} />
          ))}
          {!pDone ? (
            <Button size="lg" className="w-full" disabled={Object.keys(pAns).length !== (pratica.questions?.length ?? 0)} onClick={() => setPDone(true)}>
              Conferir respostas
            </Button>
          ) : (
            <Button size="lg" className="w-full glow-pulse" onClick={() => setStep(3)}>
              Acertos: {pCorrect}/{pratica.questions?.length ?? 0} — ir para o simulado
            </Button>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{simulado.title}</h2>
          {finished && (
            <div className="rounded-2xl border border-primary bg-primary/10 p-6 text-center">
              <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
              <div className="font-display text-3xl font-bold">{finished.score.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">
                {finished.unlocked
                  ? "Meta atingida! Próximo conteúdo desbloqueado 🎉"
                  : `Ainda falta atingir a meta: ${goalLabel(content)} (${finished.attempts} tentativa(s)).`}
              </p>
              <Button className="mt-4" onClick={() => navigate({ to: "/trilhas" })}>Voltar às trilhas</Button>
            </div>
          )}

          {(simulado.questions ?? []).map((q: any, i: number) => (
            <div key={i} className="space-y-2">
              {q.text && <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed">{q.text}</div>}
              <QuestionCard q={q} index={i} selected={sAns[i]} revealed={!!finished} onSelect={(oi) => setSAns({ ...sAns, [i]: oi })} />
            </div>
          ))}
          {!finished && (
            <Button size="lg" className="w-full glow-pulse" disabled={busy || Object.keys(sAns).length !== (simulado.questions?.length ?? 0)} onClick={finish}>
              {busy ? "Salvando..." : "Finalizar conteúdo"}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

function QuestionCard({ q, index, selected, revealed, onSelect }: { q: any; index: number; selected?: number; revealed: boolean; onSelect: (i: number) => void }) {
  return (
    <Card className="p-5">
      <div className="mb-3 font-semibold"><span className="text-primary">{index + 1}.</span> {q.question}</div>
      <div className="space-y-2">
        {(q.options ?? []).map((opt: string, oi: number) => {
          const isSel = selected === oi;
          const isCorrect = revealed && oi === q.answer;
          const isWrong = revealed && isSel && oi !== q.answer;
          return (
            <button
              key={oi}
              disabled={revealed}
              onClick={() => onSelect(oi)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                isCorrect ? "border-green-500 bg-green-500/10" :
                isWrong ? "border-destructive bg-destructive/10" :
                isSel ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                {isCorrect ? <Check className="h-3 w-3" /> : isWrong ? <X className="h-3 w-3" /> : String.fromCharCode(65 + oi)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && q.explanation && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">💡 {q.explanation}</div>}
    </Card>
  );
}
