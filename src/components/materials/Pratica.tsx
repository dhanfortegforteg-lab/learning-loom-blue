import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function Pratica({ c, materialId }: { c: any; materialId: string }) {
  const sections = c.sections ?? [];
  const [sec, setSec] = useState(0);
  const [phase, setPhase] = useState<"theory" | "questions" | "done">("theory");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submittedIdx, setSubmittedIdx] = useState<Set<number>>(new Set());

  const s = sections[sec];
  if (!s) return null;

  const submitQ = async (qi: number) => {
    const q = s.questions[qi];
    const correct = answers[qi] === q.answer;
    setSubmittedIdx((n) => new Set(n).add(qi));
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) {
      await supabase.from("answers").insert({
        user_id: sess.session.user.id,
        material_id: materialId,
        question: q.question,
        user_answer: q.options[answers[qi]],
        correct_answer: q.options[q.answer],
        is_correct: correct,
        explanation: q.explanation,
      });
    }
  };

  const nextSection = () => {
    if (sec + 1 < sections.length) { setSec(sec + 1); setPhase("theory"); setAnswers({}); setSubmittedIdx(new Set()); }
    else setPhase("done");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {sections.map((_: any, i: number) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i < sec ? "bg-primary" : i === sec ? "bg-primary/60" : "bg-muted"}`} />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">Seção {sec + 1} de {sections.length}</div>

      {phase === "done" && (
        <Card className="glow-pulse p-8 text-center">
          <h2 className="font-display text-3xl font-bold">Prática concluída! 🎉</h2>
          <p className="mt-2 text-muted-foreground">Você completou as {sections.length} seções.</p>
        </Card>
      )}

      {phase === "theory" && (
        <Card className="p-6">
          <div className="mb-2 text-xs uppercase tracking-widest text-primary">Teoria</div>
          <h3 className="mb-3 font-display text-2xl font-bold">{s.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.theory}</p>
          <Button className="mt-6" onClick={() => setPhase("questions")}>Ir para as perguntas <ChevronRight className="ml-1 h-4 w-4" /></Button>
        </Card>
      )}

      {phase === "questions" && (
        <div className="space-y-4">
          {s.questions.map((q: any, qi: number) => {
            const submitted = submittedIdx.has(qi);
            return (
              <Card key={qi} className="p-5">
                <div className="mb-3 font-semibold">{qi + 1}. {q.question}</div>
                <div className="space-y-2">
                  {q.options.map((opt: string, oi: number) => {
                    const sel = answers[qi] === oi;
                    const ok = submitted && oi === q.answer;
                    const bad = submitted && sel && oi !== q.answer;
                    return (
                      <button key={oi} disabled={submitted} onClick={() => setAnswers({ ...answers, [qi]: oi })}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                          ok ? "border-green-500 bg-green-500/10" :
                          bad ? "border-destructive bg-destructive/10" :
                          sel ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${sel ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                          {ok ? <Check className="h-3 w-3" /> : bad ? <X className="h-3 w-3" /> : String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">💡 {q.explanation}</div>}
                {!submitted && answers[qi] !== undefined && (
                  <Button size="sm" className="mt-3" onClick={() => submitQ(qi)}>Confirmar</Button>
                )}
              </Card>
            );
          })}
          {submittedIdx.size === s.questions.length && (
            <Button size="lg" className="w-full glow-pulse" onClick={nextSection}>
              {sec + 1 < sections.length ? "Próxima seção" : "Finalizar prática"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
