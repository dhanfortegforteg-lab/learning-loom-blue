import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Library } from "lucide-react";
import { DeleteAllButton, DeleteItemButton } from "@/components/DeleteControls";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Foxstudy" }, { name: "description", content: "Histórico de todos os materiais gerados." }] }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => (await supabase.from("materials").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = (data ?? []).filter((m: any) =>
    !q || m.subject.toLowerCase().includes(q.toLowerCase()) || m.kind.includes(q.toLowerCase()) || (m.discipline ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["biblioteca"] });

  const remove = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Material excluído");
    refresh();
  };

  const removeAll = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("materials").delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    toast.success("Todos os materiais foram excluídos");
    refresh();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Library className="h-7 w-7 text-primary" /> Biblioteca</h1>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por assunto, tipo, disciplina..." className="max-w-sm" />
          <DeleteAllButton label="materiais salvos" count={data?.length ?? 0} onConfirm={removeAll} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum material salvo ainda. Gere seu primeiro em Estudar.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m: any) => (
            <div key={m.id} className="relative">
              <Link to="/material/$id" params={{ id: m.id }} className="block rounded-2xl border border-border/60 bg-card/60 p-5 pr-12 backdrop-blur-sm transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
                <div className="text-[10px] uppercase tracking-widest text-primary">{m.kind.replace("_", " ")}</div>
                <div className="mt-1 text-lg font-semibold">{m.subject}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {m.discipline && <span className="rounded-full bg-muted px-2 py-0.5">{m.discipline}</span>}
                  {m.stage && <span className="rounded-full bg-muted px-2 py-0.5">{m.stage}</span>}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
              </Link>
              <div className="absolute right-2 top-2">
                <DeleteItemButton label={`o material "${m.subject}"`} onConfirm={() => remove(m.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
