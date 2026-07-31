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

const planSchema = {
  type: "object",
  properties: {
    subjects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" },
          contents: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, description: { type: "string" } },
              required: ["title", "description"],
            },
          },
        },
        required: ["subject", "contents"],
      },
    },
  },
  required: ["subjects"],
};

const teachSchema = {
  type: "object",
  properties: {
    apostila: {
      type: "object",
      properties: {
        title: { type: "string" },
        intro: { type: "string" },
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, body: { type: "string" }, highlight: { type: "string" } },
            required: ["title", "body"],
          },
        },
      },
      required: ["title", "blocks"],
    },
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
  },
  required: ["apostila", "explicacao"],
};

const evalSchema = {
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
    simulado: {
      type: "object",
      properties: {
        title: { type: "string" },
        questions: { type: "array", items: qItem(true) },
      },
      required: ["title", "questions"],
    },
  },
  required: ["pratica", "simulado"],
};

export const generateTrackPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ yearLevel: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const plan = await callAI(
      [
        {
          role: "system",
          content:
            "Você é um coordenador pedagógico brasileiro (BNCC). Monta a grade curricular anual de um aluno.",
        },
        {
          role: "user",
          content: `Liste TODAS as matérias do ano letivo "${data.yearLevel}" no Brasil. Para cada matéria, liste de 6 a 10 conteúdos que o aluno precisa estudar nesse ano, em ordem didática de aprendizado (do mais básico ao mais avançado). Cada conteúdo com título curto e uma descrição de 1 frase.`,
        },
      ],
      planSchema,
    );

    const subjects: any[] = plan.subjects ?? [];
    if (!subjects.length) throw new Error("Não foi possível gerar a grade");

    // limpa trilhas anteriores desse ano letivo
    await context.supabase.from("study_tracks").delete().eq("user_id", context.userId).eq("year_level", data.yearLevel);

    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      const { data: track, error } = await context.supabase
        .from("study_tracks")
        .insert({ user_id: context.userId, year_level: data.yearLevel, subject: s.subject, position: i })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const rows = (s.contents ?? []).map((c: any, ci: number) => ({
        track_id: track.id,
        user_id: context.userId,
        title: c.title,
        description: c.description ?? null,
        position: ci,
      }));
      if (rows.length) {
        const { error: e2 } = await context.supabase.from("track_contents").insert(rows);
        if (e2) throw new Error(e2.message);
      }
    }
    return { subjects: subjects.length };
  });

export const generateContentSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ contentId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { callAI } = await import("./ai-call.server");
    const { data: content, error } = await context.supabase
      .from("track_contents")
      .select("id, title, description, sessions, track_id")
      .eq("id", data.contentId)
      .single();
    if (error || !content) throw new Error("Conteúdo não encontrado");
    if (content.sessions) return { sessions: content.sessions };

    const { data: track } = await context.supabase
      .from("study_tracks")
      .select("subject, year_level")
      .eq("id", content.track_id)
      .single();

    const ctx = `Matéria: ${track?.subject ?? ""} | Ano letivo: ${track?.year_level ?? ""} | Conteúdo: ${content.title} — ${content.description ?? ""}`;

    const teach = await callAI(
      [
        { role: "system", content: "Você é um professor brasileiro excelente em ensinar do zero." },
        {
          role: "user",
          content: `${ctx}\n\nProduza duas sessões de estudo:\n1) APOSTILA: explicação completa e compreensível, com introdução e 4 a 6 blocos (título, 2-3 parágrafos, destaque curto).\n2) EXPLICAÇÃO: o mesmo conteúdo explicado de forma mais fácil e direta, com resumo inicial e 4 a 5 pontos curtos (título + 1 parágrafo curto). Não infantilize, apenas simplifique.`,
        },
      ],
      teachSchema,
    );

    const evalPart = await callAI(
      [
        { role: "system", content: "Você elabora práticas e simulados escolares claros e justos." },
        {
          role: "user",
          content: `${ctx}\n\nCom base nas explicações do conteúdo, produza:\n1) PRÁTICA: uma teoria em formato de resumo prático (mais simples e claro que a apostila), seguida de EXATAMENTE 4 questões de múltipla escolha (4 alternativas, índice da correta em "answer", explicação).\n2) SIMULADO: EXATAMENTE 10 questões de múltipla escolha; cada questão traz em "text" um pequeno texto de apoio (2-4 linhas, leitura nível 2) relacionado à pergunta, 4 alternativas, índice correto e explicação.`,
        },
      ],
      evalSchema,
    );

    const sessions = {
      apostila: teach.apostila,
      explicacao: teach.explicacao,
      pratica: { ...evalPart.pratica, questions: (evalPart.pratica?.questions ?? []).slice(0, 4) },
      simulado: { ...evalPart.simulado, questions: (evalPart.simulado?.questions ?? []).slice(0, 10) },
    };

    await context.supabase.from("track_contents").update({ sessions }).eq("id", content.id);
    return { sessions };
  });

export const setContentGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        contentId: z.string().uuid(),
        applyToTrack: z.boolean().optional(),
        unlockRule: z.enum(["score", "attempts", "both", "any", "free"]),
        minScore: z.number().min(0).max(10),
        minAttempts: z.number().int().min(1).max(20),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patch = { unlock_rule: data.unlockRule, min_score: data.minScore, min_attempts: data.minAttempts };
    if (data.applyToTrack) {
      const { data: c } = await context.supabase
        .from("track_contents")
        .select("track_id")
        .eq("id", data.contentId)
        .single();
      if (!c) throw new Error("Conteúdo não encontrado");
      const { error } = await context.supabase
        .from("track_contents")
        .update(patch)
        .eq("track_id", c.track_id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, scope: "track" as const };
    }
    const { error } = await context.supabase
      .from("track_contents")
      .update(patch)
      .eq("id", data.contentId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, scope: "content" as const };
  });

export const submitContentResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ contentId: z.string().uuid(), correct: z.number(), total: z.number().min(1) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { goalMet } = await import("./unlock");
    const score = Math.round((data.correct / data.total) * 100) / 10; // 0..10
    const { data: current } = await context.supabase
      .from("track_contents")
      .select("score, attempts, min_score, min_attempts, unlock_rule")
      .eq("id", data.contentId)
      .single();
    const best = Math.max(Number(current?.score ?? 0), score);
    const attempts = Number(current?.attempts ?? 0) + 1;
    const completed = goalMet({ ...current, score: best, attempts });
    await context.supabase
      .from("track_contents")
      .update({ score: best, attempts, completed })
      .eq("id", data.contentId);

    const { data: prof } = await context.supabase.from("profiles").select("xp").eq("id", context.userId).maybeSingle();
    await context.supabase
      .from("profiles")
      .update({ xp: (prof?.xp ?? 0) + data.correct * 5 })
      .eq("id", context.userId);

    return { score, attempts, unlocked: completed };
  });

