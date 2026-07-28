import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AnimatedBlobs } from "@/components/AnimatedBlobs";
import { WolfMascot } from "@/components/WolfMascot";
import { Sparkles, BookOpen, Trophy, Timer, Brain, PenSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Urstudy — Estudar ficou divertido" },
      { name: "description", content: "Gere apostilas, flashcards, mapas mentais, provas e simulados com IA. Ganhe XP, mantenha ofensiva e evolua todo dia." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSigned(!!data.session));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AnimatedBlobs />
      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <div className="flex items-center gap-3">
            <WolfMascot className="h-10 w-10" />
            <div>
              <div className="font-display text-xl font-bold">Urstudy</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ecossistema de estudos</div>
            </div>
          </div>
          <div className="flex gap-2">
            {signed ? (
              <Button asChild><Link to="/home">Entrar no app</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link></Button>
              </>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center md:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> IA generativa para todos os materiais
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
            Estudar ficou <span className="shimmer-text">divertido</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Apostila, flashcards, mapa mental, quiz, prova, simulado, escrita e muito mais — tudo gerado por IA,
            gamificado com XP, brasões e ofensiva diária.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild className="glow-pulse">
              <Link to={signed ? "/home" : "/auth"}>Começar agora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#recursos">Ver recursos</a>
            </Button>
          </div>

          <div id="recursos" className="mt-24 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: BookOpen, label: "Apostila" },
              { icon: Brain, label: "Mapa mental" },
              { icon: Sparkles, label: "Flashcards" },
              { icon: Timer, label: "Cronograma" },
              { icon: PenSquare, label: "Escrita" },
              { icon: Trophy, label: "Simulado" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
                <f.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <div className="text-sm font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
