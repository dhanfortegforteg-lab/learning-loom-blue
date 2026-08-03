import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NotebookPen, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({ meta: [{ title: "Anotações — Foxstudy" }, { name: "description", content: "Suas anotações de estudo." }] }),
  component: AnotacoesPage,
});

function AnotacoesPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => (await supabase.from("notes").select("*").order("updated_at", { ascending: false })).data ?? [],
  });

  const add = async () => {
    if (!title.trim()) return;
    const { data: sess } = await supabase.auth.getSession();
    await supabase.from("notes").insert({ user_id: sess.session!.user.id, title, content });
    setTitle(""); setContent("");
    qc.invalidateQueries({ queryKey: ["notes"] });
  };
  const del = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };
  const delAll = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    await supabase.from("notes").delete().eq("user_id", uid);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><NotebookPen className="h-7 w-7 text-primary" /> Anotações</h1>
        <DeleteAllButton label="anotações" count={data?.length ?? 0} onConfirm={delAll} />
      </div>
      <Card className="space-y-3 p-5">
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Anote aqui..." rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Salvar</Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {(data ?? []).map((n: any) => (
          <Card key={n.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-semibold">{n.title}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</p>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(n.updated_at).toLocaleString("pt-BR")}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
