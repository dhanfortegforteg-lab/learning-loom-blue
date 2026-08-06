import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateTrackPlan, setContentGoal } from "@/lib/tracks.functions";
import { NEEDED_YEAR } from "@/lib/related.functions";
import { goalMet, goalLabel, UNLOCK_RULES, type UnlockRule } from "@/lib/unlock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Play, Route as RouteIcon, Sparkles, Target } from "lucide-react";
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
  const [goalFor, setGoalFor] = useState<any>(null);
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

  const tracks = (data?.tracks ?? []).filter((t: any) => t.year_level !== NEEDED_YEAR);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <RouteIcon className="h-7 w-7 text-primary" /> Estudo Automático
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha seu ano letivo e a IA monta uma trilha por matéria. Cada conteúdo tem uma meta de desbloqueio
          configurável (nota mínima e/ou tentativas) — o padrão é nota 6.0.
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
                    const unlocked = i === 0 || goalMet(prev);
                    const done = goalMet(c) && Number(c.attempts ?? 0) > 0;
                    return (
                      <li key={c.id} className="flex items-center gap-2">
                        {unlocked ? (
                          <Link
                            to="/trilha/$contentId"
                            params={{ contentId: c.id }}
                            className={`flex flex-1 items-center gap-4 rounded-2xl border p-4 transition hover:shadow-[var(--shadow-glow)] ${
                              done ? "border-green-500/50 bg-green-500/5" : "border-primary/40 bg-primary/5 hover:border-primary"
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                              {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : i + 1}
                            </span>
                            <span className="flex-1">
                              <span className="block font-semibold">{c.title}</span>
                              <span className="block text-xs text-muted-foreground">{c.description}</span>
                              <span className="mt-1 block text-[11px] text-primary/80">
                                Meta: {goalLabel(c)} · {Number(c.attempts ?? 0)} tentativa(s)
                              </span>
                            </span>
                            {Number(c.score) > 0 && (
                              <span className={`text-sm font-bold ${done ? "text-green-500" : "text-amber-500"}`}>
                                {Number(c.score).toFixed(1)}
                              </span>
                            )}
                            <Play className="h-4 w-4 text-primary" />
                          </Link>
                        ) : (
                          <div className="flex flex-1 items-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-4 opacity-60">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                              <Lock className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block font-semibold">{c.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                Meta do conteúdo anterior: {goalLabel(prev)}
                              </span>
                            </span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Configurar meta de ${c.title}`}
                          onClick={() => setGoalFor(c)}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                        >
                          <Target className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        content={goalFor}
        onClose={() => setGoalFor(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["trilhas"] })}
      />
    </div>
  );
}

function GoalDialog({ content, onClose, onSaved }: { content: any; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(setContentGoal);
  const [rule, setRule] = useState<UnlockRule>("score");
  const [minScore, setMinScore] = useState("6.0");
  const [minAttempts, setMinAttempts] = useState("1");
  const [applyToTrack, setApplyToTrack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (content && loadedFor !== content.id) {
    setLoadedFor(content.id);
    setRule((content.unlock_rule ?? "score") as UnlockRule);
    setMinScore(Number(content.min_score ?? 6).toFixed(1));
    setMinAttempts(String(content.min_attempts ?? 1));
    setApplyToTrack(false);
  }

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          contentId: content.id,
          unlockRule: rule,
          minScore: Math.min(10, Math.max(0, Number(minScore) || 0)),
          minAttempts: Math.min(20, Math.max(1, Math.round(Number(minAttempts) || 1))),
          applyToTrack,
        },
      });
      toast.success(applyToTrack ? "Meta aplicada a toda a matéria" : "Meta atualizada");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar a meta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!content} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Meta de desbloqueio
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{content?.title}</p>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Regra</Label>
            <Select value={rule} onValueChange={(v) => setRule(v as UnlockRule)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNLOCK_RULES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Nota mínima</Label>
              <Input
                type="number" min={0} max={10} step={0.5}
                value={minScore}
                disabled={rule === "free" || rule === "attempts"}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Tentativas</Label>
              <Input
                type="number" min={1} max={20} step={1}
                value={minAttempts}
                disabled={rule === "free" || rule === "score"}
                onChange={(e) => setMinAttempts(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <span className="text-sm">Aplicar a todos os conteúdos desta matéria</span>
            <Switch checked={applyToTrack} onCheckedChange={setApplyToTrack} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Salvando..." : "Salvar meta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

