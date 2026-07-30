import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FoxMascot } from "@/components/FoxMascot";
import { BookOpen, Target, Zap, Flame, Trophy, PenSquare, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Foxstudy" }, { name: "description", content: "Painel do aluno com XP, ofensiva, materiais e desempenho." }] }),
  component: HomePage,
});

function levelFromXp(xp: number) {
  const level = Math.floor(xp / 250) + 1;
  const brasoes = ["Carvão", "Cobre", "Prata", "Ouro", "Diamante", "Platina", "Mestre"];
  const brasao = brasoes[Math.min(level - 1, brasoes.length - 1)];
  const next = level * 250;
  return { level, brasao, next, progress: (xp % 250) / 250 };
}

function HomePage() {
  const { data } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [{ data: profile }, { data: mats }, { data: sessions }, { data: writings }, { data: scores }, { data: answers }] = await Promise.all([
        supabase.from("profiles").select("*").maybeSingle(),
        supabase.from("materials").select("id, kind, subject, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("study_sessions").select("minutes"),
        supabase.from("writings").select("score"),
        supabase.from("exam_scores").select("score, max_score, kind"),
        supabase.from("answers").select("is_correct"),
      ]);
      return { profile, mats: mats ?? [], sessions: sessions ?? [], writings: writings ?? [], scores: scores ?? [], answers: answers ?? [] };
    },
  });

  const profile = data?.profile ?? { display_name: "Estudante", xp: 0, streak_days: 0 };
  const lvl = levelFromXp(profile.xp ?? 0);
  const totalMin = (data?.sessions ?? []).reduce((a, b: any) => a + (b.minutes ?? 0), 0);
  const totalAns = (data?.answers ?? []).length;
  const correct = (data?.answers ?? []).filter((a: any) => a.is_correct).length;
  const acc = totalAns ? Math.round((correct / totalAns) * 100) : 0;
  const writingAvg = data?.writings?.length ? Math.round((data.writings.reduce((a: number, b: any) => a + Number(b.score), 0) / data.writings.length) * 10) / 10 : 0;
  const simulados = (data?.scores ?? []).filter((s: any) => s.kind === "simulado");
  const simAvg = simulados.length ? Math.round((simulados.reduce((a: number, b: any) => a + Number(b.score), 0) / simulados.length)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FoxMascot className="h-14 w-14" />
          <div>
            <h1 className="font-display text-3xl font-bold">Olá, {profile.display_name} 👋</h1>
            <p className="text-muted-foreground">Vamos estudar hoje? 🚀</p>
          </div>
        </div>
        <Button asChild size="lg" className="glow-pulse"><Link to="/estudar"><BookOpen className="mr-2 h-4 w-4" />Começar</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-primary" /> Nível {lvl.level}</div>
          <div className="text-3xl font-bold">{profile.xp ?? 0} <span className="text-sm text-muted-foreground">XP</span></div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)]" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">🏅 {lvl.brasao}</span>
            <span>Próximo: {lvl.next} XP</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-400" /> Ofensiva</div>
          <div className="text-3xl font-bold">{profile.streak_days ?? 0} <span className="text-sm text-muted-foreground">dias</span></div>
          <p className="mt-2 text-xs text-muted-foreground">{(profile.streak_days ?? 0) > 0 ? "Continue assim! 🔥" : "Estude hoje para começar!"}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Materiais gerados" value={data?.mats.length ?? 0} />
        <Stat icon={<Target className="h-4 w-4" />} label="Questões respondidas" value={totalAns} />
        <Stat icon={<Zap className="h-4 w-4" />} label="Acertos" value={`${correct} (${acc}%)`} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Tempo de estudo" value={`${totalMin} min`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" /> Média de escrita</div>
          <div className="text-3xl font-bold">{writingAvg}<span className="text-sm text-muted-foreground">/100</span></div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><PenSquare className="h-4 w-4 text-primary" /> Média simulado</div>
          <div className="text-3xl font-bold">{simAvg}<span className="text-sm text-muted-foreground">/500</span></div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" /> Brasão</div>
          <div className="text-3xl font-bold">{lvl.brasao}</div>
          <Link to="/brasoes" className="mt-1 text-xs text-primary hover:underline">Ver coleção →</Link>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Últimos materiais</h2>
          <Link to="/biblioteca" className="text-xs text-primary hover:underline">Ver todos →</Link>
        </div>
        {data?.mats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum material ainda. <Link to="/estudar" className="text-primary hover:underline">Gerar o primeiro</Link>.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data?.mats.map((m: any) => (
              <Link key={m.id} to="/material/$id" params={{ id: m.id }} className="rounded-xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
                <div className="text-[10px] uppercase tracking-widest text-primary">{m.kind}</div>
                <div className="mt-1 font-semibold">{m.subject}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
