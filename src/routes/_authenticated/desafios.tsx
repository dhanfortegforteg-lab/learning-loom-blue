import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Trophy, Timer, PenSquare, ListChecks, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/desafios")({
  head: () => ({ meta: [{ title: "Desafios — Urstudy" }, { name: "description", content: "Complete os desafios diários e ganhe XP." }] }),
  component: DesafiosPage,
});

function DesafiosPage() {
  const { data } = useQuery({
    queryKey: ["desafios-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: sessions }, { data: writings }, { data: answers }, { data: mats }] = await Promise.all([
        supabase.from("study_sessions").select("minutes, created_at").gte("created_at", today),
        supabase.from("writings").select("score, created_at").gte("created_at", today),
        supabase.from("answers").select("id, created_at").gte("created_at", today),
        supabase.from("materials").select("id, created_at").gte("created_at", today),
      ]);
      return {
        min: (sessions ?? []).reduce((a, b: any) => a + b.minutes, 0),
        writingsAvg: writings?.length ? writings.reduce((a, b: any) => a + Number(b.score), 0) / writings.length : 0,
        answers: (answers ?? []).length,
        mats: (mats ?? []).length,
      };
    },
  });

  const items = [
    { icon: Timer, title: "Estude 30 min no cronograma", progress: Math.min(30, data?.min ?? 0), goal: 30, xp: 40, link: "/cronograma" as const },
    { icon: PenSquare, title: "Alcance média de 60 em escrita hoje", progress: Math.min(60, Math.round(data?.writingsAvg ?? 0)), goal: 60, xp: 50, link: "/escrita" as const },
    { icon: ListChecks, title: "Responda 5 questões", progress: Math.min(5, data?.answers ?? 0), goal: 5, xp: 30, link: "/estudar" as const },
    { icon: BookOpen, title: "Gere 1 material novo", progress: Math.min(1, data?.mats ?? 0), goal: 1, xp: 20, link: "/estudar" as const },
  ];
  const done = items.filter((i) => i.progress >= i.goal).length;
  const totalXp = items.filter((i) => i.progress >= i.goal).reduce((a, b) => a + b.xp, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" /> Desafios Diários</h1>
        <p className="text-muted-foreground">Complete os 4 desafios do dia para ganhar XP!</p>
      </div>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">Desafios de Hoje 📋</span>
          <span className="text-muted-foreground">{done}/4 ✅ · +{totalXp} XP ⚡</span>
        </div>
        <div className="space-y-3">
          {items.map((i, idx) => {
            const pct = (i.progress / i.goal) * 100;
            const complete = i.progress >= i.goal;
            return (
              <Link key={idx} to={i.link} className="block rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${complete ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <i.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{i.progress}/{i.goal} · ⚡ +{i.xp} XP</div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
