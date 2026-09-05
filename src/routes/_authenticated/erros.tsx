import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateErrorReview } from "@/lib/extras.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MiniQuiz } from "@/components/MiniQuiz";
import { StudyTools } from "@/components/StudyTools";
import { NeededContentsButton } from "@/components/NeededContentsButton";
import { DeleteItemButton } from "@/components/DeleteControls";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/erros")({
  head: () => ({
    meta: [
      { title: "Consolidação dos Erros — Foxstudy" },
      { name: "description", content: "Todos os seus erros reunidos com revisão rápida, flashcards e checagem." },
      { property: "og:title", content: "Consolidação dos Erros — Foxstudy" },
      { property: "og:description", content: "Transforme os erros em aprendizado com revisões corretivas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ErrosPage,
});

/** Palavras muito comuns não servem como tema do erro. */
const STOP = new Set(["sobre", "qual", "quais", "para", "como", "esse", "essa", "está", "pode", "the", "uma", "que", "dos", "das", "nos", "nas", "com", "por", "seu", "sua"]);

function topicOf(question: string) {
  const words = question
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP.has(w));
  return words[0] ? words[0][0].toUpperCase() + words[0].slice(1) : "Revisão geral";
}

function ErrosPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateErrorReview);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: wrong } = useQuery({
    queryKey: ["wrong-answers"],
    queryFn: async () =>
      (await supabase
        .from("answers")
        .select("*")
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
        .limit(300)).data ?? [],
  });

  const { data: reviews } = useQuery({
    queryKey: ["error_reviews"],
    queryFn: async () =>
      (await supabase.from("error_reviews").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  /** Agrupa por tema, priorizando os erros mais frequentes e mais recentes. */
  const groups = useMemo(() => {
    const map = new Map<string, { topic: string; count: number; last: string; samples: string[] }>();
    for (const a of wrong ?? []) {
      const t = topicOf(a.question ?? "");
      const g = map.get(t) ?? { topic: t, count: 0, last: a.created_at, samples: [] };
      g.count++;
      if (a.created_at > g.last) g.last = a.created_at;
      if (g.samples.length < 3) g.samples.push(a.question);
      map.set(t, g);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1));
  }, [wrong]);

  const build = async (topic: string) => {
    setBusy(topic);
    try {
      const res = await gen({ data: { topic } });
      setOpenId(res.id);
      qc.invalidateQueries({ queryKey: ["error_reviews"] });
      toast.success("Revisão corretiva pronta!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao montar a revisão");
    } finally {
      setBusy(null);
    }
  };

  const open = (reviews ?? []).find((r: any) => r.id === openId) as any;
  const c = open?.content;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Consolidação dos erros</h1>
        <p className="text-muted-foreground">Seus erros de questões, provas, simulados e trilhas reunidos em um só lugar.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.topic} className="space-y-2 p-4">
            <div className="flex items-center gap-2 font-display font-semibold">
              <AlertTriangle className="h-4 w-4 text-primary" /> {g.topic}
            </div>
            <div className="text-xs text-muted-foreground">{g.count} erro(s) — último em {new Date(g.last).toLocaleDateString("pt-BR")}</div>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {g.samples.map((s, i) => <li key={i} className="line-clamp-1">{s}</li>)}
            </ul>
            <Button size="sm" onClick={() => build(g.topic)} disabled={busy === g.topic}>
              {busy === g.topic ? "Montando..." : "Revisar este erro"}
            </Button>
          </Card>
        ))}
        {!groups.length && <p className="text-sm text-muted-foreground">Nenhum erro registrado ainda — continue estudando.</p>}
      </div>

      {c && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">{c.title}</h2>
            <div className="flex flex-wrap gap-2">
              <StudyTools subject={open.topic} getText={() => [c.title, c.review, ...(c.steps ?? [])].join("\n")} />
              <NeededContentsButton topic={open.topic} />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.review}</p>
          {!!c.steps?.length && (
            <ol className="list-decimal space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 pl-8 text-sm">
              {c.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ol>
          )}
          {!!c.cards?.length && (
            <div className="grid gap-2 md:grid-cols-2">
              {c.cards.map((card: any, i: number) => (
                <Card key={i} className="bg-muted/30 p-3 text-sm">
                  <div className="font-medium">{card.front}</div>
                  <div className="mt-1 text-muted-foreground">{card.back}</div>
                </Card>
              ))}
            </div>
          )}
          <MiniQuiz
            questions={c.questions ?? []}
            onFinish={async (correct, total) => {
              if (correct === total) {
                await supabase.from("error_reviews").update({ resolved: true }).eq("id", open.id);
                qc.invalidateQueries({ queryKey: ["error_reviews"] });
                toast.success("Erro corrigido!");
              }
            }}
          />
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">Revisões salvas</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(reviews ?? []).map((r: any) => (
            <Card key={r.id} className="flex items-center justify-between gap-2 p-4">
              <button className="text-left" onClick={() => setOpenId(r.id)}>
                <div className="flex items-center gap-2 font-medium">
                  {r.resolved && <CheckCircle2 className="h-4 w-4 text-primary" />} {r.topic}
                </div>
                <div className="text-xs text-muted-foreground">{r.resolved ? "Corrigido" : "Pendente"}</div>
              </button>
              <DeleteItemButton
                label="esta revisão"
                onConfirm={async () => {
                  await supabase.from("error_reviews").delete().eq("id", r.id);
                  qc.invalidateQueries({ queryKey: ["error_reviews"] });
                  if (openId === r.id) setOpenId(null);
                }}
              />
            </Card>
          ))}
          {!reviews?.length && <p className="text-sm text-muted-foreground">Nenhuma revisão criada ainda.</p>}
        </div>
      </div>
    </div>
  );
}
