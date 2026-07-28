import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/brasoes")({
  head: () => ({ meta: [{ title: "Brasões — Urstudy" }, { name: "description", content: "Sua coleção de brasões e troféus." }] }),
  component: BrasoesPage,
});

const BRASOES = [
  { name: "Carvão", xp: 0, color: "from-gray-600 to-gray-800", emoji: "🪨" },
  { name: "Cobre", xp: 250, color: "from-orange-500 to-amber-700", emoji: "🥉" },
  { name: "Prata", xp: 500, color: "from-slate-300 to-slate-500", emoji: "🥈" },
  { name: "Ouro", xp: 1000, color: "from-yellow-400 to-yellow-600", emoji: "🥇" },
  { name: "Diamante", xp: 2000, color: "from-cyan-300 to-blue-500", emoji: "💎" },
  { name: "Platina", xp: 3500, color: "from-purple-400 to-fuchsia-600", emoji: "👑" },
  { name: "Mestre", xp: 5000, color: "from-primary to-[var(--primary-glow)]", emoji: "🏆" },
];

function BrasoesPage() {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data });
  const xp = profile?.xp ?? 0;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Award className="h-7 w-7 text-primary" /> Brasões & Troféus</h1>
      <p className="text-muted-foreground">Você tem {xp} XP.</p>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {BRASOES.map((b) => {
          const unlocked = xp >= b.xp;
          return (
            <Card key={b.name} className={`relative overflow-hidden p-6 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}>
              <div className={`mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${b.color} text-5xl ${unlocked ? "glow-pulse" : ""}`}>{b.emoji}</div>
              <div className="font-display text-lg font-bold">{b.name}</div>
              <div className="text-xs text-muted-foreground">{b.xp} XP</div>
              {unlocked && <div className="mt-1 text-xs font-semibold text-primary">Desbloqueado ✓</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
