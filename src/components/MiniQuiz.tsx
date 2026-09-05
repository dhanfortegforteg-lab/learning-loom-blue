import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MiniQuestion = {
  question: string;
  text?: string;
  options: string[];
  answer: number;
  explanation?: string;
};

/** Quiz simples que registra acertos e erros no progresso do aluno. */
export function MiniQuiz({
  questions,
  onFinish,
}: {
  questions: MiniQuestion[];
  onFinish?: (correct: number, total: number) => void;
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const choose = async (qi: number, oi: number) => {
    if (picked[qi] !== undefined || done) return;
    const next = { ...picked, [qi]: oi };
    setPicked(next);
    const q = questions[qi];
    await supabase.from("answers").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
      question: q.question,
      user_answer: q.options?.[oi] ?? "",
      correct_answer: q.options?.[q.answer] ?? "",
      is_correct: oi === q.answer,
      explanation: q.explanation ?? null,
    });
    if (Object.keys(next).length === questions.length) {
      setDone(true);
      const correct = questions.filter((qq, i) => next[i] === qq.answer).length;
      onFinish?.(correct, questions.length);
    }
  };

  const correct = questions.filter((q, i) => picked[i] === q.answer).length;

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const sel = picked[qi];
        return (
          <Card key={qi} className="space-y-3 p-4">
            {q.text && <p className="rounded-lg bg-muted/50 p-3 text-sm italic">{q.text}</p>}
            <div className="font-medium">{qi + 1}. {q.question}</div>
            <div className="grid gap-2">
              {(q.options ?? []).map((o, oi) => {
                const state =
                  sel === undefined ? "" : oi === q.answer ? "border-primary bg-primary/15" : oi === sel ? "border-destructive bg-destructive/10" : "opacity-60";
                return (
                  <Button
                    key={oi}
                    variant="outline"
                    className={`h-auto justify-start whitespace-normal py-2 text-left ${state}`}
                    onClick={() => choose(qi, oi)}
                    disabled={sel !== undefined}
                  >
                    {String.fromCharCode(65 + oi)}) {o}
                  </Button>
                );
              })}
            </div>
            {sel !== undefined && q.explanation && (
              <p className="text-sm text-muted-foreground">{q.explanation}</p>
            )}
          </Card>
        );
      })}
      {done && (
        <Card className="border-primary/40 bg-primary/10 p-4 text-center font-display text-lg font-bold">
          Você acertou {correct} de {questions.length}
        </Card>
      )}
    </div>
  );
}
