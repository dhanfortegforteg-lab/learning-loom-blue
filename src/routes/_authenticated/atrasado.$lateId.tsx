import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateLatePlan, evaluateLateEssay, saveLateProgress } from "@/lib/late.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { FoxMascot } from "@/components/FoxMascot";
import { ArrowLeft, BookOpen, Check, ClipboardCheck, FileText, Lightbulb, PenSquare, ScrollText, Sparkles, Trophy, X } from "lucide-react";
import { NeededContentsButton } from "@/components/NeededContentsButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atrasado/$lateId")({
  head: () => ({
    meta: [
      { title: "Recuperação de conteúdo — Foxstudy" },
      { name: "description", content: "Estude passo a passo o conteúdo atrasado: apostila, resumo, prática, questões e prova." },
      { property: "og:title", content: "Recuperação de conteúdo — Foxstudy" },
      { property: "og:description", content: "Estude passo a passo o conteúdo atrasado: apostila, resumo, prática, questões e prova." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LateRunnerPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Estudo não encontrado.</div>,
});

function LateRunnerPage() {
  const { lateId } = Route.useParams();
  const navigate = useNavigate();
  const genPlan = useServerFn(generateLatePlan);
  const evalEssay = useServerFn(evaluateLateEssay);
  const save = useServerFn(saveLateProgress);

  const [plan, setPlan] = useState<any>(null);
  const [mode, setMode] = useState<"estudo" | "revisao">("estudo");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<number, number>>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [essay, setEssay] = useState("");
  const [essayRes, setEssayRes] = useState<{ score: number; feedback: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewDone, setReviewDone] = useState<Record<number, boolean>>({});
  const [openDay, setOpenDay] = useState<number | null>(1);

  const { data: row, refetch } = useQuery({
    queryKey: ["late-study", lateId],
    queryFn: async () => (await supabase.from("late_studies").select("*").eq("id", lateId).maybeSingle()).data,
  });

  useEffect(() => {
    if (!row) return;
    const p: any = row.progress ?? {};
    if (p.answers) setAnswers(p.answers);
    if (p.revealed) setRevealed(p.revealed);
    if (typeof p.step === "number") setStep(p.step);
    if (p.essay) setEssay(p.essay);
    if (row.essay_score != null) setEssayRes({ score: Number(row.essay_score), feedback: row.essay_feedback ?? "" });
    const rp: any = row.review_progress ?? {};
    if (rp.done) setReviewDone(rp.done);
  }, [row?.id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await genPlan({ data: { id: lateId } });
        if (!cancel) {
          setPlan(res.plan);
          setMode(res.mode === "revisao" ? "revisao" : "estudo");
        }
      } catch (e: any) {
        toast.error(e.message ?? "Falha ao gerar o estudo");
      }
    })();
    return () => { cancel = true; };
  }, [lateId]);

  const steps = useMemo(
    () =>
      mode === "estudo"
        ? [
            { key: "apostila", label: "Apostila", icon: BookOpen },
            { key: "resumo", label: "Resumo", icon: FileText },
            { key: "pratica", label: "Prática", icon: ClipboardCheck },
            { key: "questoes", label: "Questões", icon: ScrollText },
            { key: "prova", label: "Prova", icon: Trophy },
          ]
        : [
            { key: "apostila", label: "Apostila", icon: BookOpen },
            { key: "explicacao", label: "Explicação", icon: Lightbulb },
            { key: "pratica", label: "Mini prática", icon: ClipboardCheck },
            { key: "revisao", label: "Revisão 7 dias", icon: Sparkles },
          ],
    [mode],
  );

  const setAns = (block: string, i: number, oi: number) =>
    setAnswers((a) => ({ ...a, [block]: { ...(a[block] ?? {}), [i]: oi } }));

  const countCorrect = (block: string, qs: any[]) =>
    qs.reduce((acc, q, i) => acc + ((answers[block]?.[i] ?? -1) === q.answer ? 1 : 0), 0);

  const persist = async (extra: Partial<{ score: number; percent: number; completed: boolean; reviewProgress: any }> = {}, nextStep = step, nextAnswers = answers, nextRevealed = revealed) => {
    try {
      await save({
        data: {
          id: lateId,
          progress: { step: nextStep, answers: nextAnswers, revealed: nextRevealed, essay },
          ...extra,
        },
      });
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar progresso");
    }
  };

  const go = (i: number) => {
    setStep(i);
    const percent = Math.round(((i + 1) / steps.length) * 100);
    void persist({ percent }, i);
  };

  if (!plan) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-24 text-center">
        <FoxMascot className="h-24 w-24 animate-bounce" />
        <p className="font-display text-xl font-bold">Montando sua recuperação...</p>
        <p className="text-sm text-muted-foreground">Conteúdo: {row?.content}</p>
      </div>
    );
  }

  const finishStudy = async () => {
    setBusy(true);
    try {
      const blocks: [string, any[]][] =
        mode === "estudo"
          ? [
              ["pratica", plan.pratica?.questions ?? []],
              ["questoes", plan.questoes?.questions ?? []],
              ["prova", plan.prova?.questions ?? []],
            ]
          : [["pratica", plan.pratica?.questions ?? []]];
      const total = blocks.reduce((a, [, qs]) => a + qs.length, 0);
      const correct = blocks.reduce((a, [k, qs]) => a + countCorrect(k, qs), 0);
      const objective = total ? (correct / total) * 10 : 0;
      // Na prova, a redação vale até 35 pontos e entra na média final do estudo completo.
      const score =
        mode === "estudo" && essayRes
          ? Math.round((objective * 0.7 + (essayRes.score / 35) * 10 * 0.3) * 10) / 10
          : Math.round(objective * 10) / 10;
      const rev = { ...revealed, pratica: true, questoes: true, prova: true };
      setRevealed(rev);
      await persist({ score, percent: 100, completed: score >= 7 }, step, answers, rev);
      toast.success(`Nota final: ${score.toFixed(1)} ${score >= 7 ? "— média atingida! 🎉" : "— abaixo de 7.0, use a revisão"}`);

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const rows = blocks.flatMap(([k, qs]) =>
          qs.map((q: any, i: number) => ({
            user_id: uid,
            question: q.question,
            user_answer: q.options?.[answers[k]?.[i] ?? -1] ?? null,
            correct_answer: q.options?.[q.answer] ?? null,
            is_correct: (answers[k]?.[i] ?? -1) === q.answer,
            explanation: q.explanation ?? null,
          })),
        );
        if (rows.length) await supabase.from("answers").insert(rows);
      }
    } finally {
      setBusy(false);
    }
  };

  const sendEssay = async () => {
    setBusy(true);
    try {
      const res = await evalEssay({ data: { id: lateId, theme: plan.prova?.essayPrompt ?? row?.content ?? "", text: essay } });
      setEssayRes(res);
      toast.success(`Redação avaliada: ${res.score.toFixed(1)}/35`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao avaliar a redação");
    } finally {
      setBusy(false);
    }
  };

  const current = steps[step]?.key;
  const totalScore = Number(row?.score ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate({ to: "/atrasado" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar ao estudo atrasado
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-gradient">{row?.content}</h1>
        <p className="text-sm text-muted-foreground">
          Lembrança {row?.recall_pct}% · {mode === "estudo" ? "estudo completo" : "revisão + mini estudo"} · média mínima 7.0 ·
          nota atual {totalScore.toFixed(1)}
        </p>
        <NeededContentsButton topic={row?.content} subject={row?.subject} className="mt-3" />
        <Progress value={row?.percent ?? 0} className="mt-3 h-2" />
      </div>

      <div className={`grid gap-2 ${steps.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => go(i)}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-xs transition ${
              i === step
                ? "border-primary bg-primary/10 text-primary shadow-[var(--shadow-glow)]"
                : i < step
                  ? "border-green-500/50 bg-green-500/5 text-green-500"
                  : "border-border/50 text-muted-foreground hover:border-primary/40"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {current === "apostila" && (
        <div className="space-y-4">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5">
            <div className="mb-1 text-xs uppercase tracking-widest text-primary">Explicação simples</div>
            <h2 className="mb-2 font-display text-2xl font-bold">{plan.apostila?.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.apostila?.simple}</p>
          </Card>
          {plan.apostila?.intro && <Card className="p-5 text-sm leading-relaxed">{plan.apostila.intro}</Card>}
          {(plan.apostila?.blocks ?? []).map((b: any, i: number) => (
            <Card key={i} className="p-5 transition hover:shadow-[var(--shadow-glow)]">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
                <h3 className="font-display text-xl font-bold">{b.title}</h3>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{b.body}</div>
              {b.highlight && (
                <div className="mt-3 rounded-lg border-l-4 border-primary bg-primary/10 p-3 text-sm">💡 <span className="font-medium">{b.highlight}</span></div>
              )}
            </Card>
          ))}
          {!!(plan.apostila?.theories ?? []).length && (
            <Card className="space-y-3 p-5">
              <h3 className="font-display text-xl font-bold text-primary">Teorias e fundamentos</h3>
              {plan.apostila.theories.map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                  <div className="font-semibold text-primary">{t.title}</div>
                  <p className="whitespace-pre-wrap leading-relaxed">{t.body}</p>
                </div>
              ))}
            </Card>
          )}
          <Button size="lg" className="w-full" onClick={() => go(1)}>Continuar</Button>
        </div>
      )}

      {current === "resumo" && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{plan.resumo?.title}</h2>
          {(plan.resumo?.sections ?? []).map((s: any, i: number) => (
            <Card key={i} className="p-5">
              <h3 className="mb-2 font-display text-xl font-bold text-primary">{s.heading}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
              {s.example && <div className="mt-3 rounded-lg bg-primary/10 p-3 text-sm">🌟 <span className="font-medium">Exemplo:</span> {s.example}</div>}
            </Card>
          ))}
          <Button size="lg" className="w-full" onClick={() => go(2)}>Ir para a prática</Button>
        </div>
      )}

      {current === "explicacao" && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{plan.explicacao?.title}</h2>
          <p className="text-base leading-relaxed">{plan.explicacao?.summary}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(plan.explicacao?.points ?? []).map((p: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border/60 p-4">
                <h3 className="mb-1 font-semibold text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <Button size="lg" className="w-full" onClick={() => go(2)}>Ir para a mini prática</Button>
        </Card>
      )}

      {current === "pratica" && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{plan.pratica?.title}</h2>
          <div className="whitespace-pre-wrap rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
            {plan.pratica?.theory}
          </div>
          {(plan.pratica?.questions ?? []).map((q: any, i: number) => (
            <QuestionCard key={i} q={q} index={i} selected={answers['pratica']?.[i]} revealed={!!revealed['pratica']} onSelect={(oi) => setAns("pratica", i, oi)} />
          ))}
          {!revealed['pratica'] ? (
            <Button
              size="lg"
              className="w-full"
              disabled={Object.keys(answers['pratica'] ?? {}).length !== (plan.pratica?.questions?.length ?? 0)}
              onClick={() => {
                const rev = { ...revealed, pratica: true };
                setRevealed(rev);
                void persist({}, step, answers, rev);
              }}
            >
              Conferir respostas
            </Button>
          ) : mode === "estudo" ? (
            <Button size="lg" className="w-full glow-pulse" onClick={() => go(3)}>
              Acertos: {countCorrect("pratica", plan.pratica?.questions ?? [])}/{plan.pratica?.questions?.length ?? 0} — ir para as questões
            </Button>
          ) : (
            <Button size="lg" className="w-full glow-pulse" disabled={busy} onClick={async () => { await finishStudy(); go(3); }}>
              Acertos: {countCorrect("pratica", plan.pratica?.questions ?? [])}/{plan.pratica?.questions?.length ?? 0} — ir para a revisão de 7 dias
            </Button>
          )}
        </Card>
      )}

      {current === "questoes" && (
        <Card className="glass space-y-4 p-6">
          <h2 className="font-display text-2xl font-bold">{plan.questoes?.title}</h2>
          <div className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed">
            {plan.questoes?.guide}
          </div>
          {(plan.questoes?.questions ?? []).map((q: any, i: number) => (
            <QuestionCard key={i} q={q} index={i} selected={answers['questoes']?.[i]} revealed={!!revealed['questoes']} onSelect={(oi) => setAns("questoes", i, oi)} />
          ))}
          {!revealed['questoes'] ? (
            <Button
              size="lg"
              className="w-full"
              disabled={Object.keys(answers['questoes'] ?? {}).length !== (plan.questoes?.questions?.length ?? 0)}
              onClick={() => {
                const rev = { ...revealed, questoes: true };
                setRevealed(rev);
                void persist({}, step, answers, rev);
              }}
            >
              Conferir respostas
            </Button>
          ) : (
            <Button size="lg" className="w-full glow-pulse" onClick={() => go(4)}>Ir para a prova</Button>
          )}
        </Card>
      )}

      {current === "prova" && (
        <div className="space-y-4">
          <Card className="glass space-y-3 p-6">
            <div className="flex items-center gap-2 text-primary">
              <PenSquare className="h-5 w-5" />
              <h2 className="font-display text-2xl font-bold">Redação (até 35)</h2>
            </div>
            <p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">{plan.prova?.essayPrompt}</p>
            <Textarea rows={10} value={essay} maxLength={8000} onChange={(e) => setEssay(e.target.value)} placeholder="Escreva demonstrando domínio do tema..." />
            <Button disabled={busy || essay.trim().length < 20} onClick={sendEssay}>
              {busy ? "Avaliando..." : essayRes ? "Reavaliar redação" : "Enviar redação"}
            </Button>
            {essayRes && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <div className="font-display text-2xl font-bold">{essayRes.score.toFixed(1)}/35</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{essayRes.feedback}</p>
              </div>
            )}
          </Card>

          <Card className="glass space-y-4 p-6">
            <h2 className="font-display text-2xl font-bold">{plan.prova?.title ?? "Prova"}</h2>
            <p className="text-sm text-muted-foreground">{plan.prova?.questions?.length ?? 0} questões com textos guia curtos.</p>
            {(plan.prova?.questions ?? []).map((q: any, i: number) => (
              <div key={i} className="space-y-2">
                {q.text && <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed">{q.text}</div>}
                <QuestionCard q={q} index={i} selected={answers['prova']?.[i]} revealed={!!revealed['prova']} onSelect={(oi) => setAns("prova", i, oi)} />
              </div>
            ))}
            {!revealed['prova'] && (
              <Button size="lg" className="w-full glow-pulse" disabled={busy} onClick={finishStudy}>
                {busy ? "Salvando..." : "Finalizar prova"}
              </Button>
            )}
            {revealed['prova'] && (
              <div className="rounded-2xl border border-primary bg-primary/10 p-6 text-center">
                <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
                <div className="font-display text-3xl font-bold">{totalScore.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">
                  {totalScore >= 7 ? "Média mínima atingida! 🎉" : "Abaixo de 7.0 — crie uma revisão para melhorar."}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {current === "revisao" && (
        <div className="space-y-4">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5">
            <h2 className="font-display text-2xl font-bold">Revisão de 7 dias</h2>
            <p className="text-sm text-muted-foreground">
              Flashcards, mini textos, escrita, palavras-chave e mini simulados nível 1 — um dia por vez.
            </p>
            <Progress value={(Object.values(reviewDone).filter(Boolean).length / 7) * 100} className="mt-3 h-2" />
          </Card>
          {(plan.week ?? []).map((d: any) => (
            <Card key={d.day} className="p-5">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenDay(openDay === d.day ? null : d.day)}>
                <div>
                  <div className="font-display text-lg font-bold">Dia {d.day}</div>
                  <div className="text-sm text-muted-foreground">{d.focus}</div>
                </div>
                {reviewDone[d.day] ? <Check className="h-5 w-5 text-green-500" /> : <Sparkles className="h-5 w-5 text-primary" />}
              </button>

              {openDay === d.day && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="mb-2 font-semibold text-primary">Flashcards</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(d.flashcards ?? []).map((f: any, i: number) => <Flashcard key={i} f={f} />)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
                    <div className="mb-1 font-semibold text-primary">{d.miniText?.title}</div>
                    <p className="whitespace-pre-wrap">{d.miniText?.body}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    <span className="font-semibold text-primary">Escrita: </span>{d.writingPrompt}
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold text-primary">Palavras-chave</h4>
                    <div className="flex flex-wrap gap-2">
                      {(d.keywords ?? []).map((k: any, i: number) => (
                        <span key={i} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs" title={k.meaning}>
                          {k.term}
                        </span>
                      ))}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(d.keywords ?? []).map((k: any, i: number) => <li key={i}><b>{k.term}:</b> {k.meaning}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-primary">Mini simulado</h4>
                    {(d.miniSimulado ?? []).map((q: any, i: number) => (
                      <QuestionCard
                        key={i}
                        q={q}
                        index={i}
                        selected={answers[`d${d.day}`]?.[i]}
                        revealed={!!revealed[`d${d.day}`]}
                        onSelect={(oi) => setAns(`d${d.day}`, i, oi)}
                      />
                    ))}
                    {!revealed[`d${d.day}`] && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          const rev = { ...revealed, [`d${d.day}`]: true };
                          setRevealed(rev);
                          void persist({}, step, answers, rev);
                        }}
                      >
                        Conferir mini simulado
                      </Button>
                    )}
                  </div>
                  <Button
                    variant={reviewDone[d.day] ? "outline" : "default"}
                    className="w-full"
                    onClick={() => {
                      const done = { ...reviewDone, [d.day]: !reviewDone[d.day] };
                      setReviewDone(done);
                      const pct = Math.round((Object.values(done).filter(Boolean).length / 7) * 100);
                      void persist({ reviewProgress: { done }, percent: pct, completed: pct === 100 });
                    }}
                  >
                    {reviewDone[d.day] ? "Marcar dia como pendente" : "Concluir dia " + d.day}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Flashcard({ f }: { f: any }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-left text-sm transition hover:shadow-[var(--shadow-glow)]"
    >
      <div className="font-medium">{f.front}</div>
      <div className={`mt-2 text-muted-foreground ${open ? "" : "blur-sm select-none"}`}>{f.back}</div>
    </button>
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
