import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createLateStudy } from "@/lib/late.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { DeleteItemButton, DeleteAllButton } from "@/components/DeleteControls";
import { History, Brain, GraduationCap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atrasado")({
  head: () => ({
    meta: [
      { title: "Estudo Atrasado — Foxstudy" },
      { name: "description", content: "Recupere conteúdos que ficaram para trás com estudo completo ou revisão de 7 dias." },
      { property: "og:title", content: "Estudo Atrasado — Foxstudy" },
      { property: "og:description", content: "Recupere conteúdos que ficaram para trás com estudo completo ou revisão de 7 dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtrasadoPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Página não encontrada.</div>,
});

function AtrasadoPage() {
  const navigate = useNavigate();
  const create = useServerFn(createLateStudy);
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [recall, setRecall] = useState(50);
  const [busy, setBusy] = useState(false);

  const { data: list, refetch } = useQuery({
    queryKey: ["late-studies"],
    queryFn: async () =>
      (await supabase.from("late_studies").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const start = async () => {
    if (content.trim().length < 2) return toast.error("Escreva o conteúdo que precisa recuperar");
    setBusy(true);
    try {
      const row = await create({ data: { content: content.trim(), subject: subject.trim() || undefined, recallPct: recall } });
      navigate({ to: "/atrasado/$lateId", params: { lateId: row.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao criar o estudo atrasado");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("late_studies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
    toast.success("Estudo atrasado excluído");
  };

  const delAll = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("late_studies").delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    refetch();
    toast.success("Tudo excluído");
  };

  const mode = recall >= 75 ? "revisao" : "estudo";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient">Estudo Atrasado</h1>
          <p className="text-sm text-muted-foreground">Recupere o que ficou para trás — no seu ritmo, sem bloqueio.</p>
        </div>
      </header>

      <Card className="glass space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>1 · Conteúdo</Label>
            <Input
              value={content}
              maxLength={160}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Equações do 2º grau"
            />
          </div>
          <div className="space-y-2">
            <Label>Matéria (opcional)</Label>
            <Input value={subject} maxLength={80} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Matemática" />
          </div>
        </div>

        <div className="space-y-3">
          <Label>2 · Porcentagem de lembrança: <span className="text-primary">{recall}%</span></Label>
          <Slider value={[recall]} min={0} max={100} step={1} onValueChange={(v) => setRecall(v[0] ?? 0)} />
          <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
            {mode === "estudo" ? <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
            {mode === "estudo" ? (
              <span>
                <b>3 · Estudo completo</b> — abaixo de 75% a IA monta apostila (simples + completa + teorias), resumo,
                prática com 5 questões, questões com texto guia e prova com redação (até 35) + 15 questões ou mais. Média mínima 7.0.
              </span>
            ) : (
              <span>
                <b>4 · Revisão + mini estudo + mini prática</b> — acima de 75% a IA monta apostila, explicação informal e
                prática com 10 questões, mais 7 dias de revisão com flashcards, mini textos, escrita, palavras-chave e mini simulados.
              </span>
            )}
          </div>
        </div>

        <Button size="lg" className="w-full glow-pulse" disabled={busy} onClick={start}>
          {busy ? "Criando..." : "Começar recuperação"}
        </Button>
      </Card>

      {!!list?.length && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Meus estudos atrasados</h2>
            <DeleteAllButton onConfirm={delAll} label="Excluir tudo" />
          </div>
          {list.map((r: any) => (
            <Card key={r.id} className="flex items-center gap-4 p-4">
              <Brain className="h-6 w-6 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <Link to="/atrasado/$lateId" params={{ lateId: r.id }} className="font-semibold hover:text-primary">
                  {r.content}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {r.subject ? `${r.subject} · ` : ""}lembrança {r.recall_pct}% ·{" "}
                  {r.mode === "estudo" ? "estudo completo" : "revisão de 7 dias"} · nota {Number(r.score).toFixed(1)}
                  {Number(r.score) >= 7 ? " ✅" : " (mín. 7.0)"}
                </div>
                <Progress value={r.percent} className="mt-2 h-2" />
              </div>
              <span className="text-sm font-bold text-primary">{r.percent}%</span>
              <DeleteItemButton onConfirm={() => del(r.id)} />
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
