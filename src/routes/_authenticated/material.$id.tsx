import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MaterialViewer } from "@/components/materials/MaterialViewer";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/material/$id")({
  head: () => ({ meta: [{ title: "Material — Urstudy" }, { name: "description", content: "Visualização do material de estudo." }] }),
  component: MaterialPage,
});

function MaterialPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => (await supabase.from("materials").select("*").eq("id", id).maybeSingle()).data,
  });

  if (isLoading) return <div className="text-center text-muted-foreground">Carregando...</div>;
  if (!data) return <div className="text-center text-muted-foreground">Material não encontrado.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar à biblioteca
      </Link>
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
      <MaterialViewer kind={data.kind} content={data.content} materialId={data.id} />
    </div>
  );
}
