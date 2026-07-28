import { Apostila } from "./Apostila";
import { Flashcards } from "./Flashcards";
import { QuestionsRunner } from "./QuestionsRunner";
import { Slides } from "./Slides";
import { Resumo } from "./Resumo";
import { MapaMental } from "./MapaMental";
import { ExplicacaoSimples } from "./ExplicacaoSimples";
import { Pratica } from "./Pratica";

export function MaterialViewer({ kind, content, materialId }: { kind: string; content: any; materialId: string }) {
  switch (kind) {
    case "apostila": return <Apostila c={content} />;
    case "flashcards": return <Flashcards c={content} />;
    case "questoes":
    case "prova":
    case "quiz":
    case "simulado":
      return <QuestionsRunner c={content} kind={kind} materialId={materialId} />;
    case "slides": return <Slides c={content} />;
    case "resumo": return <Resumo c={content} />;
    case "mapa_mental": return <MapaMental c={content} />;
    case "explicacao_simples": return <ExplicacaoSimples c={content} />;
    case "pratica": return <Pratica c={content} materialId={materialId} />;
    default:
      return <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm">{JSON.stringify(content, null, 2)}</pre>;
  }
}
