import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteItemButton } from "@/components/DeleteControls";
import { Narrator, VocabularyButton } from "@/components/StudyTools";
import { FileUp, Highlighter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leitor")({
  head: () => ({
    meta: [
      { title: "Leitor de PDF — Foxstudy" },
      { name: "description", content: "Leia seus PDFs, guarde a página onde parou e salve destaques." },
      { property: "og:title", content: "Leitor de PDF — Foxstudy" },
      { property: "og:description", content: "Biblioteca de PDFs com marcação de página e destaques salvos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeitorPage,
});

type Highlight = { text: string; page: number };

function LeitorPage() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: docs } = useQuery({
    queryKey: ["pdf_docs"],
    queryFn: async () =>
      (await supabase.from("pdf_docs").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const open = (docs ?? []).find((d: any) => d.id === openId) as any;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open) return setUrl(null);
      const { data } = await supabase.storage.from("pdfs").createSignedUrl(open.path, 3600);
      if (alive) {
        setUrl(data?.signedUrl ?? null);
        setPage(open.last_page ?? 1);
      }
    })();
    return () => {
      alive = false;
    };
  }, [openId, open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "";
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("pdfs").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { data: row, error } = await supabase
        .from("pdf_docs")
        .insert({ user_id: uid, name: file.name, path })
        .select("id")
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pdf_docs"] });
      setOpenId(row.id);
      toast.success("PDF enviado!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar o PDF");
    } finally {
      setUploading(false);
    }
  };

  const savePage = async (p: number) => {
    setPage(p);
    if (open) {
      await supabase.from("pdf_docs").update({ last_page: p }).eq("id", open.id);
      qc.invalidateQueries({ queryKey: ["pdf_docs"] });
    }
  };

  const addHighlight = async () => {
    if (!open || !note.trim()) return;
    const list: Highlight[] = [...((open.highlights ?? []) as Highlight[]), { text: note.trim(), page }];
    await supabase.from("pdf_docs").update({ highlights: list as any }).eq("id", open.id);
    setNote("");
    qc.invalidateQueries({ queryKey: ["pdf_docs"] });
    toast.success("Destaque salvo");
  };

  const highlights = ((open?.highlights ?? []) as Highlight[]) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Leitor de PDF</h1>
        <p className="text-muted-foreground">Envie seus materiais, continue de onde parou e guarde os trechos importantes.</p>
      </div>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label>Enviar PDF</Label>
          <Input
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          <FileUp className="mr-1 inline h-4 w-4" /> {uploading ? "Enviando..." : "Somente você vê seus arquivos"}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {(docs ?? []).map((d: any) => (
            <Card key={d.id} className={`flex items-center justify-between gap-2 p-3 ${openId === d.id ? "border-primary" : ""}`}>
              <button className="text-left" onClick={() => setOpenId(d.id)}>
                <div className="line-clamp-1 text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">Página {d.last_page}</div>
              </button>
              <DeleteItemButton
                label="este PDF"
                onConfirm={async () => {
                  await supabase.storage.from("pdfs").remove([d.path]);
                  await supabase.from("pdf_docs").delete().eq("id", d.id);
                  qc.invalidateQueries({ queryKey: ["pdf_docs"] });
                  if (openId === d.id) setOpenId(null);
                }}
              />
            </Card>
          ))}
          {!docs?.length && <p className="text-sm text-muted-foreground">Nenhum PDF enviado ainda.</p>}
        </div>

        <div className="space-y-4">
          {open && url ? (
            <>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="mr-1">Página</Label>
                  <Input
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => void savePage(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24"
                  />
                  <Narrator getText={() => highlights.map((h) => h.text).join(". ")} />
                  <VocabularyButton subject={open.name} />
                </div>
                <iframe
                  key={`${open.id}-${page}`}
                  title={open.name}
                  src={`${url}#page=${page}`}
                  className="h-[70vh] w-full rounded-xl border border-primary/20 bg-background"
                />
              </Card>

              <Card className="space-y-3 p-4">
                <div className="flex items-center gap-2 font-display font-semibold">
                  <Highlighter className="h-4 w-4 text-primary" /> Destaques
                </div>
                <div className="flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cole ou escreva o trecho importante" />
                  <Button onClick={addHighlight}>Salvar</Button>
                </div>
                <ul className="space-y-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                      <span className="text-xs text-muted-foreground">p. {h.page}</span>
                      <div>{h.text}</div>
                    </li>
                  ))}
                  {!highlights.length && <p className="text-sm text-muted-foreground">Nenhum destaque ainda.</p>}
                </ul>
              </Card>
            </>
          ) : (
            <Card className="p-10 text-center text-sm text-muted-foreground">Selecione um PDF para começar a ler.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
