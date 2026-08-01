import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoxMascot, type FoxMood } from "@/components/FoxMascot";
import { Plus, Trash2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtividade")({
  head: () => ({
    meta: [
      { title: "Fox Productivity — Foxstudy" },
      { name: "description", content: "Conclua 5 tarefas por dia e deixe a raposinha feliz para ganhar 20 XP." },
      { property: "og:title", content: "Fox Productivity — Foxstudy" },
      { property: "og:description", content: "Sistema de produtividade com a raposinha Foxstudy: 5 tarefas por dia, 20 XP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProdutividadePage,
});

type Task = { id: string; title: string; done: boolean };

const SUGESTOES = [
  "Estudar 25 minutos com o cronômetro",
  "Fazer 10 questões",
  "Revisar flashcards do dia",
  "Ler um resumo novo",
  "Corrigir os erros da última prática",
];

type FoxState = {
  mood: FoxMood;
  label: string;
  desc: string;
  vitality: number;
  fx: string;
  aura: string;
};

const STATES: FoxState[] = [
  {
    mood: "dead",
    label: "Exausta",
    desc: "A raposinha desmaiou de cansaço. Conclua a primeira tarefa para revivê-la.",
    vitality: 0,
    fx: "grayscale-[0.85] brightness-[0.6] saturate-50 scale-95",
    aura: "oklch(0.55 0.02 260 / 0.35)",
  },
  {
    mood: "dead",
    label: "Respirando",
    desc: "Um sinal de vida! Ela abriu um olhinho — continue assim.",
    vitality: 20,
    fx: "grayscale-[0.5] brightness-75 saturate-75 scale-[0.97]",
    aura: "oklch(0.6 0.1 265 / 0.45)",
  },
  {
    mood: "tired",
    label: "Fraquinha",
    desc: "Ela conseguiu sentar, mas ainda está bem molinha.",
    vitality: 40,
    fx: "grayscale-[0.25] brightness-90 saturate-90",
    aura: "oklch(0.65 0.16 258 / 0.5)",
  },
  {
    mood: "tired",
    label: "Cansada",
    desc: "Está se recuperando de verdade agora. Não pare!",
    vitality: 60,
    fx: "brightness-100 saturate-100",
    aura: "oklch(0.7 0.2 255 / 0.55)",
  },
  {
    mood: "neutral",
    label: "Neutra",
    desc: "Quase lá — falta 1 tarefa para ela ficar radiante.",
    vitality: 80,
    fx: "brightness-105 saturate-110 scale-[1.03]",
    aura: "oklch(0.75 0.22 252 / 0.65)",
  },
  {
    mood: "happy",
    label: "Feliz",
    desc: "A raposinha está radiante! Você completou o dia 🎉",
    vitality: 100,
    fx: "brightness-110 saturate-125 scale-105",
    aura: "oklch(0.8 0.26 250 / 0.85)",
  },
];

function moodFor(done: number): FoxState {
  return STATES[Math.min(done, 5)];
}

const today = () => new Date().toISOString().slice(0, 10);

function ProdutividadePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [rewarded, setRewarded] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("fox_tasks").select("id,title,done").eq("day", today()).order("created_at"),
      supabase.from("fox_rewards").select("id").eq("day", today()).maybeSingle(),
    ]);
    setTasks((t as Task[]) ?? []);
    setRewarded(!!r);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const done = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const state = moodFor(done);
  const progress = Math.min(100, (done / 5) * 100);

  useEffect(() => {
    if (loading || rewarded || done < 5) return;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase.from("fox_rewards").insert({ user_id: u.user.id, day: today() });
      if (error) return;
      const { data: p } = await supabase.from("profiles").select("xp").eq("id", u.user.id).single();
      await supabase.from("profiles").update({ xp: (p?.xp ?? 0) + 20 }).eq("id", u.user.id);
      setRewarded(true);
      toast.success("Raposinha feliz! +20 XP 🦊");
    })();
  }, [done, rewarded, loading]);

  const add = async (value?: string) => {
    const text = (value ?? title).trim();
    if (!text) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("fox_tasks")
      .insert({ user_id: u.user.id, title: text, day: today() })
      .select("id,title,done")
      .single();
    if (error) return toast.error(error.message);
    setTasks((prev) => [...prev, data as Task]);
    setTitle("");
  };

  const toggle = async (t: Task) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from("fox_tasks").update({ done: !t.done }).eq("id", t.id);
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("fox_tasks").delete().eq("id", id);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold flex items-center gap-3">
          <span className="rounded-2xl bg-gradient-primary p-2 shadow-glow"><Sparkles className="h-7 w-7 text-primary-foreground" /></span>
          <span className="text-gradient">Fox Productivity</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Conclua 5 tarefas no dia e deixe a raposinha da produtividade feliz — vale 20 XP.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card className="glass relative overflow-hidden p-6 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-70" />
          <div className="relative">
            <div
              className="mx-auto flex h-48 w-48 items-center justify-center rounded-full transition-all duration-700"
              style={{ boxShadow: `0 0 70px -10px ${state.aura}` }}
            >
              <FoxMascot
                mood={state.mood}
                className={`h-44 w-44 transition-all duration-700 ${state.fx} ${done >= 5 ? "animate-[glow-pulse_3s_ease-in-out_infinite] rounded-full" : ""}`}
              />
            </div>
            <div className="mt-3 font-display text-2xl font-bold text-gradient">{state.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">{state.desc}</p>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-2.5 w-6 rounded-full transition-all duration-500 ${i < done ? "bg-gradient-primary shadow-glow" : "bg-muted"}`}
                />
              ))}
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {done} de 5 tarefas · vitalidade {state.vitality}%
            </div>

            {rewarded && <div className="mt-3 inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">+20 XP recebidos hoje ✨</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="glass p-5">
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
                placeholder="Nova tarefa personalizada..."
              />
              <Button onClick={() => void add()} className="bg-gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => void add(s)} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20">
                  + {s}
                </button>
              ))}
            </div>
          </Card>

          <Card className="glass divide-y divide-border/50 p-2">
            {tasks.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa hoje. Adicione a primeira 🦊</div>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <button
                  onClick={() => void toggle(t)}
                  aria-label={t.done ? "Desmarcar tarefa" : "Concluir tarefa"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${t.done ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border hover:border-primary"}`}
                >
                  {t.done && <Check className="h-4 w-4" />}
                </button>
                <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                <button onClick={() => void remove(t.id)} className="text-muted-foreground transition hover:text-destructive" aria-label="Excluir tarefa">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
