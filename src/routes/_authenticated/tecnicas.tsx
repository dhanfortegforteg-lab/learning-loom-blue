import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Narrator } from "@/components/StudyTools";
import { Mic, Timer, Presentation, Users, Volume2, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tecnicas")({
  head: () => ({
    meta: [
      { title: "Técnicas de Apresentação — Foxstudy" },
      { name: "description", content: "Prepare seminários e apresentações com roteiro, ensaio e cronômetro de fala." },
      { property: "og:title", content: "Técnicas de Apresentação — Foxstudy" },
      { property: "og:description", content: "Roteiro, dicas de postura e ensaio cronometrado da sua fala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TecnicasPage,
});

const TIPS = [
  { icon: Eye, title: "Contato visual", body: "Divida a plateia em três blocos e alterne o olhar entre eles a cada frase. Evita a leitura fixa no papel e prende a atenção." },
  { icon: Volume2, title: "Voz e ritmo", body: "Fale um pouco mais devagar do que numa conversa. Marque pausas curtas depois de cada ideia importante — a pausa vale mais que o volume." },
  { icon: Users, title: "Postura", body: "Pés paralelos, ombros soltos, mãos livres para gesticular na altura do peito. Não se apoie na mesa nem cruze os braços." },
  { icon: Presentation, title: "Slides", body: "Máximo de 6 linhas por slide. O slide é apoio visual, não roteiro: quem lê o slide inteiro perde a plateia." },
  { icon: Mic, title: "Abertura", body: "Comece com uma pergunta, um dado ou uma imagem forte. Os primeiros 20 segundos decidem a atenção do resto." },
  { icon: Timer, title: "Fechamento", body: "Retome em uma frase a ideia central e diga claramente que terminou. Deixe 1 minuto de folga para perguntas." },
];

/** Ritmo confortável de fala em português: ~130 palavras por minuto. */
const WPM = 130;

function TecnicasPage() {
  const [script, setScript] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  const estimate = words / WPM;
  const target = Number(minutes) || 0;
  const diff = estimate - target;

  const start = () => {
    if (running) return;
    setRunning(true);
    setElapsed(0);
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    (window as any).__foxRehearse = () => {
      clearInterval(id);
      setRunning(false);
    };
  };
  const stop = () => (window as any).__foxRehearse?.();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Técnicas de apresentação</h1>
        <p className="text-muted-foreground">Monte o roteiro, ensaie no tempo certo e ouça a sua fala antes do dia.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {TIPS.map((t) => (
          <Card key={t.title} className="space-y-2 p-4">
            <div className="inline-flex rounded-xl bg-gradient-primary p-2">
              <t.icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="font-display font-semibold">{t.title}</div>
            <p className="text-sm text-muted-foreground">{t.body}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <Label>Tempo alvo (min)</Label>
            <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground">
            {words} palavras — leitura estimada em <span className="font-medium text-primary">{estimate.toFixed(1)} min</span>
            {target > 0 && words > 0 && (
              <> · {Math.abs(diff) < 0.4 ? "no tempo certo" : diff > 0 ? `corte ~${Math.round(diff * WPM)} palavras` : `cabem mais ~${Math.round(-diff * WPM)} palavras`}</>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Narrator getText={() => script} />
            {running ? (
              <Button variant="outline" onClick={stop}>Parar ensaio ({Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")})</Button>
            ) : (
              <Button onClick={start}>Ensaiar</Button>
            )}
          </div>
        </div>
        <div>
          <Label>Roteiro da fala</Label>
          <textarea
            rows={12}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Escreva aqui o que você vai falar, parágrafo por parágrafo."
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </Card>
    </div>
  );
}
