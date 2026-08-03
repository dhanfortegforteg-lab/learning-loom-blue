import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateMaterial } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PenSquare, Sparkles } from "lucide-react";
import { DeleteAllButton, DeleteItemButton } from "@/components/DeleteControls";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/escrita")({
  head: () => ({ meta: [{ title: "Escrita — Foxstudy" }, { name: "description", content: "Avalie sua escrita com IA e acompanhe sua média." }] }),
  component: EscritaPage,
});

function EscritaPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateMaterial);
  const [subject, setSubject] = useState("");
  const [discipline, setDiscipline] = useState("Redação");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: writings } = useQuery({
    queryKey: ["writings"],
    queryFn: async () => (await supabase.from("writings").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const avg = writings?.length ? Math.round((writings.reduce((a: number, b: any) => a + Number(b.score), 0) / writings.length) * 10) / 10 : 0;

  const evaluate = async () => {
    if (!text.trim() || text.length < 100) return toast.error("Escreva pelo menos 100 caracteres");
    setLoading(true);
    try {
      const res = await gen({ data: { kind: "escrita_avaliacao", subject: subject || "Redação livre", discipline, extra: { text } } });
      setResult(res.content);
      const { data: sess } = await supabase.auth.getSession();
      await supabase.from("writings").insert({
        user_id: sess.session!.user.id,
        subject, discipline, text,
        score: Math.max(0, Math.min(100, Number(res.content.score))),
        feedback: res.content.feedback,
      });
      qc.invalidateQueries({ queryKey: ["writings"] });
      toast.success(`Nota: ${res.content.score}/100`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const delWriting = async (id: string) => {
    const { error } = await supabase.from("writings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["writings"] });
    toast.success("Redação excluída");
  };

  const delAllWritings = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("writings").delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["writings"] });
    toast.success("Histórico de redações excluído");
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const target = 300;
  const progress = Math.min(100, Math.round((words / target) * 100));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold flex items-center gap-3">
            <span className="rounded-2xl bg-gradient-primary p-2 shadow-glow"><PenSquare className="h-7 w-7 text-primary-foreground" /></span>
            <span className="text-gradient">Escrita</span>
          </h1>
          <p className="text-muted-foreground mt-1">Escreva, receba avaliação da IA e acompanhe sua evolução.</p>
        </div>
        <div className="flex gap-3">
          <Card className="glass px-5 py-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Média</div>
            <div className="font-display text-3xl font-bold text-gradient">{avg}<span className="text-sm text-muted-foreground">/100</span></div>
          </Card>
          <Card className="glass px-5 py-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Redações</div>
            <div className="font-display text-3xl font-bold text-primary">{writings?.length ?? 0}</div>
          </Card>
        </div>
      </div>

      <Card className="glass p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Assunto / Tema</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: A importância da leitura" /></div>
          <div><Label>Disciplina</Label><Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} /></div>
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <Label>Sua redação</Label>
            <div className="text-xs text-muted-foreground">{words} palavras · {text.length} caracteres</div>
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder="Comece pela introdução, apresente sua tese e desenvolva os argumentos..." className="resize-y" />
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Meta sugerida: {target} palavras ({progress}%)</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">💡 Tenha uma tese clara</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">🧩 Use conectivos</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">✅ Conclua com proposta</span>
        </div>
        <Button onClick={evaluate} disabled={loading} size="lg" className="glow-pulse bg-gradient-primary text-primary-foreground">
          <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Avaliando com IA..." : "Avaliar com IA"}
        </Button>
      </Card>

      {result && (
        <Card className="glass p-6 space-y-4">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-6xl font-bold text-gradient">{result.score}</div>
            <div className="text-muted-foreground">/ 100</div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-primary" style={{ width: `${Math.max(0, Math.min(100, Number(result.score)))}%` }} />
          </div>
          <p className="text-sm leading-relaxed">{result.feedback}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {result.strengths?.length > 0 && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="mb-2 text-sm font-semibold text-green-500">✨ Pontos fortes</div>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">{result.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="mb-2 text-sm font-semibold text-orange-500">🎯 Melhorias</div>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">{result.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {writings && writings.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Histórico</h2>
            <DeleteAllButton label="redações salvas" count={writings.length} onConfirm={delAllWritings} />
          </div>
          <div className="grid gap-2">
            {writings.map((w: any) => (
              <Card key={w.id} className="glass flex items-center justify-between p-4 transition hover:shadow-glow">
                <div>
                  <div className="font-medium">{w.subject || "Redação"}</div>
                  <div className="text-xs text-muted-foreground">{w.discipline} · {new Date(w.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-display text-2xl font-bold text-gradient">{w.score}</div>
                  <DeleteItemButton label="esta redação" onConfirm={() => delWriting(w.id)} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
