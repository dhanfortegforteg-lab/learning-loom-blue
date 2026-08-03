import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Foxstudy" }, { name: "description", content: "Organize eventos e lembretes de estudo." }] }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("events").select("*").order("event_date")).data ?? [],
  });

  const add = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    const { data: sess } = await supabase.auth.getSession();
    await supabase.from("events").insert({ user_id: sess.session!.user.id, title, description: desc, event_date: date });
    setTitle(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Evento criado!");
  };
  const del = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  };
  const delAll = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    await supabase.from("events").delete().eq("user_id", uid);
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Eventos excluídos");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Calendar className="h-7 w-7 text-primary" /> Calendário</h1>
        <DeleteAllButton label="eventos" count={data?.length ?? 0} onConfirm={delAll} />
      </div>
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={add} className="w-full"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></div>
          <div className="md:col-span-4"><Label>Descrição</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
      </Card>
      <div className="space-y-2">
        {(data ?? []).map((e: any) => (
          <Card key={e.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium text-primary">{new Date(e.event_date).toLocaleDateString("pt-BR")}</div>
              <div className="font-semibold">{e.title}</div>
              {e.description && <div className="text-sm text-muted-foreground">{e.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
        {(!data || data.length === 0) && <Card className="p-8 text-center text-muted-foreground">Nenhum evento ainda.</Card>}
      </div>
    </div>
  );
}
