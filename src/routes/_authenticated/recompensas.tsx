import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getRewards, claimReward } from "@/lib/rewards.functions";
import { TROPHIES, MEDALS, RANKINGS, rankingFor, starsFor, isEarned, emptyStats, type Reward, type RewardStats } from "@/lib/rewards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Star, Gem, Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recompensas")({
  head: () => ({
    meta: [
      { title: "Recompensas — Foxstudy" },
      { name: "description", content: "Troféus, medalhas, estrelas e ranking de minérios conquistados nos seus estudos." },
      { property: "og:title", content: "Recompensas — Foxstudy" },
      { property: "og:description", content: "Conquiste troféus, medalhas, estrelas e suba no ranking de minérios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecompensasPage,
});

function RecompensasPage() {
  const fetchRewards = useServerFn(getRewards);
  const claim = useServerFn(claimReward);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["rewards"], queryFn: () => fetchRewards({}) });
  const stats: RewardStats = data?.stats ?? emptyStats;
  const claimed = new Set((data?.claims ?? []).map((c: any) => c.reward_id));

  const stars = starsFor(stats.correct, stats.wrong);
  const rank = rankingFor(stats.level);

  const onClaim = async (r: Reward) => {
    setBusy(r.id);
    try {
      const res: any = await claim({ data: { rewardId: r.id } });
      toast.success(`${r.name} resgatado! +${res.xp} XP 🎉`);
      await qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível resgatar");
    } finally {
      setBusy(null);
    }
  };

  const earnedT = TROPHIES.filter((r) => isEarned(r, stats)).length;
  const earnedM = MEDALS.filter((r) => isEarned(r, stats)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <Gift className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Recompensas</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-primary/30 p-5 shadow-[var(--shadow-glow)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-yellow-300" /> Estrelas</div>
          <div className="text-4xl font-bold">{stars}</div>
          <p className="mt-1 text-xs text-muted-foreground">+5 por acerto · −10 por erro ({stats.correct} acertos / {stats.wrong} erros)</p>
        </Card>
        <Card className="relative overflow-hidden border-primary/30 p-5 shadow-[var(--shadow-glow)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Gem className="h-4 w-4 text-primary" /> Ranking</div>
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${rank.current.color} text-3xl glow-pulse`}>{rank.current.icon}</div>
            <div>
              <div className="text-2xl font-bold">{rank.current.name}</div>
              <div className="text-xs text-muted-foreground">Nível {stats.level}{rank.next ? ` · próximo: ${rank.next.name} (nível ${rank.next.level})` : " · rank máximo"}</div>
            </div>
          </div>
        </Card>
        <Card className="border-primary/30 p-5 shadow-[var(--shadow-glow)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" /> Conquistas</div>
          <div className="text-2xl font-bold">{earnedT}/{TROPHIES.length} <span className="text-sm font-normal text-muted-foreground">troféus</span></div>
          <div className="text-2xl font-bold">{earnedM}/{MEDALS.length} <span className="text-sm font-normal text-muted-foreground">medalhas</span></div>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><Gem className="h-5 w-5 text-primary" /> Ranking de minérios</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {RANKINGS.map((r) => {
            const on = stats.level >= r.level;
            return (
              <Card key={r.name} className={`p-4 text-center ${on ? "border-primary/40 shadow-[var(--shadow-glow)]" : "opacity-40 grayscale"}`}>
                <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${r.color} text-3xl`}>{r.icon}</div>
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">Nível {r.level}</div>
              </Card>
            );
          })}
        </div>
      </section>

      <RewardGrid title="Troféus" icon={<Trophy className="h-5 w-5 text-primary" />} rewards={TROPHIES} stats={stats} claimed={claimed} busy={busy} onClaim={onClaim} />
      <RewardGrid title="Medalhas" icon={<Medal className="h-5 w-5 text-primary" />} rewards={MEDALS} stats={stats} claimed={claimed} busy={busy} onClaim={onClaim} />
    </div>
  );
}

function RewardGrid({ title, icon, rewards, stats, claimed, busy, onClaim }: {
  title: string; icon: React.ReactNode; rewards: Reward[]; stats: RewardStats;
  claimed: Set<string>; busy: string | null; onClaim: (r: Reward) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">{icon} {title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => {
          const value = r.value(stats);
          const done = value >= r.target;
          const got = claimed.has(r.id);
          const pct = Math.min(100, Math.round((value / r.target) * 100));
          return (
            <Card key={r.id} className={`relative overflow-hidden p-4 transition ${got ? "border-primary/60 shadow-[var(--shadow-glow)]" : done ? "border-primary/40" : "opacity-80"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-[var(--primary-glow)]/20 text-2xl ${got ? "glow-pulse" : done ? "" : "grayscale opacity-60"}`}>{r.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{Math.min(value, r.target).toFixed(value % 1 ? 1 : 0)}/{r.target}</span>
                    <span className="font-semibold text-primary">+{r.xp} XP</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {got ? (
                  <div className="text-center text-xs font-semibold text-primary">Resgatado ✓</div>
                ) : (
                  <Button size="sm" className="w-full" disabled={!done || busy === r.id} onClick={() => onClaim(r)}>
                    {busy === r.id ? "Resgatando..." : done ? "Resgatar recompensa" : "Bloqueado"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
