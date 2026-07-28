import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Slides({ c }: { c: any }) {
  const slides = c.slides ?? [];
  const [i, setI] = useState(0);
  const s = slides[i];
  if (!s) return null;
  return (
    <div className="space-y-4">
      <Card className="relative min-h-[400px] overflow-hidden bg-gradient-to-br from-primary/20 via-card to-card p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="blob blob-1" style={{ width: 300, height: 300, top: "-20%", right: "-20%" }} />
          <div className="blob blob-2" style={{ width: 250, height: 250, bottom: "-20%", left: "-10%" }} />
        </div>
        <div className="relative">
          <div className="mb-2 text-xs uppercase tracking-widest text-primary">Slide {i + 1}/{slides.length}</div>
          <h2 className="mb-6 font-display text-4xl font-bold">{s.title}</h2>
          <ul className="space-y-3">
            {s.bullets?.map((b: string, bi: number) => (
              <li key={bi} className="flex items-start gap-3 text-lg">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {s.visual && <div className="mt-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-xs italic text-muted-foreground">🎨 Visual: {s.visual}</div>}
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button>
        <div className="flex gap-1">
          {slides.map((_: any, si: number) => (
            <button key={si} onClick={() => setI(si)} className={`h-2 w-8 rounded-full ${si === i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <Button onClick={() => setI(Math.min(slides.length - 1, i + 1))} disabled={i === slides.length - 1}>Próximo<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
