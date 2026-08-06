import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  Home, BookOpen, Library, Timer, Trophy, Calendar, PenSquare,
  HelpCircle, NotebookPen, Award, LogOut, Search, Moon, Sun, User, Sparkles, Route as RouteIcon, ClipboardCheck, Gift, Layers, History, Network,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBlobs } from "./AnimatedBlobs";
import { FoxMascot } from "./FoxMascot";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TimerBadge } from "./TimerBadge";

const nav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/estudar", label: "Estudar", icon: BookOpen },
  { to: "/trilhas", label: "Estudo Automático", icon: RouteIcon },
  { to: "/atrasado", label: "Estudo Atrasado", icon: History },
  { to: "/necessarios", label: "Conteúdos Necessários", icon: Network },
  { to: "/avaliacao", label: "Avaliação", icon: ClipboardCheck },

  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/cronograma", label: "Cronograma", icon: Timer },
  { to: "/produtividade", label: "Fox Productivity", icon: Sparkles },
  { to: "/desafios", label: "Desafios", icon: Trophy },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/escrita", label: "Escrita", icon: PenSquare },
  { to: "/duvidas", label: "Dúvidas", icon: HelpCircle },
  { to: "/anotacoes", label: "Anotações", icon: NotebookPen },
  { to: "/brasoes", label: "Brasões", icon: Award },
  { to: "/recompensas", label: "Recompensas", icon: Gift },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("foxstudy-theme", next ? "dark" : "light");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <AnimatedBlobs />
      {/* Sidebar */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl md:flex">
        <div className="absolute inset-0 overflow-hidden">
          <div className="blob blob-1" style={{ width: 250, height: 250, top: "10%", left: "-30%" }} />
          <div className="blob blob-2" style={{ width: 200, height: 200, bottom: "10%", right: "-40%" }} />
        </div>
        <div className="relative flex items-center gap-3 p-5">
          <FoxMascot className="h-11 w-11" />
          <div>
            <div className="font-display text-lg font-bold">Foxstudy</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ecossistema de estudos</div>
          </div>
        </div>
        <nav className="relative flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-primary/15 font-medium text-primary shadow-[inset_0_0_0_1px_var(--primary)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="relative m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar ou tirar dúvidas..." className="pl-9" onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ to: "/duvidas", search: { q: (e.target as HTMLInputElement).value } });
            }} />
          </div>
          <TimerBadge />
          <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Alternar tema">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" asChild aria-label="Perfil">
            <Link to="/home"><User className="h-4 w-4" /></Link>
          </Button>
        </header>

        <main className="relative flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
