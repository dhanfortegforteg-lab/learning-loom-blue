export type ExamStage = "Fundamental I" | "Fundamental II" | "Ensino Médio" | "Vestibular/ENEM";

export const EXAM_STAGES: {
  value: ExamStage;
  label: string;
  questions: number;
  level: number;
  disciplines: string[];
}[] = [
  {
    value: "Fundamental I",
    label: "1º Ensino Fundamental",
    questions: 10,
    level: 2,
    disciplines: ["Matemática", "Português", "Ciências", "História", "Geografia", "Arte", "Inglês"],
  },
  {
    value: "Fundamental II",
    label: "2º Ensino Fundamental",
    questions: 15,
    level: 2.5,
    disciplines: ["Matemática", "Português", "Redação", "Ciências", "História", "Geografia", "Arte", "Inglês", "Educação Física"],
  },
  {
    value: "Ensino Médio",
    label: "Ensino Médio",
    questions: 20,
    level: 3,
    disciplines: ["Matemática", "Português", "Literatura", "Redação", "Biologia", "Química", "Física", "História", "Geografia", "Filosofia", "Sociologia", "Inglês"],
  },
  {
    value: "Vestibular/ENEM",
    label: "Vestibular / ENEM",
    questions: 30,
    level: 3.5,
    disciplines: ["Matemática", "Português", "Literatura", "Redação", "Biologia", "Química", "Física", "História", "Geografia", "Filosofia", "Sociologia", "Inglês", "Espanhol", "Atualidades"],
  },
];

export function stageConfig(stage: string) {
  return EXAM_STAGES.find((s) => s.value === stage) ?? EXAM_STAGES[2];
}

export const EXAM_KINDS = [
  { value: "simulado", label: "Simulado", hint: "Textos de apoio + questões, no formato de prova externa." },
  { value: "prova", label: "Prova", hint: "Avaliação direta do conteúdo estudado, sem textos de apoio." },
] as const;
