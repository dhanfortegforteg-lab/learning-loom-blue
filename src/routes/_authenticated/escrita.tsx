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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/escrita")({
  head: () => ({ meta: [{ title: "Escrita — Urstudy" }, { name: "description", content: "Avalie sua escrita com IA e acompanhe sua média." }] }),
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><PenSquare className="h-7 w-7 text-primary" /> Escrita</h1>
          <p className="text-muted-foreground">Sua escrita será avaliada e gerará média.</p>
        </div>
        <Card className="px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground">Média geral</div>
          <div className="font-display text-2xl font-bold text-primary">{avg}<span className="text-sm">/100</span></div>
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: A importância da leitura" /></div>
          <div><Label>Disciplina</Label><Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} /></div>
        </div>
        <div>
          <Label>Sua redação</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Escreva sua redação aqui..." />
          <div className="mt-1 text-xs text-muted-foreground">{text.length} caracteres</div>
        </div>
        <Button onClick={evaluate} disabled={loading} className="glow-pulse">
          <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Avaliando..." : "Avaliar com IA"}
        </Button>
      </Card>

      {result && (
        <Card className="p-6 space-y-3">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-5xl font-bold text-primary">{result.score}</div>
            <div className="text-muted-foreground">/ 100</div>
          </div>
          <p className="text-sm">{result.feedback}</p>
          {result.strengths?.length > 0 && (
            <div><div className="text-sm font-semibold text-green-500">Pontos fortes</div>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">{result.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {result.improvements?.length > 0 && (
            <div><div className="text-sm font-semibold text-orange-500">Melhorias</div>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">{result.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
        </Card>
      )}

      {writings && writings.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">Histórico</h2>
          <div className="grid gap-2">
            {writings.map((w: any) => (
              <Card key={w.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{w.subject || "Redação"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="font-display text-xl font-bold text-primary">{w.score}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
