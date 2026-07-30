import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Check } from "lucide-react";
import { timerStore, useTimer, elapsedSeconds } from "@/lib/timer-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({ meta: [{ title: "Cronograma — Foxstudy" }, { name: "description", content: "Cronômetro de estudos persistente com ganho de XP." }] }),
  component: CronogramaPage,
});

const DISCIPLINES = ["Matemática", "Português", "Redação", "História", "Geografia", "Biologia", "Química", "Física", "Inglês", "Programação", "Outra"];

function CronogramaPage() {
  const s = useTimer();
  const [, tick] = useState(0);
  useEffect(() => { if (!s.running) return; const i = setInterval(() => tick((t) => t + 1), 500); return () => clearInterval(i); }, [s.running]);

  const totalSec = elapsedSeconds(s);
  const targetSec = s.goalMinutes * 60;
  const pct = Math.min(1, totalSec / targetSec);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  const confirm = async () => {
    const min = Math.max(1, Math.round(totalSec / 60));
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return;
    const uid = sess.session.user.id;
    await supabase.from("study_sessions").insert({ user_id: uid, discipline: s.discipline || null, minutes: min });
    // XP + streak
    const xpGain = min * 2;
    const { data: prof } = await supabase.from("profiles").select("*").maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const last = prof?.last_study_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = last === today ? (prof?.streak_days ?? 1) : last === yesterday ? (prof?.streak_days ?? 0) + 1 : 1;
    await supabase.from("profiles").update({
      xp: (prof?.xp ?? 0) + xpGain,
      streak_days: newStreak,
      last_study_date: today,
    }).eq("id", uid);
    timerStore.reset();
    toast.success(`+${xpGain} XP! Estudou ${min} min 🎉`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">⏱ Cronograma de Estudos</h1>
        <p className="text-muted-foreground">O cronômetro continua rodando mesmo se você trocar de aba.</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Disciplina</Label>
            <Select value={s.discipline} onValueChange={timerStore.setDiscipline} disabled={s.running}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Meta (min)</Label>
            <Input type="number" min={1} value={s.goalMinutes} onChange={(e) => timerStore.setGoal(Number(e.target.value) || 25)} disabled={s.running} />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="relative h-64 w-64">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="45" strokeWidth="6" fill="none" className="stroke-muted" />
              <circle cx="50" cy="50" r="45" strokeWidth="6" fill="none" className="stroke-primary transition-all"
                strokeDasharray={`${pct * 283} 283`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-5xl font-bold tabular-nums">{mm}:{ss}</div>
              <div className="text-xs text-muted-foreground">/ {s.goalMinutes} min</div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {!s.running && totalSec === 0 && (
              <Button size="lg" onClick={() => timerStore.start(s.goalMinutes, s.discipline)}><Play className="mr-2 h-4 w-4" />Iniciar</Button>
            )}
            {s.running && <Button size="lg" variant="secondary" onClick={timerStore.pause}><Pause className="mr-2 h-4 w-4" />Pausar</Button>}
            {!s.running && totalSec > 0 && <Button size="lg" onClick={timerStore.resume}><Play className="mr-2 h-4 w-4" />Retomar</Button>}
            {totalSec > 0 && (
              <>
                <Button size="lg" variant="outline" onClick={timerStore.reset}><RotateCcw className="mr-2 h-4 w-4" />Zerar</Button>
                <Button size="lg" onClick={confirm} className="glow-pulse"><Check className="mr-2 h-4 w-4" />Concluir</Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
