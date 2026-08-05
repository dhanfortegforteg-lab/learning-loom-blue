import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const qItem = (withText: boolean) => ({
  type: "object",
  properties: {
    ...(withText ? { text: { type: "string" } } : {}),
    question: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    answer: { type: "integer" },
    explanation: { type: "string" },
  },
  required: ["question", "options", "answer", "explanation"],
});

const apostilaSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    simple: { type: "string" },
    intro: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, body: { type: "string" }, highlight: { type: "string" } },
        required: ["title", "body"],
      },
    },
    theories: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, body: { type: "string" } },
        required: ["title", "body"],
      },
    },
  },
  required: ["title", "simple", "blocks", "theories"],
};

const teachSchema = {
  type: "object",
  properties: {
    apostila: apostilaSchema,
    resumo: {
      type: "object",
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: { heading: { type: "string" }, body: { type: "string" }, example: { type: "string" } },
            required: ["heading", "body"],
          },
        },
      },
      required: ["title", "sections"],
    },
  },
  required: ["apostila", "resumo"],
};

const practiceSchema = {
  type: "object",
  properties: {
    pratica: {
      type: "object",
      properties: {
        title: { type: "string" },
        theory: { type: "string" },
        questions: { type: "array", items: qItem(false) },
      },
      required: ["title", "theory", "questions"],
    },
    questoes: {
      type: "object",
      properties: {
        title: { type: "string" },
        guide: { type: "string" },
        questions: { type: "array", items: qItem(false) },
      },
      required: ["title", "guide", "questions"],
    },
  },
  required: ["pratica", "questoes"],
};

const provaSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    essayPrompt: { type: "string" },
    questions: { type: "array", items: qItem(true) },
  },
  required: ["title", "essayPrompt", "questions"],
};

const reviewTeachSchema = {
  type: "object",
  properties: {
    apostila: apostilaSchema,
    explicacao: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        points: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, body: { type: "string" } },
            required: ["title", "body"],
          },
        },
      },
      required: ["title", "summary", "points"],
    },
    pratica: {
      type: "object",
      properties: {
        title: { type: "string" },
        theory: { type: "string" },
        questions: { type: "array", items: qItem(false) },
      },
      required: ["title", "theory", "questions"],
    },
  },
  required: ["apostila", "explicacao", "pratica"],
};

const weekSchema = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          focus: { type: "string" },
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: { front: { type: "string" }, back: { type: "string" } },
              required: ["front", "back"],
            },
          },
          miniText: {
            type: "object",
            properties: { title: { type: "string" }, body: { type: "string" } },
            required: ["title", "body"],
          },
          writingPrompt: { type: "string" },
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: { term: { type: "string" }, meaning: { type: "string" } },
              required: ["term", "meaning"],
            },
          },
          miniSimulado: { type: "array", items: qItem(false) },
        },
        required: ["day", "focus", "flashcards", "miniText", "writingPrompt", "keywords", "miniSimulado"],
      },
    },
  },
  required: ["days"],
};

export const createLateStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        content: z.string().trim().min(2).max(160),
        subject: z.string().trim().max(80).optional(),
        recallPct: z.number().int().min(0).max(100),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const mode = data.recallPct >= 75 ? "revisao" : "estudo";
    const { data: row, error } = await context.supabase
      .from("late_studies")
      .insert({
        user_id: context.userId,
        content: data.content,
        subject: data.subject ?? null,
        recall_pct: data.recallPct,
        mode,
        review_started_at: mode === "revisao" ? new Date().toISOString().slice(0, 10) : null,
      })
      .select("id, mode")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const generateLatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), provaQuestions: z.number().int().min(15).max(30).optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const { data: row, error } = await context.supabase
      .from("late_studies")
      .select("id, content, subject, recall_pct, mode, plan")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Estudo atrasado não encontrado");
    if (row.plan) return { plan: row.plan, mode: row.mode };

    const ctx = `Conteúdo atrasado: "${row.content}"${row.subject ? ` | Matéria: ${row.subject}` : ""} | Lembrança do aluno: ${row.recall_pct}%`;

    const apostilaSpec = `APOSTILA: primeiro "simple" = explicação simples do conteúdo em 1-2 parágrafos; depois "blocks" = explicação completa em 4 a 6 blocos (título, 2-3 parágrafos, destaque curto) e "theories" = 2 a 4 teorias/fundamentos que sustentam o conteúdo (título + explicação).`;

    let plan: any;

    if (row.mode === "estudo") {
      const teach = await callAI(
        [
          { role: "system", content: "Você é um professor brasileiro que recupera conteúdos mal aprendidos, do zero." },
          {
            role: "user",
            content: `${ctx}\n\nProduza:\n1) ${apostilaSpec}\n2) RESUMO: explicação em nível de dificuldade de leitura 2, mais clara e informal (fala próxima do aluno), em 4 a 6 seções com "heading", "body" e "example".`,
          },
        ],
        teachSchema,
      );

      const practice = await callAI(
        [
          { role: "system", content: "Você elabora práticas e questões escolares justas e progressivas." },
          {
            role: "user",
            content: `${ctx}\n\nCom base na apostila e no resumo já produzidos, gere:\n1) PRÁTICA: "theory" curta (nível de leitura 3, 1-2 parágrafos) + EXATAMENTE 5 questões de múltipla escolha FÁCEIS que se refiram ao que foi explicado na apostila, no resumo e nessa teoria.\n2) QUESTÕES: um "guide" (texto guia de apoio, nível de leitura 3, 3-5 linhas) + EXATAMENTE 3 questões de múltipla escolha sobre o conteúdo.\nSempre 4 alternativas, índice correto em "answer" e explicação.`,
          },
        ],
        practiceSchema,
      );

      const n = data.provaQuestions ?? 15;
      const prova = await callAI(
        [
          { role: "system", content: "Você elabora provas de recuperação exigentes, com textos de apoio curtos." },
          {
            role: "user",
            content: `${ctx}\n\nGere a PROVA de recuperação:\n- "essayPrompt": um tema de redação/escrita sobre o conteúdo; o aluno deverá escrever demonstrando domínio do TEMA.\n- EXATAMENTE ${n} questões de múltipla escolha difíceis; cada uma com "text" = texto guia de no MÁXIMO 3 linhas, nível de dificuldade de leitura 4, relacionado à pergunta; 4 alternativas, índice correto e explicação.`,
          },
        ],
        provaSchema,
      );

      plan = {
        apostila: teach.apostila,
        resumo: teach.resumo,
        pratica: { ...practice.pratica, questions: (practice.pratica?.questions ?? []).slice(0, 5) },
        questoes: { ...practice.questoes, questions: (practice.questoes?.questions ?? []).slice(0, 3) },
        prova: { ...prova, questions: (prova.questions ?? []).slice(0, n) },
      };
    } else {
      const teach = await callAI(
        [
          { role: "system", content: "Você é um professor que faz revisões rápidas e eficientes de conteúdos já vistos." },
          {
            role: "user",
            content: `${ctx}\n\nO aluno já lembra bem do conteúdo. Produza uma revisão + mini estudo + mini prática:\n1) ${apostilaSpec}\n2) EXPLICAÇÃO: clara e informal, nível de dificuldade de leitura 1, com "summary" e 4 a 5 pontos curtos.\n3) PRÁTICA: "theory" mais completa (nível de leitura 2, 3-4 parágrafos) + EXATAMENTE 10 questões de múltipla escolha nível 2, baseadas nas explicações anteriores. 4 alternativas, índice correto e explicação.`,
          },
        ],
        reviewTeachSchema,
      );

      const week = await callAI(
        [
          { role: "system", content: "Você monta planos de revisão semanal com repetição espaçada." },
          {
            role: "user",
            content: `${ctx}\n\nMonte uma revisão de EXATAMENTE 7 dias (day de 1 a 7). Cada dia com:\n- "focus": foco do dia em 1 frase;\n- "flashcards": 5 flashcards (front/back);\n- "miniText": mini texto de estudo (título + 1 parágrafo curto);\n- "writingPrompt": proposta de redação/escrita curta sobre o conteúdo;\n- "keywords": 5 palavras-chave com significado curto;\n- "miniSimulado": 4 questões de múltipla escolha nível 1 (fáceis), com 4 alternativas, índice correto e explicação.`,
          },
        ],
        weekSchema,
      );

      plan = {
        apostila: teach.apostila,
        explicacao: teach.explicacao,
        pratica: { ...teach.pratica, questions: (teach.pratica?.questions ?? []).slice(0, 10) },
        week: (week.days ?? []).slice(0, 7),
      };
    }

    await context.supabase.from("late_studies").update({ plan }).eq("id", row.id);
    return { plan, mode: row.mode };
  });

export const evaluateLateEssay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), theme: z.string().min(1), text: z.string().trim().min(20).max(8000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const res = await callAI(
      [
        {
          role: "system",
          content:
            "Você avalia redações de recuperação. NÃO avalie gramática, vocabulário ou linguagem: avalie APENAS se o texto trata corretamente do TEMA e demonstra domínio do assunto. Nota de 0 a 35.",
        },
        {
          role: "user",
          content: `Tema: "${data.theme}"\n\nTexto do aluno:\n"""${data.text}"""\n\nDê "score" de 0 a 35 (fidelidade e domínio do tema) e "feedback" com 3 a 5 pontos objetivos sobre o quanto o aluno acertou o tema.`,
        },
      ],
      {
        type: "object",
        properties: { score: { type: "number" }, feedback: { type: "string" } },
        required: ["score", "feedback"],
      },
    );
    const score = Math.max(0, Math.min(35, Number(res.score) || 0));
    await context.supabase
      .from("late_studies")
      .update({ essay_score: score, essay_feedback: res.feedback ?? null })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { score, feedback: res.feedback as string };
  });

export const saveLateProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        progress: z.any().optional(),
        reviewProgress: z.any().optional(),
        score: z.number().min(0).max(10).optional(),
        percent: z.number().int().min(0).max(100).optional(),
        completed: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      progress?: unknown;
      review_progress?: unknown;
      score?: number;
      percent?: number;
      completed?: boolean;
    } = {};
    if (data.progress !== undefined) patch.progress = data.progress;
    if (data.reviewProgress !== undefined) patch.review_progress = data.reviewProgress;
    if (data.score !== undefined) patch.score = data.score;
    if (data.percent !== undefined) patch.percent = data.percent;
    if (data.completed !== undefined) patch.completed = data.completed;
    const { error } = await context.supabase
      .from("late_studies")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
