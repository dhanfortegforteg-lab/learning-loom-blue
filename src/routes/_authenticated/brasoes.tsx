import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/brasoes")({
  head: () => ({ meta: [{ title: "Brasões — Foxstudy" }, { name: "description", content: "Sua coleção de brasões e troféus." }] }),
  component: BrasoesPage,
});

const BRASOES = [
  { name: "Carvão", xp: 0, color: "from-zinc-700 to-zinc-950", emoji: "⚫" },
  { name: "Ferro", xp: 150, color: "from-slate-300 to-slate-600", emoji: "🔩" },
  { name: "Cobre", xp: 250, color: "from-orange-400 to-amber-700", emoji: "🟠" },
  { name: "Bronze", xp: 400, color: "from-amber-500 to-orange-800", emoji: "🟤" },
  { name: "Prata", xp: 500, color: "from-slate-100 to-slate-400", emoji: "⚪" },
  { name: "Ouro", xp: 1000, color: "from-yellow-300 to-yellow-600", emoji: "🟡" },
  { name: "Esmeralda", xp: 1500, color: "from-emerald-300 to-emerald-600", emoji: "🟢" },
  { name: "Safira", xp: 1750, color: "from-sky-300 to-blue-600", emoji: "🔵" },
  { name: "Rubi", xp: 1900, color: "from-rose-400 to-red-700", emoji: "🔴" },
  { name: "Diamante", xp: 2000, color: "from-cyan-200 to-cyan-500", emoji: "💠" },
  { name: "Ametista", xp: 2750, color: "from-violet-400 to-purple-700", emoji: "🟣" },
  { name: "Platina", xp: 3500, color: "from-slate-200 to-indigo-400", emoji: "🏅" },
  { name: "Obsidiana", xp: 4200, color: "from-neutral-800 to-black", emoji: "⬛" },
  { name: "Netherita", xp: 4600, color: "from-fuchsia-600 to-purple-950", emoji: "🟪" },
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
