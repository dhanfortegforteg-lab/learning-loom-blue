import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const qItems = (n: number) => ({
  type: "array",
  minItems: n,
  items: {
    type: "object",
    properties: {
      question: { type: "string" },
      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
      answer: { type: "integer", minimum: 0, maximum: 3 },
      explanation: { type: "string" },
    },
    required: ["question", "options", "answer"],
  },
});

/* ------------------------------------------------ Plano de estudos próprio */

const planSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    intro: { type: "string" },
    sections: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        properties: { title: { type: "string" }, body: { type: "string" }, example: { type: "string" } },
        required: ["title", "body"],
      },
    },
    keywords: { type: "array", minItems: 8, items: { type: "string" } },
    questions: qItems(5),
  },
  required: ["title", "intro", "sections"],
};

export const generateCustomPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      request: z.string().trim().min(5).max(600),
      subject: z.string().trim().min(2).max(120),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const content = await callAI(
      [
        { role: "system", content: "Você monta materiais de estudo 100% personalizados conforme o pedido do aluno." },
        { role: "user", content: `Assunto: ${data.subject}\nPedido do aluno: ${data.request}` },
      ],
      planSchema,
    );
    const { data: row, error } = await context.supabase
      .from("custom_plans")
      .insert({
        user_id: context.userId,
        request: data.request,
        subject: data.subject,
        title: content?.title ?? data.subject,
        content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, content };
  });

/* ------------------------------------------------ Consolidação dos erros */

const errorSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    review: { type: "string" },
    steps: { type: "array", minItems: 4, items: { type: "string" } },
    cards: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        properties: { front: { type: "string" }, back: { type: "string" } },
        required: ["front", "back"],
      },
    },
    questions: qItems(3),
  },
  required: ["title", "review", "questions"],
};

export const generateErrorReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ topic: z.string().trim().min(2).max(160) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const content = await callAI(
      [
        { role: "system", content: "Você corrige erros do aluno com explicação passo a passo, flashcards e 3 perguntas de checagem." },
        { role: "user", content: `Assunto: ${data.topic}\nMonte uma revisão rápida corretiva sobre esse tema.` },
      ],
      errorSchema,
    );
    const { data: row, error } = await context.supabase
      .from("error_reviews")
      .insert({ user_id: context.userId, topic: data.topic, content })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, content };
  });

/* ------------------------------------------------ Aprendizagem estrangeira */

const languageSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    explanation: { type: "string" },
    sections: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: { title: { type: "string" }, body: { type: "string" }, example: { type: "string" } },
        required: ["title", "body"],
      },
    },
    vocabulary: {
      type: "array",
      minItems: 8,
      items: {
        type: "object",
        properties: { term: { type: "string" }, definition: { type: "string" } },
        required: ["term", "definition"],
      },
    },
    keywords: { type: "array", minItems: 6, items: { type: "string" } },
    questions: qItems(6),
  },
  required: ["title", "explanation", "sections", "questions"],
};

export const generateLanguageLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      language: z.string().trim().min(2).max(40),
      stage: z.string().trim().max(60).optional(),
      topic: z.string().trim().min(2).max(160),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const content = await callAI(
      [
        { role: "system", content: "Você ensina idiomas com teoria clara, vocabulário e exercícios interativos." },
        {
          role: "user",
          content: `Assunto: ${data.topic} (${data.language})\nEtapa: ${data.stage ?? "livre"}\nMonte uma aula de idioma completa.`,
        },
      ],
      languageSchema,
    );
    const { data: row, error } = await context.supabase
      .from("language_lessons")
      .insert({
        user_id: context.userId,
        language: data.language,
        stage: data.stage ?? null,
        topic: data.topic,
        content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, content };
  });

/* ------------------------------------------------ Palavras-chave */

export const suggestKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ subject: z.string().trim().min(2).max(160) }).parse(raw))
  .handler(async ({ data }) => {
    const { callAI } = await import("./ai-call.server");
    const res = await callAI(
      [
        { role: "system", content: "Você extrai palavras-chave e o significado de cada uma." },
        { role: "user", content: `Assunto: ${data.subject}\nListe as palavras-chave essenciais do tema.` },
      ],
      {
        type: "object",
        properties: {
          words: {
            type: "array",
            minItems: 10,
            items: {
              type: "object",
              properties: { term: { type: "string" }, definition: { type: "string" } },
              required: ["term", "definition"],
            },
          },
        },
        required: ["words"],
      },
    );
    return { words: (res?.words ?? []) as { term: string; definition: string }[] };
  });

/* ------------------------------------------------ Vocabulário (seleção) */

export const explainSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      selection: z.string().trim().min(2).max(1200),
      subject: z.string().trim().max(160).optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { callAI } = await import("./ai-call.server");
    const res = await callAI(
      [
        { role: "system", content: "Você explica trechos de texto de forma simples e resumida." },
        {
          role: "user",
          content: `Assunto: ${data.subject ?? data.selection.slice(0, 80)}\nExplique de forma simples o trecho: "${data.selection.slice(0, 300)}"`,
        },
      ],
      { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] },
    );
    return { answer: String(res?.answer ?? "") };
  });
