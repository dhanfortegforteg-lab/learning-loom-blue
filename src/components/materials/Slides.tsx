import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageIcon, Loader2 } from "lucide-react";

const cache = new Map<string, string | null>();

/** Busca uma imagem realmente relacionada ao termo na Wikipédia (pt, com fallback en). */
async function findImage(term: string): Promise<string | null> {
  const query = term.trim();
  if (!query) return null;
  if (cache.has(query)) return cache.get(query)!;
  for (const lang of ["pt", "en"]) {
    try {
      const url =
        `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
        `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5` +
        `&prop=pageimages&piprop=thumbnail&pithumbsize=900`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages: any[] = Object.values(data?.query?.pages ?? {});
      const hit = pages
        .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
        .find((p) => p.thumbnail?.source);
      if (hit) {
        cache.set(query, hit.thumbnail.source);
        return hit.thumbnail.source;
      }
    } catch {
      /* tenta o próximo idioma */
    }
  }
  cache.set(query, null);
  return null;
}

function useSlideImage(terms: string[]) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = terms.filter(Boolean).join("|");
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setSrc(null);
    setLoading(true);
    (async () => {
      for (const t of terms.filter(Boolean)) {
        const found = await findImage(t);
        if (id !== reqId.current) return;
        if (found) {
          setSrc(found);
          setLoading(false);
          return;
        }
      }
      if (id === reqId.current) setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { src, loading };
}

export function Slides({ c }: { c: any }) {
  const slides = c.slides ?? [];
  const [i, setI] = useState(0);
  const s = slides[i];

  const subject: string = c.subject || c.title || "";
  const { src, loading } = useSlideImage([
    [s?.title, subject].filter(Boolean).join(" "),
    s?.title ?? "",
    s?.visual ?? "",
    subject,
  ]);

  if (!s) return null;

  return (
    <div className="space-y-4">
      <Card className="glass relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="blob blob-1" style={{ width: 320, height: 320, top: "-20%", right: "-15%" }} />
          <div className="blob blob-2" style={{ width: 260, height: 260, bottom: "-20%", left: "-10%" }} />
        </div>

        <div className="relative grid gap-0 md:grid-cols-2">
          <div className="relative order-1 h-48 overflow-hidden border-b border-border/60 bg-muted/40 md:h-auto md:min-h-[420px] md:border-b-0 md:border-r">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : src ? (
              <img
                src={src}
                alt={s.visual || s.title}
                loading="lazy"
                className="h-full w-full object-contain p-3 md:p-6"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/30 to-primary-glow/20 p-6 text-center">
                <ImageIcon className="h-12 w-12 text-primary" />
                <span className="text-xs text-muted-foreground">{s.visual || s.title}</span>
              </div>
            )}
          </div>

          <div className="relative order-2 p-6 md:p-10">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
              Slide {i + 1} / {slides.length}
            </div>
            <h2 className="mb-5 font-display text-2xl font-bold leading-tight md:text-4xl">
              <span className="text-gradient">{s.title}</span>
            </h2>
            <ul className="space-y-3">
              {s.bullets?.map((b: string, bi: number) => (
                <li key={bi} className="flex items-start gap-3 text-[15px] md:text-lg">
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

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />Anterior
        </Button>
        <div className="flex flex-wrap justify-center gap-1">
          {slides.map((_: any, si: number) => (
            <button
              key={si}
              aria-label={`Ir para o slide ${si + 1}`}
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
