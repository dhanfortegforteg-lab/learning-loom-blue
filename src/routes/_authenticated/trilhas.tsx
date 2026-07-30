import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateTrackPlan } from "@/lib/tracks.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Play, Route as RouteIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trilhas")({
  head: () => ({
    meta: [
      { title: "Estudo Automático — Foxstudy" },
      { name: "description", content: "Trilhas de estudo geradas por IA para todo o seu ano letivo." },
      { property: "og:title", content: "Estudo Automático — Foxstudy" },
      { property: "og:description", content: "Trilhas de estudo geradas por IA para todo o seu ano letivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrilhasPage,
});

const YEARS = [
  "1º ano — Fundamental I", "2º ano — Fundamental I", "3º ano — Fundamental I", "4º ano — Fundamental I", "5º ano — Fundamental I",
  "6º ano — Fundamental II", "7º ano — Fundamental II", "8º ano — Fundamental II", "9º ano — Fundamental II",
  "1ª série — Ensino Médio", "2ª série — Ensino Médio", "3ª série — Ensino Médio",
];

function TrilhasPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const plan = useServerFn(generateTrackPlan);

  const { data } = useQuery({
    queryKey: ["trilhas"],
    queryFn: async () => {
      const { data: tracks } = await supabase.from("study_tracks").select("*").order("position");
      const { data: contents } = await supabase.from("track_contents").select("*").order("position");
      return { tracks: tracks ?? [], contents: contents ?? [] };
    },
  });

  const generate = async () => {
    if (!year) return toast.error("Escolha seu ano letivo");
    setLoading(true);
    try {
      const res = await plan({ data: { yearLevel: year } });
      toast.success(`${res.subjects} matérias criadas!`);
      qc.invalidateQueries({ queryKey: ["trilhas"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar a grade");
    } finally {
      setLoading(false);
    }
  };

  const tracks = data?.tracks ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <RouteIcon className="h-7 w-7 text-primary" /> Estudo Automático
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha seu ano letivo e a IA monta uma trilha por matéria. Cada conteúdo só libera o próximo com nota acima de 6.0.
        </p>
      </div>

      <Card className="glass border-primary/30 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Ano letivo</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Selecione seu ano" /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={loading} size="lg" className="glow-pulse gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? "Montando grade..." : "Gerar trilhas do ano"}
          </Button>
        </div>
      </Card>

      {tracks.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma trilha ainda — gere a grade do seu ano letivo.</Card>
      ) : (
        <div className="space-y-6">
          {tracks.map((t: any) => {
            const items = (data?.contents ?? []).filter((c: any) => c.track_id === t.id);
            return (
              <Card key={t.id} className="glass p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">{t.subject}</h2>
                  <span className="text-xs text-muted-foreground">
                    {items.filter((i: any) => i.completed).length}/{items.length} concluídos
                  </span>
                </div>
                <ol className="space-y-2">
                  {items.map((c: any, i: number) => {
                    const prev = items[i - 1];
                    const unlocked = i === 0 || Number(prev?.score ?? 0) >= 6;
                    const done = c.completed;
                    return (
                      <li key={c.id}>
                        {unlocked ? (
                          <Link
                            to="/trilha/$contentId"
                            params={{ contentId: c.id }}
                            className={`flex items-center gap-4 rounded-2xl border p-4 transition hover:shadow-[var(--shadow-glow)] ${
                              done ? "border-green-500/50 bg-green-500/5" : "border-primary/40 bg-primary/5 hover:border-primary"
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                              {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : i + 1}
                            </span>
                            <span className="flex-1">
                              <span className="block font-semibold">{c.title}</span>
                              <span className="block text-xs text-muted-foreground">{c.description}</span>
                            </span>
                            {Number(c.score) > 0 && (
                              <span className={`text-sm font-bold ${done ? "text-green-500" : "text-amber-500"}`}>
                                {Number(c.score).toFixed(1)}
                              </span>
                            )}
                            <Play className="h-4 w-4 text-primary" />
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-4 opacity-60">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                              <Lock className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block font-semibold">{c.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                Conclua o conteúdo anterior com nota acima de 6.0
                              </span>
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
