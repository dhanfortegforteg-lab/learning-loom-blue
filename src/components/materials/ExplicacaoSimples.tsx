import { Card } from "@/components/ui/card";
import { FoxMascot } from "@/components/FoxMascot";

export function ExplicacaoSimples({ c }: { c: any }) {
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
        <div className="mb-3 flex items-center gap-3">
          <FoxMascot className="h-10 w-10" />
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Explicação para crianças</div>
            <h3 className="font-display text-xl font-bold">{c.title}</h3>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed">{c.story}</p>
      </Card>
      {c.analogies?.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {c.analogies.map((a: string, i: number) => (
            <Card key={i} className="p-4 text-sm"><span className="mr-2">🎈</span>{a}</Card>
          ))}
        </div>
      )}
    </div>
  );
}
