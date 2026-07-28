import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Library } from "lucide-react";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Urstudy" }, { name: "description", content: "Histórico de todos os materiais gerados." }] }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => (await supabase.from("materials").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = (data ?? []).filter((m: any) =>
    !q || m.subject.toLowerCase().includes(q.toLowerCase()) || m.kind.includes(q.toLowerCase()) || (m.discipline ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Library className="h-7 w-7 text-primary" /> Biblioteca</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por assunto, tipo, disciplina..." className="max-w-sm" />
      </div>
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum material salvo ainda. Gere seu primeiro em Estudar.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m: any) => (
            <Link key={m.id} to="/material/$id" params={{ id: m.id }} className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
              <div className="text-[10px] uppercase tracking-widest text-primary">{m.kind.replace("_", " ")}</div>
              <div className="mt-1 text-lg font-semibold">{m.subject}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {m.discipline && <span className="rounded-full bg-muted px-2 py-0.5">{m.discipline}</span>}
                {m.stage && <span className="rounded-full bg-muted px-2 py-0.5">{m.stage}</span>}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
