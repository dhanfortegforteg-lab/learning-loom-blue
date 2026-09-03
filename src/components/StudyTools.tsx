import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { explainSelection } from "@/lib/extras.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Volume2, Pause, Play, Square, BookA } from "lucide-react";
import { toast } from "sonner";

/** Narrador: lê textos com a Web Speech API (voz, velocidade, volume, pausa/retomada). */
export function Narrator({ getText, className }: { getText: () => string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [open, setOpen] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const speak = () => {
    const text = (getText() ?? "").trim();
    if (!text) return toast.error("Nada para narrar");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 20000));
    u.lang = "pt-BR";
    u.rate = rate;
    u.volume = volume;
    u.onend = () => { setSpeaking(false); setPaused(false); };
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
  };

  const toggle = () => {
    if (!speaking) return speak();
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <Volume2 className="mr-1.5 h-4 w-4" /> Narrador
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Narrador</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="flex gap-2">
              <Button onClick={toggle} className="flex-1">
                {!speaking ? <><Play className="mr-1.5 h-4 w-4" /> Ler</> : paused ? <><Play className="mr-1.5 h-4 w-4" /> Retomar</> : <><Pause className="mr-1.5 h-4 w-4" /> Pausar</>}
              </Button>
              <Button variant="outline" onClick={stop}><Square className="h-4 w-4" /></Button>
            </div>
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Velocidade: {rate.toFixed(1)}x</div>
              <Slider value={[rate]} min={0.5} max={2} step={0.1} onValueChange={(v) => setRate(v[0])} />
            </div>
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Volume: {Math.round(volume * 100)}%</div>
              <Slider value={[volume]} min={0} max={1} step={0.05} onValueChange={(v) => setVolume(v[0])} />
            </div>
            <p className="text-xs text-muted-foreground">
              A narração continua do ponto pausado. Serve como acessibilidade para textos, questões e feedbacks.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Vocabulário: seleciona uma palavra/frase/parágrafo e pede explicação simplificada. */
export function VocabularyButton({ subject, className }: { subject?: string | null; className?: string }) {
  const run = useServerFn(explainSelection);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const sel = (typeof window !== "undefined" ? window.getSelection()?.toString() : "")?.trim() ?? "";
    if (!sel) return toast.error("Selecione uma palavra, frase ou parágrafo do texto primeiro");
    setSelection(sel);
    setAnswer("");
    setOpen(true);
    setBusy(true);
    try {
      const res = await run({ data: { selection: sel, ...(subject ? { subject } : {}) } });
      setAnswer(res.answer);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao explicar o trecho");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={className} onClick={start}>
        <BookA className="mr-1.5 h-4 w-4" /> Vocabulário
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vocabulário</DialogTitle></DialogHeader>
          <Card className="bg-muted/40 p-3 text-sm italic">"{selection}"</Card>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {busy ? "Analisando o trecho..." : answer}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Barra padrão de apoio à leitura: narrador + vocabulário. */
export function StudyTools({ subject, getText, className }: { subject?: string | null; getText: () => string; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Narrator getText={getText} />
      <VocabularyButton subject={subject} />
    </div>
  );
}
