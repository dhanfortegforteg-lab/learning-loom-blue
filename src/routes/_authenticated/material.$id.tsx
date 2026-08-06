import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MaterialViewer } from "@/components/materials/MaterialViewer";
import { DeleteItemButton } from "@/components/DeleteControls";
import { NeededContentsButton } from "@/components/NeededContentsButton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/material/$id")({
  head: () => ({ meta: [{ title: "Material — Foxstudy" }, { name: "description", content: "Visualização do material de estudo." }] }),
  component: MaterialPage,
});

function MaterialPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => (await supabase.from("materials").select("*").eq("id", id).maybeSingle()).data,
  });

  const remove = async () => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success("Material excluído");
    navigate({ to: "/biblioteca" });
  };

  if (isLoading) return <div className="text-center text-muted-foreground">Carregando...</div>;
  if (!data) return <div className="text-center text-muted-foreground">Material não encontrado.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar à biblioteca
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary">{data.kind.replace("_", " ")}</div>
          <h1 className="font-display text-3xl font-bold">{data.subject}</h1>
          {(data.discipline || data.stage) && (
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              {data.discipline && <span className="rounded-full bg-muted px-2 py-0.5">{data.discipline}</span>}
              {data.stage && <span className="rounded-full bg-muted px-2 py-0.5">{data.stage}</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NeededContentsButton topic={data.subject} subject={data.discipline} />
          <DeleteItemButton label="este material" onConfirm={remove} />
        </div>
      </div>
      <MaterialViewer kind={data.kind} content={data.content} materialId={data.id} />
    </div>
  );
}

