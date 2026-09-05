import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomPlan } from "@/lib/extras.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeleteItemButton, DeleteAllButton } from "@/components/DeleteControls";
import { StudyTools } from "@/components/StudyTools";
import { NeededContentsButton } from "@/components/NeededContentsButton";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plano")({
  head: () => ({
    meta: [
      { title: "Plano de Estudos Próprio — Foxstudy" },
      { name: "description", content: "Peça um material 100% personalizado e estude do seu jeito." },
      { property: "og:title", content: "Plano de Estudos Próprio — Foxstudy" },
      { property: "og:description", content: "Materiais criados sob medida a partir do seu pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanoPage,
});

function PlanoPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateCustomPlan);
  const [subject, setSubject] = useState("");
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["custom_plans"],
    queryFn: async () =>
      (await supabase.from("custom_plans").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const run = async (req = request, subj = subject) => {
    if (!subj.trim() || !req.trim()) return toast.error("Escreva o assunto e o pedido");
    setBusy(true);
    try {
      const res = await gen({ data: { subject: subj.trim(), request: req.trim() } });
      setOpenId(res.id);
      qc.invalidateQueries({ queryKey: ["custom_plans"] });
      toast.success("Material personalizado pronto!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar o material");
    } finally {
      setBusy(false);
    }
  };

  const open = plans?.find((p: any) => p.id === openId) as any;
  const c = open?.content ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Plano de estudos próprio</h1>
        <p className="text-muted-foreground">Peça do seu jeito — o material é montado na hora e salvo no histórico.</p>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <Label>Assunto</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Revolução Francesa" />
        </div>
        <div>
          <Label>O que você quer que o material tenha?</Label>
          <Textarea
            rows={4}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Ex: quero um material com explicações curtas, exemplos do dia a dia e 5 questões no final."
          />
        </div>
        <Button onClick={() => run()} disabled={busy}>
          <Wand2 className="mr-2 h-4 w-4" /> {busy ? "Criando..." : "Criar material"}
        </Button>
      </Card>

      {c && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">{c.title}</h2>
            <div className="flex flex-wrap gap-2">
              <StudyTools
                subject={open.subject}
                getText={() =>
                  [c.title, c.intro, ...(c.sections ?? []).map((s: any) => `${s.title}. ${s.body}`)].join("\n")
                }
              />
              <NeededContentsButton topic={open.subject} />
            </div>
          </div>
          <p className="text-muted-foreground">{c.intro}</p>
          {(c.sections ?? []).map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="font-display font-semibold text-primary">{s.title}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
              {s.example && <p className="mt-2 text-sm italic text-muted-foreground">Exemplo: {s.example}</p>}
            </div>
          ))}
          {!!c.keywords?.length && (
            <div className="flex flex-wrap gap-2">
              {c.keywords.map((k: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">{k}</span>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Histórico</h2>
          {!!plans?.length && (
            <DeleteAllButton
              label="Excluir todos"
              onDelete={async () => {
                await supabase.from("custom_plans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                qc.invalidateQueries({ queryKey: ["custom_plans"] });
                setOpenId(null);
              }}
            />
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(plans ?? []).map((p: any) => (
            <Card key={p.id} className="flex items-start justify-between gap-3 p-4">
              <button className="text-left" onClick={() => setOpenId(p.id)}>
                <div className="font-medium">{p.title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{p.request}</div>
              </button>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => run(p.request, p.subject ?? p.title)} disabled={busy}>
                  Recriar
                </Button>
                <DeleteItemButton
                  onDelete={async () => {
                    await supabase.from("custom_plans").delete().eq("id", p.id);
                    qc.invalidateQueries({ queryKey: ["custom_plans"] });
                    if (openId === p.id) setOpenId(null);
                  }}
                />
              </div>
            </Card>
          ))}
          {!plans?.length && <p className="text-sm text-muted-foreground">Nenhum material personalizado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
