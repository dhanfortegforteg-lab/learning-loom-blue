import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { suggestKeywords } from "@/lib/extras.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudyTools } from "@/components/StudyTools";
import { DeleteItemButton } from "@/components/DeleteControls";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/palavras-chave")({
  head: () => ({
    meta: [
      { title: "Palavras-chave — Foxstudy" },
      { name: "description", content: "Descubra e guarde as palavras-chave essenciais de cada assunto." },
      { property: "og:title", content: "Palavras-chave — Foxstudy" },
      { property: "og:description", content: "Listas de termos essenciais com significado, salvas por assunto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KeywordsPage,
});

function KeywordsPage() {
  const qc = useQueryClient();
  const gen = useServerFn(suggestKeywords);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: sets } = useQuery({
    queryKey: ["keyword_sets"],
    queryFn: async () =>
      (await supabase.from("keyword_sets").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const run = async () => {
    if (!subject.trim()) return toast.error("Digite o assunto");
    setBusy(true);
    try {
      const res = await gen({ data: { subject: subject.trim() } });
      const { data: user } = await supabase.auth.getUser();
      await supabase.from("keyword_sets").insert({
        user_id: user.user?.id ?? "",
        subject: subject.trim(),
        words: res.words as any,
      });
      qc.invalidateQueries({ queryKey: ["keyword_sets"] });
      toast.success("Palavras-chave salvas!");
      setSubject("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao buscar as palavras-chave");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Palavras-chave</h1>
        <p className="text-muted-foreground">Os termos que mais caem em cada assunto, com o significado de cada um.</p>
      </div>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label>Assunto</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Segunda Guerra Mundial" />
        </div>
        <Button onClick={run} disabled={busy}>
          <KeyRound className="mr-2 h-4 w-4" /> {busy ? "Buscando..." : "Gerar palavras-chave"}
        </Button>
      </Card>

      <div className="space-y-4">
        {(sets ?? []).map((s: any) => {
          const words = (s.words ?? []) as { term: string; definition: string }[];
          return (
            <Card key={s.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold">{s.subject}</h2>
                <div className="flex items-center gap-2">
                  <StudyTools
                    subject={s.subject}
                    getText={() => words.map((w) => `${w.term}: ${w.definition}`).join(". ")}
                  />
                  <DeleteItemButton
                    label="esta lista"
                    onConfirm={async () => {
                      await supabase.from("keyword_sets").delete().eq("id", s.id);
                      qc.invalidateQueries({ queryKey: ["keyword_sets"] });
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {words.map((w, i) => (
                  <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <span className="font-medium text-primary">{w.term}</span> — {w.definition}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {!sets?.length && <p className="text-sm text-muted-foreground">Nenhuma lista salva ainda.</p>}
      </div>
    </div>
  );
}
