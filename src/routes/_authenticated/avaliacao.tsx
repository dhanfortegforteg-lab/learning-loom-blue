import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateExam, submitExam } from "@/lib/exams.functions";
import { EXAM_STAGES, EXAM_KINDS, stageConfig } from "@/lib/exams";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoxMascot } from "@/components/FoxMascot";
import { ClipboardCheck, Check, X, Trophy, GraduationCap, BarChart3, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/avaliacao")({
  head: () => ({
    meta: [
      { title: "Avaliação — Simulados e provas | Foxstudy" },
      { name: "description", content: "Faça simulados e provas por etapa de ensino e acompanhe se você realmente está aprendendo." },
      { property: "og:title", content: "Avaliação — Simulados e provas | Foxstudy" },
      { property: "og:description", content: "Simulados e provas com dificuldade e número de questões ajustados à sua etapa de ensino." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AvaliacaoPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
});

const STORAGE = "foxstudy-exam-progress";

type ExamState = {
  kind: "simulado" | "prova";
  stage: string;
  discipline: string;
  subject: string;
  title: string;
  questions: any[];
  answers: Record<number, number>;
  result: { score: number; correct: number; total: number } | null;
};

function AvaliacaoPage() {
  const gen = useServerFn(generateExam);
  const send = useServerFn(submitExam);

  const [kind, setKind] = useState<"simulado" | "prova">("simulado");
  const [stage, setStage] = useState<string>("Ensino Médio");
  const [discipline, setDiscipline] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const cfg = stageConfig(stage);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setExam(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (exam) localStorage.setItem(STORAGE, JSON.stringify(exam));
    else localStorage.removeItem(STORAGE);
  }, [exam, hydrated]);

  useEffect(() => {
    if (discipline && !cfg.disciplines.includes(discipline)) setDiscipline("");
  }, [stage]);

  const { data: history, refetch } = useQuery({
    queryKey: ["exam-scores"],
    queryFn: async () =>
      (await supabase.from("exam_scores").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const media = history?.length
    ? history.reduce((a, r) => a + Number(r.score), 0) / history.length
    : null;

  const start = async () => {
    if (!discipline || !subject.trim()) return toast.error("Escolha a disciplina e o assunto");
    setBusy(true);
    try {
      const res = await gen({ data: { kind, stage, discipline, subject: subject.trim() } });
      setExam({ kind, stage, discipline, subject: subject.trim(), title: res.title, questions: res.questions, answers: {}, result: null });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar a avaliação");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!exam) return;
    setBusy(true);
    try {
      const correct = exam.questions.reduce((a, q, i) => a + (exam.answers[i] === q.answer ? 1 : 0), 0);
      const rows = exam.questions.map((q, i) => ({
        question: q.question,
        user_answer: q.options?.[exam.answers[i]] ?? null,
        correct_answer: q.options?.[q.answer] ?? "",
        is_correct: exam.answers[i] === q.answer,
        explanation: q.explanation ?? null,
      }));
      const res = await send({
        data: { kind: exam.kind, subject: exam.subject, correct, total: exam.questions.length, answers: rows },
      });
      setExam({ ...exam, result: res });
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar a avaliação");
    } finally {
      setBusy(false);
    }
  };

  if (busy && !exam) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-24 text-center">
        <FoxMascot className="h-24 w-24 animate-bounce" />
        <p className="font-display text-xl font-bold">Montando sua avaliação...</p>
        <p className="text-sm text-muted-foreground">{cfg.questions} questões · nível {cfg.level} · {cfg.label}</p>
      </div>
    );
  }

  if (exam) {
    const answered = Object.keys(exam.answers).length;
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient">{exam.title}</h1>
            <p className="text-sm text-muted-foreground">
              {exam.kind === "simulado" ? "Simulado" : "Prova"} · {exam.discipline} · {stageConfig(exam.stage).label}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setExam(null)} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Nova avaliação
          </Button>
        </div>

        {exam.result && (
          <Card className="glass border-primary p-6 text-center">
            <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
            <div className="font-display text-4xl font-bold">{exam.result.score.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">
              {exam.result.correct} de {exam.result.total} acertos · {exam.result.correct * 5} XP
            </p>
            <p className="mt-2 text-sm">
              {exam.result.score >= 6
                ? "Você está aprendendo bem esse assunto 🎉"
                : "Revise o conteúdo — os erros foram salvos em Falhas na Revisão."}
            </p>
          </Card>
        )}

        {!exam.result && (
          <div className="sticky top-16 z-10 rounded-2xl border border-primary/30 bg-background/80 p-3 text-sm backdrop-blur-xl">
            Respondidas <span className="font-semibold text-primary">{answered}</span> de {exam.questions.length}
          </div>
        )}

        {exam.questions.map((q: any, i: number) => (
          <div key={i} className="space-y-2">
            {q.text && (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed">{q.text}</div>
            )}
            <Card className="p-5">
              <div className="mb-3 font-semibold"><span className="text-primary">{i + 1}.</span> {q.question}</div>
              <div className="space-y-2">
                {(q.options ?? []).map((opt: string, oi: number) => {
                  const sel = exam.answers[i] === oi;
                  const revealed = !!exam.result;
                  const ok = revealed && oi === q.answer;
                  const bad = revealed && sel && oi !== q.answer;
                  return (
                    <button
                      key={oi}
                      disabled={revealed}
                      onClick={() => setExam({ ...exam, answers: { ...exam.answers, [i]: oi } })}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        ok ? "border-green-500 bg-green-500/10" :
                        bad ? "border-destructive bg-destructive/10" :
                        sel ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${sel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                        {ok ? <Check className="h-3 w-3" /> : bad ? <X className="h-3 w-3" /> : String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {exam.result && q.explanation && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">💡 {q.explanation}</div>
              )}
            </Card>
          </div>
        ))}

        {!exam.result && (
          <Button size="lg" className="w-full glow-pulse" disabled={busy || answered !== exam.questions.length} onClick={finish}>
            {busy ? "Corrigindo..." : "Entregar avaliação"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient">Avaliação</h1>
        <p className="text-sm text-muted-foreground">
          Simulados e provas separados dos materiais — aqui o objetivo é medir se você está mesmo aprendendo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass p-4">
          <BarChart3 className="mb-2 h-5 w-5 text-primary" />
          <div className="font-display text-2xl font-bold">{media !== null ? media.toFixed(1) : "—"}</div>
          <p className="text-xs text-muted-foreground">Média das últimas avaliações</p>
        </Card>
        <Card className="glass p-4">
          <ClipboardCheck className="mb-2 h-5 w-5 text-primary" />
          <div className="font-display text-2xl font-bold">{history?.length ?? 0}</div>
          <p className="text-xs text-muted-foreground">Avaliações realizadas</p>
        </Card>
        <Card className="glass p-4">
          <GraduationCap className="mb-2 h-5 w-5 text-primary" />
          <div className="font-display text-2xl font-bold">{cfg.questions}</div>
          <p className="text-xs text-muted-foreground">Questões nesta etapa · nível {cfg.level}</p>
        </Card>
      </div>

      <Card className="glass space-y-4 p-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAM_KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                kind === k.value ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-display text-lg font-bold">{k.label}</div>
              <p className="text-xs text-muted-foreground">{k.hint}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Etapa</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
              <SelectContent>
                {EXAM_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Matéria</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger><SelectValue placeholder="Escolha a matéria" /></SelectTrigger>
              <SelectContent>
                {cfg.disciplines.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Funções do 1º grau" />
          </div>
        </div>

        <Button size="lg" className="w-full glow-pulse" disabled={busy} onClick={start}>
          Começar {kind === "simulado" ? "simulado" : "prova"} · {cfg.questions} questões
        </Button>
      </Card>

      <Card className="glass p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Histórico de desempenho</h2>
          <DeleteAllButton label="avaliações salvas" count={history?.length ?? 0} onConfirm={delAllScores} />
        </div>
        {!history?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Faça a primeira para começar a medir seu aprendizado.</p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                <div>
                  <div className="font-medium">{r.subject ?? "Avaliação"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.kind === "prova" ? "Prova" : "Simulado"} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`font-display text-xl font-bold ${Number(r.score) >= 6 ? "text-green-500" : "text-destructive"}`}>
                    {Number(r.score).toFixed(1)}
                  </div>
                  <DeleteItemButton label="este resultado" onConfirm={() => delScore(r.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
