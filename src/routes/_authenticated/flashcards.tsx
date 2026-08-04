import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DeleteAllButton, DeleteItemButton } from "@/components/DeleteControls";
import { toast } from "sonner";
import { Layers, Plus, ArrowLeft, Check, X, RotateCcw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards personalizados — Foxstudy" },
      { name: "description", content: "Crie seus próprios baralhos de flashcards e revise com repetição espaçada pelo método Leitner." },
      { property: "og:title", content: "Flashcards personalizados — Foxstudy" },
      { property: "og:description", content: "Monte baralhos com pergunta e resposta e revise com o método Leitner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlashcardsPage,
});

const BOX_DAYS = [0, 1, 2, 4, 8, 16];

function FlashcardsPage() {
  const [deckId, setDeckId] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  if (review) return <GlobalReview onBack={() => setReview(false)} />;
  return deckId ? <DeckView id={deckId} onBack={() => setDeckId(null)} /> : <DeckList onOpen={setDeckId} onReview={() => setReview(true)} />;
}

/** Revisão global: junta os cartões vencidos de todos os baralhos (Leitner). */
function GlobalReview({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { data: cards } = useQuery({
    queryKey: ["review-due"],
    queryFn: async () =>
      (await supabase.from("flashcard_cards").select("*").lte("due_at", new Date().toISOString()).order("box", { ascending: true })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Revisão do dia</h1>
          <p className="text-xs text-muted-foreground">{cards?.length ?? 0} cartões vencidos em todos os baralhos</p>
        </div>
      </div>
      {(cards?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nada para revisar agora. Volte quando os cartões vencerem.</Card>
      ) : (
        <StudyMode
          cards={cards!}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["review-due"] });
            qc.invalidateQueries({ queryKey: ["decks"] });
          }}
        />
      )}
    </div>
  );
}

function DeckList({ onOpen, onReview }: { onOpen: (id: string) => void; onReview: () => void }) {

  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const { data: decks } = useQuery({
    queryKey: ["decks"],
    queryFn: async () => (await supabase.from("flashcard_decks").select("*, flashcard_cards(count)").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["decks"] });

  const create = async () => {
    if (!title.trim()) return toast.error("Dê um nome ao baralho");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("flashcard_decks")
      .insert({ user_id: uid, title: title.trim(), subject: subject.trim() || null })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setTitle(""); setSubject("");
    toast.success("Baralho criado");
    refresh();
    if (data) onOpen(data.id);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("flashcard_decks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Baralho excluído");
    refresh();
  };

  const removeAll = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("flashcard_decks").delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    toast.success("Todos os baralhos foram excluídos");
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
            <Layers className="h-7 w-7 text-primary" /> Flashcards personalizados
          </h1>
          <p className="text-sm text-muted-foreground">Crie seus baralhos: pergunta na frente, resposta no verso. Revise com o método Leitner.</p>
        </div>
        <DeleteAllButton label="baralhos" count={decks?.length ?? 0} onConfirm={removeAll} />
      </div>

      <Card className="space-y-3 border-primary/40 bg-gradient-to-br from-card to-primary/10 p-5 shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" /> Novo baralho</div>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do baralho (ex: Revolução Francesa)" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matéria (opcional)" />
          <Button onClick={create}><Plus className="mr-1 h-4 w-4" /> Criar</Button>
        </div>
      </Card>

      {(decks?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum baralho ainda. Crie o primeiro acima.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {decks!.map((d: any) => (
            <div key={d.id} className="relative">
              <button
                onClick={() => onOpen(d.id)}
                className="block w-full rounded-2xl border border-border/60 bg-card/60 p-5 pr-12 text-left backdrop-blur-sm transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="text-[10px] uppercase tracking-widest text-primary">{d.subject || "Personalizado"}</div>
                <div className="mt-1 text-lg font-semibold">{d.title}</div>
                <div className="mt-2 text-xs text-muted-foreground">{d.flashcard_cards?.[0]?.count ?? 0} cartões</div>
              </button>
              <div className="absolute right-2 top-2">
                <DeleteItemButton label={`o baralho "${d.title}"`} onConfirm={() => remove(d.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeckView({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [mode, setMode] = useState<"edit" | "study">("edit");

  const { data: deck } = useQuery({
    queryKey: ["deck", id],
    queryFn: async () => (await supabase.from("flashcard_decks").select("*").eq("id", id).single()).data,
  });
  const { data: cards } = useQuery({
    queryKey: ["deck-cards", id],
    queryFn: async () =>
      (await supabase.from("flashcard_cards").select("*").eq("deck_id", id).order("created_at", { ascending: true })).data ?? [],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["deck-cards", id] });
    qc.invalidateQueries({ queryKey: ["decks"] });
  };

  const add = async () => {
    if (!front.trim() || !back.trim()) return toast.error("Preencha frente e verso");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("flashcard_cards").insert({
      deck_id: id, user_id: uid, front: front.trim(), back: back.trim(), position: cards?.length ?? 0,
    });
    if (error) return toast.error(error.message);
    setFront(""); setBack("");
    refresh();
  };

  const remove = async (cid: string) => {
    const { error } = await supabase.from("flashcard_cards").delete().eq("id", cid);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeAll = async () => {
    const { error } = await supabase.from("flashcard_cards").delete().eq("deck_id", id);
    if (error) return toast.error(error.message);
    toast.success("Cartões excluídos");
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="font-display text-2xl font-bold">{deck?.title ?? "Baralho"}</h1>
            <p className="text-xs text-muted-foreground">{cards?.length ?? 0} cartões {deck?.subject ? `• ${deck.subject}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>Editar</Button>
          <Button variant={mode === "study" ? "default" : "outline"} onClick={() => setMode("study")} disabled={(cards?.length ?? 0) === 0}>Revisar</Button>
        </div>
      </div>

      {mode === "edit" ? (
        <>
          <Card className="space-y-3 border-primary/40 bg-gradient-to-br from-card to-primary/10 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Frente: pergunta ou tópico" rows={3} />
              <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Verso: resposta" rows={3} />
            </div>
            <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Adicionar cartão</Button>
          </Card>

          {(cards?.length ?? 0) > 0 && (
            <div className="flex justify-end">
              <DeleteAllButton label="cartões deste baralho" count={cards!.length} onConfirm={removeAll} />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {(cards ?? []).map((c: any) => (
              <Card key={c.id} className="relative p-4 pr-12">
                <div className="text-[10px] uppercase tracking-widest text-primary">Caixa {c.box}</div>
                <div className="mt-1 font-medium">{c.front}</div>
                <div className="mt-2 text-sm text-muted-foreground">{c.back}</div>
                <div className="absolute right-2 top-2">
                  <DeleteItemButton label="este cartão" onConfirm={() => remove(c.id)} />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <StudyMode cards={cards ?? []} onDone={refresh} />
      )}
    </div>
  );
}

function StudyMode({ cards, onDone }: { cards: any[]; onDone: () => void }) {
  const due = cards
    .filter((c) => new Date(c.due_at).getTime() <= Date.now())
    .sort((a, b) => a.box - b.box);
  const queue = due.length > 0 ? due : cards;
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ ok: 0, no: 0 });
  const card = queue[i];

  const grade = async (correct: boolean) => {
    const box = correct ? Math.min(5, (card.box ?? 1) + 1) : 1;
    const due_at = new Date(Date.now() + BOX_DAYS[box]! * 86400000).toISOString();
    await supabase.from("flashcard_cards").update({ box, due_at }).eq("id", card.id);
    setStats((s) => ({ ok: s.ok + (correct ? 1 : 0), no: s.no + (correct ? 0 : 1) }));
    setFlipped(false);
    setI((v) => v + 1);
    onDone();
  };

  if (!card) {
    return (
      <Card className="space-y-4 p-12 text-center">
        <div className="font-display text-2xl font-bold">Revisão concluída!</div>
        <p className="text-muted-foreground">Acertos: {stats.ok} • Erros: {stats.no}</p>
        <Button onClick={() => { setI(0); setStats({ ok: 0, no: 0 }); }}><RotateCcw className="mr-1 h-4 w-4" /> Revisar de novo</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{i + 1} de {queue.length}</span>
        <span>Caixa Leitner {card.box} • próxima em {BOX_DAYS[Math.min(5, card.box)]} dia(s)</span>
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="block min-h-64 w-full rounded-2xl border border-primary/40 bg-gradient-to-br from-card to-primary/10 p-8 text-center shadow-[var(--shadow-glow)]"
      >
        <div className="mb-2 text-xs uppercase tracking-widest text-primary">{flipped ? "Resposta" : "Pergunta"}</div>
        <div className={flipped ? "text-lg" : "font-display text-2xl font-bold"}>{flipped ? card.back : card.front}</div>
        {!flipped && <div className="mt-6 text-xs text-muted-foreground">Toque para virar</div>}
      </button>
      <div className="flex justify-center gap-2">
        <Button variant="destructive" onClick={() => grade(false)}><X className="mr-1 h-4 w-4" /> Errei</Button>
        <Button onClick={() => grade(true)}><Check className="mr-1 h-4 w-4" /> Acertei</Button>
      </div>
    </div>
  );
}
