import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { stageConfig } from "./exams";

const examSchema = (withText: boolean) => ({
  type: "object",
  properties: {
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...(withText ? { text: { type: "string" } } : {}),
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "answer", "explanation"],
      },
    },
  },
  required: ["title", "questions"],
});

export const generateExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        kind: z.enum(["simulado", "prova"]),
        stage: z.string().min(1),
        discipline: z.string().min(1),
        subject: z.string().min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { callAI } = await import("./ai-call.server");
    const cfg = stageConfig(data.stage);
    const isSimulado = data.kind === "simulado";

    const out = await callAI(
      [
        {
          role: "system",
          content:
            "Você elabora avaliações escolares brasileiras (BNCC) justas, claras e alinhadas à etapa de ensino do aluno.",
        },
        {
          role: "user",
          content: `Etapa: ${cfg.label} | Disciplina: ${data.discipline} | Assunto: ${data.subject}\nNível de dificuldade: ${cfg.level} (escala 1 a 4, ajuste vocabulário e complexidade exatamente a esse nível).\n\nCrie ${isSimulado ? "um SIMULADO" : "uma PROVA"} com EXATAMENTE ${cfg.questions} questões de múltipla escolha (4 alternativas cada, índice da correta em "answer", explicação curta do porquê).${
            isSimulado
              ? ` Cada questão deve trazer em "text" um pequeno texto de apoio (2-4 linhas) relacionado à pergunta, com leitura no nível ${cfg.level}.`
              : " Não inclua textos de apoio; as perguntas devem cobrar diretamente o conteúdo."
          }`,
        },
      ],
      examSchema(isSimulado),
    );

    const questions = (out.questions ?? []).slice(0, cfg.questions);
    if (!questions.length) throw new Error("Não foi possível gerar a avaliação");
    return { title: out.title ?? `${isSimulado ? "Simulado" : "Prova"} de ${data.subject}`, questions, total: questions.length };
  });

export const submitExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        kind: z.enum(["simulado", "prova"]),
        subject: z.string().min(1),
        correct: z.number().min(0),
        total: z.number().min(1),
        answers: z.array(
          z.object({
            question: z.string(),
            user_answer: z.string().nullable(),
            correct_answer: z.string(),
            is_correct: z.boolean(),
            explanation: z.string().nullable(),
          }),
        ),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const score = Math.round((data.correct / data.total) * 1000) / 100; // 0..10

    const { error } = await context.supabase.from("exam_scores").insert({
      user_id: context.userId,
      kind: data.kind,
      subject: data.subject,
      score,
      max_score: 10,
    });
    if (error) throw new Error(error.message);

    if (data.answers.length) {
      await context.supabase
        .from("answers")
        .insert(data.answers.map((a) => ({ ...a, user_id: context.userId })));
    }

    const { data: prof } = await context.supabase.from("profiles").select("xp").eq("id", context.userId).maybeSingle();
    await context.supabase
      .from("profiles")
      .update({ xp: (prof?.xp ?? 0) + data.correct * 5 })
      .eq("id", context.userId);

    return { score, correct: data.correct, total: data.total };
  });
