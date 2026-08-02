import { Card } from "@/components/ui/card";
import { GitBranch, Key, Link2 } from "lucide-react";

export function MapaMental({ c }: { c: any }) {
  const branches: any[] = c.branches ?? [];
  const connections: string[] = c.connections ?? [];

  return (
    <div className="space-y-6">
      <Card className="glow-pulse relative overflow-hidden border-primary p-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="relative space-y-3">
          <div className="text-xs uppercase tracking-widest text-primary">Tema central</div>
          <h2 className="font-display text-3xl font-bold shimmer-text">{c.center}</h2>
          {c.overview && (
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">{c.overview}</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((b: any, i: number) => (
          <Card key={i} className="p-5 transition hover:shadow-[var(--shadow-glow)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary">{i + 1}</span>
              <h3 className="font-display text-lg font-bold">{b.title}</h3>
            </div>
            {b.summary && <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{b.summary}</p>}
            <ul className="space-y-2">
              {(b.items ?? []).map((it: any, ii: number) => {
                const label = typeof it === "string" ? it : it.label;
                const detail = typeof it === "string" ? null : it.detail;
                return (
                  <li key={ii} className="rounded-xl border border-border/50 bg-muted/40 p-3 text-sm">
                    <div className="flex items-start gap-2 font-semibold text-primary">
                      <GitBranch className="mt-0.5 h-4 w-4 shrink-0" />
                      {label}
                    </div>
                    {detail && <p className="mt-1 pl-6 leading-relaxed text-foreground/90">{detail}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {connections.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <Link2 className="h-5 w-5 text-primary" /> Como os ramos se conectam
          </h3>
          <ul className="space-y-2">
            {connections.map((cn, i) => (
              <li key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">{cn}</li>
            ))}
          </ul>
        </Card>
      )}

      {c.keyIdea && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-5">
          <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Key className="h-5 w-5 text-primary" /> Ideia-chave
          </h3>
          <p className="text-[15px] leading-relaxed">{c.keyIdea}</p>
        </Card>
      )}
    </div>
  );
}
