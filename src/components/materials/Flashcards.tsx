import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";

export function Flashcards({ c }: { c: any }) {
  const cards = c.cards ?? [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const card = cards[i];
  if (!card) return null;

  const next = () => { setFlipped(false); setI((i + 1) % cards.length); };
  const prev = () => { setFlipped(false); setI((i - 1 + cards.length) % cards.length); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{i + 1} de {cards.length}</span>
        <span>Conhecidos: {known.size}/{cards.length}</span>
      </div>
      <div className="perspective-1000">
        <button
          onClick={() => setFlipped(!flipped)}
          className="relative block h-80 w-full preserve-3d transition-transform duration-500"
          style={{ transform: flipped ? "rotateY(180deg)" : "" }}
        >
          <Card className="absolute inset-0 flex flex-col items-center justify-center border-primary/40 bg-gradient-to-br from-card to-primary/10 p-8 text-center backface-hidden">
            <div className="mb-2 text-xs uppercase tracking-widest text-primary">Pergunta</div>
            <div className="font-display text-2xl font-bold">{card.front}</div>
            <div className="mt-6 text-xs text-muted-foreground">Toque para virar</div>
          </Card>
          <Card className="absolute inset-0 flex flex-col items-center justify-center rotate-y-180 border-primary bg-gradient-to-br from-primary/20 to-card p-8 text-center backface-hidden">
            <div className="mb-2 text-xs uppercase tracking-widest text-primary">Resposta</div>
            <div className="text-lg font-medium">{card.back}</div>
          </Card>
        </button>
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="destructive" onClick={() => { setKnown((s) => { const n = new Set(s); n.delete(i); return n; }); next(); }}>
          <X className="mr-1 h-4 w-4" /> Não sei
        </Button>
        <Button onClick={() => { setKnown((s) => new Set(s).add(i)); next(); }}>
          <Check className="mr-1 h-4 w-4" /> Sei
        </Button>
        <Button variant="outline" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
