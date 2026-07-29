import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

function imageFor(query: string, seed: string) {
  const tags = encodeURIComponent(
    (query || "study")
      .toLowerCase()
      .replace(/[^a-z0-9à-ÿ\s,]/gi, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(",") || "study,education",
  );
  const lock = encodeURIComponent(seed);
  return `https://loremflickr.com/800/450/${tags}?lock=${lock}`;
}

export function Slides({ c }: { c: any }) {
  const slides = c.slides ?? [];
  const [i, setI] = useState(0);
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});
  const s = slides[i];
  const img = useMemo(() => (s ? imageFor(s.visual || s.title || c.title || "study", `${c.title ?? "deck"}-${i}`) : ""), [s, i, c.title]);
  if (!s) return null;
  return (
    <div className="space-y-4">
      <Card className="glass relative min-h-[460px] overflow-hidden p-0">
        <div className="absolute inset-0 opacity-40">
          <div className="blob blob-1" style={{ width: 320, height: 320, top: "-20%", right: "-15%" }} />
          <div className="blob blob-2" style={{ width: 260, height: 260, bottom: "-20%", left: "-10%" }} />
        </div>
        <div className="relative grid gap-0 md:grid-cols-2">
          <div className="relative aspect-video overflow-hidden md:aspect-auto md:min-h-[460px]">
            {!imgFailed[i] ? (
              <img
                src={img}
                alt={s.visual || s.title}
                loading="lazy"
                onError={() => setImgFailed((m) => ({ ...m, [i]: true }))}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 to-primary-glow/30">
                <ImageIcon className="h-16 w-16 text-primary-foreground/70" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-card/90 md:to-card" />
          </div>
          <div className="relative p-8 md:p-10">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
              Slide {i + 1} / {slides.length}
            </div>
            <h2 className="mb-6 font-display text-3xl font-bold leading-tight md:text-4xl">
              <span className="text-gradient">{s.title}</span>
            </h2>
            <ul className="space-y-3">
              {s.bullets?.map((b: string, bi: number) => (
                <li key={bi} className="flex items-start gap-3 text-base md:text-lg">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-primary shadow-[0_0_10px_var(--primary)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {s.visual && (
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs italic text-muted-foreground">
                🎨 {s.visual}
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />Anterior
        </Button>
        <div className="flex gap-1">
          {slides.map((_: any, si: number) => (
            <button
              key={si}
              onClick={() => setI(si)}
              className={`h-2 rounded-full transition-all ${si === i ? "w-8 bg-gradient-primary shadow-[0_0_10px_var(--primary)]" : "w-2 bg-muted hover:bg-primary/50"}`}
            />
          ))}
        </div>
        <Button onClick={() => setI(Math.min(slides.length - 1, i + 1))} disabled={i === slides.length - 1} className="bg-gradient-primary text-primary-foreground">
          Próximo<ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
