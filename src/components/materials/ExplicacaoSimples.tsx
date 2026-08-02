import { Card } from "@/components/ui/card";
import { FoxMascot } from "@/components/FoxMascot";
import { BookOpen, Lightbulb, ListChecks, Quote } from "lucide-react";

export function ExplicacaoSimples({ c }: { c: any }) {
  const sections: any[] = c.sections ?? [];
  const keyTerms: any[] = c.keyTerms ?? [];
  const analogies: string[] = c.analogies ?? [];

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
        <div className="mb-4 flex items-center gap-3">
          <FoxMascot className="h-12 w-12" />
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Explicação didática</div>
            <h2 className="font-display text-2xl font-bold leading-tight">{c.title}</h2>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
          {c.intro ?? c.story}
        </p>
      </Card>

      {sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <Card key={i} className="border-border/60 p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{s.body}</p>
              {s.example && (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
                  <span className="mr-2 font-semibold text-primary">Exemplo:</span>
                  {s.example}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {keyTerms.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <ListChecks className="h-5 w-5 text-primary" /> Termos essenciais
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {keyTerms.map((t, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="font-semibold text-primary">{t.term}</div>
                <div className="text-muted-foreground">{t.definition}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analogies.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <Lightbulb className="h-5 w-5 text-primary" /> Comparações do dia a dia
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {analogies.map((a, i) => (
              <div key={i} className="flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {c.summary && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
          <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <BookOpen className="h-5 w-5 text-primary" /> Conclusão
          </h3>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{c.summary}</p>
        </Card>
      )}
    </div>
  );
}
