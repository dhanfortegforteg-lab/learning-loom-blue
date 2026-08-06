import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NEEDED_YEAR } from "@/lib/related.functions";
import { DeleteItemButton, DeleteAllButton } from "@/components/DeleteControls";
import { Card } from "@/components/ui/card";
import { Network, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/necessarios")({
  head: () => ({
    meta: [
      { title: "Conteúdos Necessários — Foxstudy" },
      { name: "description", content: "Tabelas de pré-requisitos geradas por IA para entender qualquer conteúdo por completo." },
      { property: "og:title", content: "Conteúdos Necessários — Foxstudy" },
      { property: "og:description", content: "Tabelas de pré-requisitos geradas por IA para entender qualquer conteúdo por completo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NecessariosPage,
});

function NecessariosPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["necessarios"],
    queryFn: async () => {
      const { data: tracks } = await supabase
        .from("study_tracks")
        .select("*")
        .eq("year_level", NEEDED_YEAR)
        .order("created_at", { ascending: false });
      const ids = (tracks ?? []).map((t: any) => t.id);
      const { data: contents } = ids.length
        ? await supabase.from("track_contents").select("*").in("track_id", ids).order("position")
        : { data: [] as any[] };
      return { tracks: tracks ?? [], contents: contents ?? [] };
    },
  });

  const tracks = data?.tracks ?? [];

  const removeTrack = async (id: string) => {
    await supabase.from("track_contents").delete().eq("track_id", id);
    const { error } = await supabase.from("study_tracks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tabela excluída");
    qc.invalidateQueries({ queryKey: ["necessarios"] });
  };

  const removeAll = async () => {
    const ids = tracks.map((t: any) => t.id);
    if (!ids.length) return;
    await supabase.from("track_contents").delete().in("track_id", ids);
    const { error } = await supabase.from("study_tracks").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("Tabelas excluídas");
    qc.invalidateQueries({ queryKey: ["necessarios"] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Network className="h-7 w-7 text-primary" /> Conteúdos Necessários
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tabelas separadas das suas trilhas principais, com tudo que explica o <em>porquê</em> do conteúdo que você
            estava estudando. Cada conteúdo aqui usa as mesmas sessões do Estudo Automático — e também tem o botão
            “Conteúdos necessários”.
          </p>
        </div>
        {tracks.length > 0 && <DeleteAllButton label="todas as tabelas" count={tracks.length} onConfirm={removeAll} />}
      </div>

      {tracks.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhuma tabela ainda — abra qualquer material ou sessão de estudo e toque em “Conteúdos necessários”.
        </Card>
      ) : (
        <div className="space-y-6">
          {tracks.map((t: any) => {
            const items = (data?.contents ?? []).filter((c: any) => c.track_id === t.id);
            return (
              <Card key={t.id} className="glass p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">{t.subject}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {items.filter((i: any) => Number(i.attempts ?? 0) > 0).length}/{items.length} estudados
                    </span>
                    <DeleteItemButton label="esta tabela" onConfirm={() => removeTrack(t.id)} />
                  </div>
                </div>
                <ol className="space-y-2">
                  {items.map((c: any, i: number) => {
                    const done = Number(c.attempts ?? 0) > 0;
                    return (
                      <li key={c.id}>
                        <Link
                          to="/trilha/$contentId"
                          params={{ contentId: c.id }}
                          className={`flex items-center gap-4 rounded-2xl border p-4 transition hover:shadow-[var(--shadow-glow)] ${
                            done ? "border-green-500/50 bg-green-500/5" : "border-primary/40 bg-primary/5 hover:border-primary"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                            {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : i + 1}
                          </span>
                          <span className="flex-1">
                            <span className="block font-semibold">{c.title}</span>
                            <span className="block text-xs text-muted-foreground">{c.description}</span>
                          </span>
                          {Number(c.score) > 0 && (
                            <span className="text-sm font-bold text-primary">{Number(c.score).toFixed(1)}</span>
                          )}
                          <Play className="h-4 w-4 text-primary" />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
