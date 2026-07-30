import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateMaterial } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
import { QuestionsRunner } from "@/components/materials/QuestionsRunner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/revisar")({
  head: () => ({ meta: [{ title: "Falhas na Revisão — Foxstudy" }, { name: "description", content: "Revise seus erros com uma prática corretiva gerada por IA." }] }),
  component: RevisarPage,
});

function RevisarPage() {
  const gen = useServerFn(generateMaterial);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<any>(null);

  const { data: mistakes } = useQuery({
    queryKey: ["mistakes"],
    queryFn: async () => (await supabase.from("answers").select("question, user_answer, correct_answer, explanation").eq("is_correct", false).order("created_at", { ascending: false }).limit(15)).data ?? [],
  });

  const generate = async () => {
    if (!mistakes?.length) return toast.error("Você ainda não tem erros registrados");
    setLoading(true);
    try {
      const res = await gen({ data: { kind: "falhas", subject: "Revisão de falhas", extra: { mistakes } } });
      setContent(res.content);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><RotateCcw className="h-7 w-7 text-primary" /> Falhas na Revisão</h1>
        <p className="text-muted-foreground">Volte nos seus erros e aprenda com eles.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{mistakes?.length ?? 0} erros registrados</div>
            <div className="text-xs text-muted-foreground">Gere uma revisão corretiva focada nas suas falhas.</div>
          </div>
          <Button onClick={generate} disabled={loading} className="glow-pulse">
            <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Gerando..." : "Gerar revisão"}
          </Button>
        </div>
      </Card>

      {content && (
        <>
          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5">
            <h2 className="mb-2 font-display text-xl font-bold">{content.title}</h2>
            <p className="text-sm leading-relaxed">{content.review}</p>
            {content.tips?.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {content.tips.map((t: string, i: number) => <li key={i}>✅ {t}</li>)}
              </ul>
            )}
          </Card>
          <QuestionsRunner c={{ questions: content.questions }} kind="revisao" materialId="" />
        </>
      )}
    </div>
  );
}
