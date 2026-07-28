import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Trophy } from "lucide-react";

export function QuestionsRunner({ c, kind, materialId }: { c: any; kind: string; materialId: string }) {
  const questions = c.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const correctCount = questions.reduce((a: number, q: any, i: number) => a + (answers[i] === q.answer ? 1 : 0), 0);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (uid) {
      const rows = questions.map((q: any, i: number) => ({
        user_id: uid,
        material_id: materialId,
        question: q.question,
        user_answer: q.options[answers[i]] ?? null,
        correct_answer: q.options[q.answer],
        is_correct: answers[i] === q.answer,
        explanation: q.explanation ?? null,
      }));
      await supabase.from("answers").insert(rows);
      if (kind === "prova" || kind === "quiz" || kind === "simulado") {
        const max = kind === "simulado" ? 500 : 100;
        const score = (correctCount / questions.length) * max;
        await supabase.from("exam_scores").insert({ user_id: uid, kind, subject: c.title, score, max_score: max });
      }
      // XP
      const { data: prof } = await supabase.from("profiles").select("xp").maybeSingle();
      await supabase.from("profiles").update({ xp: (prof?.xp ?? 0) + correctCount * 5 }).eq("id", uid);
    }
    setSubmitted(true);
    setSaving(false);
  };

  const correct = questions.reduce((a: number, q: any, i: number) => a + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <div className="space-y-4">
      {submitted && (
        <Card className="glow-pulse border-primary p-6 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
          <div className="font-display text-3xl font-bold">{correct}/{questions.length}</div>
          <div className="text-sm text-muted-foreground">
            {kind === "simulado" ? `Nota: ${Math.round((correct / questions.length) * 500)}/500` : `${Math.round((correct / questions.length) * 100)}% de acertos`}
          </div>
        </Card>
      )}
      {questions.map((q: any, i: number) => (
        <Card key={i} className="p-5">
          <div className="mb-3 font-semibold"><span className="text-primary">{i + 1}.</span> {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt: string, oi: number) => {
              const selected = answers[i] === oi;
              const isCorrect = submitted && oi === q.answer;
              const isWrong = submitted && selected && oi !== q.answer;
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers({ ...answers, [i]: oi })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                    isCorrect ? "border-green-500 bg-green-500/10" :
                    isWrong ? "border-destructive bg-destructive/10" :
                    selected ? "border-primary bg-primary/10" :
                    "border-border hover:border-primary/50"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                    {isCorrect ? <Check className="h-3 w-3" /> : isWrong ? <X className="h-3 w-3" /> : String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">💡 {q.explanation}</div>
          )}
        </Card>
      ))}
      {!submitted && (
        <Button size="lg" onClick={submit} disabled={saving || Object.keys(answers).length !== questions.length} className="w-full glow-pulse">
          {saving ? "Salvando..." : "Enviar respostas"}
        </Button>
      )}
    </div>
  );
}
