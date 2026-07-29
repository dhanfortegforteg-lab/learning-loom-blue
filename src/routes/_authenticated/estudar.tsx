import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateMaterial } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, HelpCircle, ListChecks, Presentation, FileText, Brain, Baby, Layers, ScrollText, Zap, ClipboardCheck, PenSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estudar")({
  head: () => ({ meta: [{ title: "Estudar — Urstudy" }, { name: "description", content: "Gere apostilas, flashcards, mapas mentais e mais com IA." }] }),
  component: EstudarPage,
});

const MATERIALS = [
  { kind: "apostila", label: "Apostila", desc: "Blocos temáticos", icon: BookOpen },
  { kind: "flashcards", label: "Flashcards", desc: "Cartões que viram", icon: Layers },
  { kind: "questoes", label: "Questões", desc: "Múltipla escolha", icon: ListChecks },
  { kind: "slides", label: "Slides", desc: "Deck para revisar", icon: Presentation },
  { kind: "resumo", label: "Resumo", desc: "Informal e direto", icon: FileText },
  { kind: "mapa_mental", label: "Mapa Mental", desc: "Visual em blocos", icon: Brain },
  { kind: "explicacao_simples", label: "Explicação Simples", desc: "Como para criança", icon: Baby },
  { kind: "pratica", label: "Prática", desc: "5 seções teoria+questões", icon: ClipboardCheck },
  { kind: "prova", label: "Prova", desc: "15+ questões formais", icon: ScrollText },
  { kind: "quiz", label: "Quiz", desc: "Teoria desafiadora", icon: Zap },
  { kind: "simulado", label: "Simulado", desc: "Diário — nota /500", icon: Sparkles },
] as const;

const STAGES = ["Fundamental I", "Fundamental II", "Ensino Médio", "Vestibular/ENEM", "Superior"];
const DISCIPLINES = ["Matemática", "Português", "Redação", "História", "Geografia", "Biologia", "Química", "Física", "Inglês", "Filosofia", "Sociologia", "Programação", "Outra"];
const DIFFICULTIES = ["Fácil — introdutório", "Médio — intermediário", "Difícil — aprofundado"];
const SIZES = ["Pequeno — curto e direto", "Médio — equilibrado", "Grande — completo"];

function EstudarPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]);
  const [size, setSize] = useState(SIZES[0]);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);
  const gen = useServerFn(generateMaterial);

  const generate = async (kind: string) => {
    if (!subject.trim()) return toast.error("Digite o assunto");
    setLoadingKind(kind);
    try {
      const res = await gen({ data: { kind: kind as any, stage, discipline, subject, difficulty, size } });
      toast.success("Material gerado!");
      if (res.id) navigate({ to: "/material/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Falha na geração");
    } finally {
      setLoadingKind(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">📖 Central de Estudos</h1>
        <p className="text-muted-foreground">Digite o assunto e gere materiais ilimitados com IA ⚡</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Etapa</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Disciplina</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{DISCIPLINES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assunto (livre)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Equações do 2º grau" />
          </div>
          <div>
            <Label>Dificuldade</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIFFICULTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tamanho do texto</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">Gerar Material ✨</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MATERIALS.map((m) => {
            const isLoading = loadingKind === m.kind;
            return (
              <button
                key={m.kind}
                onClick={() => generate(m.kind)}
                disabled={!!loadingKind}
                className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card/90 via-card/70 to-primary/10 p-5 text-left shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[var(--shadow-glow)] disabled:opacity-50"
              >
                <span className="pointer-events-none absolute -inset-1 bg-gradient-primary opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow to-transparent opacity-60" />
                <div className="relative">
                  <div className="mb-3 inline-flex rounded-xl bg-gradient-primary p-2 shadow-[var(--shadow-glow)] transition group-hover:scale-110">
                    <m.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="font-display font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                  {isLoading && <div className="mt-2 text-xs font-medium text-primary">Gerando...</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
