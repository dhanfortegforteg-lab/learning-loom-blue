import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateLanguageLesson } from "@/lib/extras.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MiniQuiz } from "@/components/MiniQuiz";
import { StudyTools } from "@/components/StudyTools";
import { NeededContentsButton } from "@/components/NeededContentsButton";
import { DeleteItemButton } from "@/components/DeleteControls";
import { Languages } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/idiomas")({
  head: () => ({
    meta: [
      { title: "Aprendizagem Estrangeira — Foxstudy" },
      { name: "description", content: "Estude idiomas com teoria, vocabulário, exercícios e narrador." },
      { property: "og:title", content: "Aprendizagem Estrangeira — Foxstudy" },
      { property: "og:description", content: "Trilha de idiomas com vocabulário, prática e narração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IdiomasPage,
});

const LANGS = ["Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Japonês"];
const STAGES = ["Fundamental I", "Fundamental II", "Ensino Médio", "Vestibular/ENEM"];

function IdiomasPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateLanguageLesson);
  const [language, setLanguage] = useState(LANGS[0]);
  const [stage, setStage] = useState(STAGES[1]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: lessons } = useQuery({
    queryKey: ["language_lessons"],
    queryFn: async () =>
      (await supabase.from("language_lessons").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const run = async () => {
    if (!topic.trim()) return toast.error("Digite o tema da aula");
    setBusy(true);
    try {
      const res = await gen({ data: { language, stage, topic: topic.trim() } });
      setOpenId(res.id);
      qc.invalidateQueries({ queryKey: ["language_lessons"] });
      toast.success("Aula criada!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar a aula");
    } finally {
      setBusy(false);
    }
  };

  const open = (lessons ?? []).find((l: any) => l.id === openId) as any;
  const c = open?.content;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Aprendizagem estrangeira</h1>
        <p className="text-muted-foreground">Idioma, etapa e tema — a aula é montada na hora, com vocabulário e prática.</p>
      </div>

      <Card className="grid gap-4 p-5 md:grid-cols-4">
        <div>
          <Label>Idioma</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Etapa</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tema</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: verbo to be" />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={run} disabled={busy}>
            <Languages className="mr-2 h-4 w-4" /> {busy ? "Criando..." : "Criar aula"}
          </Button>
        </div>
      </Card>

      {c && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">{c.title}</h2>
            <div className="flex flex-wrap gap-2">
              <StudyTools
                subject={open.topic}
                getText={() => [c.title, c.explanation, ...(c.sections ?? []).map((s: any) => `${s.title}. ${s.body}`)].join("\n")}
              />
              <NeededContentsButton topic={open.topic} subject={open.language} />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.explanation}</p>
          {(c.sections ?? []).map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="font-display font-semibold text-primary">{s.title}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
              {s.example && <p className="mt-2 text-sm italic text-muted-foreground">{s.example}</p>}
            </div>
          ))}
          {!!c.vocabulary?.length && (
            <div>
              <h3 className="mb-2 font-display font-semibold">Vocabulário</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {c.vocabulary.map((v: any, i: number) => (
                  <Card key={i} className="bg-muted/30 p-3 text-sm">
                    <span className="font-medium text-primary">{v.term}</span> — {v.definition}
                  </Card>
                ))}
              </div>
            </div>
          )}
          <MiniQuiz questions={c.questions ?? []} />
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">Minhas aulas</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(lessons ?? []).map((l: any) => (
            <Card key={l.id} className="flex items-center justify-between gap-2 p-4">
              <button className="text-left" onClick={() => setOpenId(l.id)}>
                <div className="font-medium">{l.topic}</div>
                <div className="text-xs text-muted-foreground">{l.language} · {l.stage ?? "livre"}</div>
              </button>
              <DeleteItemButton
                label="esta aula"
                onConfirm={async () => {
                  await supabase.from("language_lessons").delete().eq("id", l.id);
                  qc.invalidateQueries({ queryKey: ["language_lessons"] });
                  if (openId === l.id) setOpenId(null);
                }}
              />
            </Card>
          ))}
          {!lessons?.length && <p className="text-sm text-muted-foreground">Nenhuma aula ainda.</p>}
        </div>
      </div>
    </div>
  );
}
