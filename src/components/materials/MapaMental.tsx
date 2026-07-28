import { Card } from "@/components/ui/card";

export function MapaMental({ c }: { c: any }) {
  return (
    <div className="space-y-6">
      <Card className="glow-pulse relative overflow-hidden border-primary p-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-primary">Tema central</div>
          <h2 className="mt-2 font-display text-3xl font-bold shimmer-text">{c.center}</h2>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {c.branches?.map((b: any, i: number) => (
          <Card key={i} className="p-5 transition hover:scale-[1.02] hover:shadow-[var(--shadow-glow)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary">{i + 1}</span>
              <h3 className="font-display text-lg font-bold">{b.title}</h3>
            </div>
            <ul className="space-y-2">
              {b.items?.map((it: string, ii: number) => (
                <li key={ii} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {it}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
