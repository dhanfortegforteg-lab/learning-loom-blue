import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const NEEDED_YEAR = "Conteúdos necessários";

const relatedSchema = {
  type: "object",
  properties: {
    contents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
      },
    },
  },
  required: ["contents"],
};

export const generateNeededContents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        topic: z.string().trim().min(2).max(160),
        subject: z.string().trim().max(80).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const label = data.subject ? `${data.subject} — ${data.topic}` : data.topic;

    const { data: existing } = await context.supabase
      .from("study_tracks")
      .select("id")
      .eq("user_id", context.userId)
      .eq("year_level", NEEDED_YEAR)
      .eq("subject", label)
      .maybeSingle();

    if (existing) {
      const { count } = await context.supabase
        .from("track_contents")
        .select("id", { count: "exact", head: true })
        .eq("track_id", existing.id);
      if ((count ?? 0) > 0) return { trackId: existing.id, created: false };
    }

    const { callAI } = await import("./ai-call.server");
    const res = await callAI(
      [
        {
          role: "system",
          content:
            "Você é um professor brasileiro que mapeia pré-requisitos. Dado um conteúdo, você lista os conteúdos que o aluno precisa entender ANTES ou JUNTO para compreender profundamente o porquê daquilo acontecer/funcionar.",
        },
        {
          role: "user",
          content: `Conteúdo estudado: "${data.topic}"${data.subject ? ` (matéria: ${data.subject})` : ""}.\n\nListe de 5 a 8 CONTEÚDOS NECESSÁRIOS para entender esse conteúdo por completo — causas, contextos, bases e estruturas que explicam por que aquilo ocorreu ou como funciona. Ordene do mais fundamental ao mais próximo do conteúdo estudado. Cada item: título curto e uma descrição de 1 frase explicando a ligação com "${data.topic}".`,
        },
      ],
      relatedSchema,
    );

    const contents: any[] = res.contents ?? [];
    if (!contents.length) throw new Error("Não foi possível gerar os conteúdos necessários");

    let trackId = existing?.id;
    if (!trackId) {
      const { data: track, error } = await context.supabase
        .from("study_tracks")
        .insert({ user_id: context.userId, year_level: NEEDED_YEAR, subject: label, position: 0 })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      trackId = track.id;
    }

    const rows = contents.map((c, i) => ({
      track_id: trackId!,
      user_id: context.userId,
      title: c.title,
      description: c.description ?? null,
      position: i,
      unlock_rule: "free",
    }));
    const { error: e2 } = await context.supabase.from("track_contents").insert(rows);
    if (e2) throw new Error(e2.message);

    return { trackId: trackId!, created: true };
  });
