import { Card } from "@/components/ui/card";

export function Apostila({ c }: { c: any }) {
  return (
    <div className="space-y-4">
      {c.intro && <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5"><p className="text-sm leading-relaxed">{c.intro}</p></Card>}
      {c.blocks?.map((b: any, i: number) => (
        <Card key={i} className="p-5 transition hover:shadow-[var(--shadow-glow)]">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
            <h3 className="font-display text-xl font-bold">{b.title}</h3>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{b.body}</div>
          {b.highlight && (
            <div className="mt-3 rounded-lg border-l-4 border-primary bg-primary/10 p-3 text-sm">
              💡 <span className="font-medium">{b.highlight}</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
