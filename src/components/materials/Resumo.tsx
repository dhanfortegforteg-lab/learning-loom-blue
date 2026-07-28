import { Card } from "@/components/ui/card";

export function Resumo({ c }: { c: any }) {
  return (
    <div className="space-y-4">
      {c.sections?.map((s: any, i: number) => (
        <Card key={i} className="p-5">
          <h3 className="mb-2 font-display text-xl font-bold text-primary">{s.heading}</h3>
          <p className="text-sm leading-relaxed">{s.body}</p>
          {s.example && (
            <div className="mt-3 rounded-lg bg-primary/10 p-3 text-sm">
              🌟 <span className="font-medium">Exemplo:</span> {s.example}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
