import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function callAI(messages: any[], schema?: any): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const body: any = { model: MODEL, messages };
  if (schema) {
    body.tools = [{ type: "function", function: { name: "output", description: "Return the requested content", parameters: schema } }];
    body.tool_choice = { type: "function", function: { name: "output" } };
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Muitas requisições — tente novamente em instantes");
    if (res.status === 402) throw new Error("Créditos de IA esgotados — adicione créditos na sua workspace");
    throw new Error(`Falha na IA: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (msg?.tool_calls?.[0]) {
    return JSON.parse(msg.tool_calls[0].function.arguments);
  }
  return { text: msg?.content ?? "" };
}

const InputSchema = z.object({
  kind: z.enum([
    "apostila", "flashcards", "questoes", "slides", "resumo", "mapa_mental",
    "explicacao_simples", "pratica", "prova", "quiz", "simulado", "escrita_avaliacao",
    "falhas", "duvida",
  ]),
  stage: z.string().optional(),
  discipline: z.string().optional(),
  subject: z.string().min(1),
  difficulty: z.string().optional(),
  size: z.string().optional(),
  extra: z.any().optional(),
});

function promptFor(kind: string, input: z.infer<typeof InputSchema>) {
  const ctx = `Etapa: ${input.stage ?? "livre"} | Disciplina: ${input.discipline ?? "livre"} | Assunto: ${input.subject} | Dificuldade: ${input.difficulty ?? "média"} | Tamanho: ${input.size ?? "médio"}`;
  const bases: Record<string, { sys: string; user: string; schema: any }> = {
    apostila: {
      sys: "Você é um professor experiente. Escreva apostilas claras, organizadas em blocos, com exemplos.",
      user: `Crie uma apostila sobre "${input.subject}". ${ctx}. Divida em 4 a 7 blocos temáticos com título, corpo explicativo (2-4 parágrafos) e um "destaque" curto.`,
      schema: { type: "object", properties: { title: { type: "string" }, intro: { type: "string" }, blocks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, highlight: { type: "string" } }, required: ["title", "body"] } } }, required: ["title", "blocks"] },
    },
    flashcards: {
      sys: "Você cria flashcards claros e de alto valor pedagógico.",
      user: `Gere 12 flashcards sobre "${input.subject}". ${ctx}. Cada um com pergunta curta e resposta objetiva.`,
      schema: { type: "object", properties: { title: { type: "string" }, cards: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front", "back"] } } }, required: ["title", "cards"] },
    },
    questoes: {
      sys: "Você cria questões de múltipla escolha desafiadoras e justas.",
      user: `Gere 10 questões objetivas sobre "${input.subject}". ${ctx}. Cada uma com 4 alternativas, 1 correta e explicação curta.`,
      schema: qSchema(10),
    },
    slides: {
      sys: "Você cria decks de apresentação claros e visuais.",
      user: `Crie 8 slides sobre "${input.subject}". ${ctx}. Cada slide: título, 3-5 bullets curtos, e uma sugestão visual (frase para descrever imagem).`,
      schema: { type: "object", properties: { title: { type: "string" }, slides: { type: "array", items: { type: "object", properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, visual: { type: "string" } }, required: ["title", "bullets"] } } }, required: ["title", "slides"] },
    },
    resumo: {
      sys: "Você escreve resumos informais, com exemplos do dia a dia, sem perder a precisão.",
      user: `Escreva um resumo informal e amigável sobre "${input.subject}". ${ctx}. Use 4-6 seções curtas com exemplos concretos.`,
      schema: { type: "object", properties: { title: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, body: { type: "string" }, example: { type: "string" } }, required: ["heading", "body"] } } }, required: ["title", "sections"] },
    },
    mapa_mental: {
      sys: "Você organiza conteúdos em mapas mentais claros.",
      user: `Crie um mapa mental para "${input.subject}". ${ctx}. Tema central + 5-6 ramos, cada um com 3-4 sub-ideias.`,
      schema: { type: "object", properties: { center: { type: "string" }, branches: { type: "array", items: { type: "object", properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } }, required: ["title", "items"] } } }, required: ["center", "branches"] },
    },
    explicacao_simples: {
      sys: "Você é um professor didático e formal. Explica com linguagem correta, clara e bem estruturada, no nível de compreensão de uma criança de 10 anos: frases organizadas, vocabulário simples porém formal, sem gírias e sem infantilização exagerada.",
      user: `Explique "${input.subject}" de forma clara, formal e bem organizada, para um estudante de cerca de 10 anos. ${ctx}.
Estruture assim:
- "intro": 1 parágrafo apresentando o assunto e por que ele é importante.
- "sections": 3 a 5 seções, cada uma com "title", "body" (2 parágrafos claros e formais) e "example" (exemplo concreto do cotidiano).
- "keyTerms": 3 a 6 termos essenciais com "term" e "definition" curta e precisa.
- "analogies": 2 a 4 comparações do dia a dia que facilitem a compreensão.
- "summary": conclusão em 3 a 5 frases retomando as ideias centrais.
Não use emojis nem linguagem de bebê.`,
      schema: {
        type: "object", properties: {
          title: { type: "string" },
          intro: { type: "string" },
          sections: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, example: { type: "string" } }, required: ["title", "body"] } },
          keyTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } }, required: ["term", "definition"] } },
          analogies: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        }, required: ["title", "intro", "sections", "summary"],
      },
    },
    pratica: {
      sys: "Você monta prática guiada: 5 seções, cada uma com teoria curta + 2 perguntas objetivas.",
      user: `Monte prática guiada sobre "${input.subject}" com 5 seções. Cada seção: teoria (1-2 parágrafos) + 2 perguntas de múltipla escolha (4 alternativas, 1 correta, explicação).`,
      schema: {
        type: "object", properties: {
          title: { type: "string" },
          sections: {
            type: "array", items: {
              type: "object", properties: {
                title: { type: "string" },
                theory: { type: "string" },
                questions: {
                  type: "array", items: {
                    type: "object", properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      answer: { type: "integer" },
                      explanation: { type: "string" },
                    }, required: ["question", "options", "answer"],
                  },
                },
              }, required: ["title", "theory", "questions"],
            },
          },
        }, required: ["title", "sections"],
      },
    },
    prova: {
      sys: "Você elabora provas formais, textos moderados a difíceis, 15+ questões objetivas.",
      user: `Elabore uma prova formal sobre "${input.subject}" com 15 questões objetivas. ${ctx}. Linguagem formal, dificuldade média-alta.`,
      schema: qSchema(15),
    },
    quiz: {
      sys: "Você cria quizzes teóricos desafiadores.",
      user: `Gere um quiz com 12 questões teóricas difíceis sobre "${input.subject}". ${ctx}. 4 alternativas, 1 correta, explicação.`,
      schema: qSchema(12),
    },
    simulado: {
      sys: "Você cria simulados diários no estilo ENEM, linguagem formal, dificuldade média.",
      user: `Crie um simulado diário com 20 questões objetivas sobre "${input.subject}". ${ctx}. Linguagem formal, dificuldade média.`,
      schema: qSchema(20),
    },
    escrita_avaliacao: {
      sys: "Você é avaliador de redações. Devolve nota 0-100 e feedback construtivo.",
      user: `Avalie a redação abaixo sobre "${input.subject}" (disciplina: ${input.discipline ?? "geral"}). Dê nota 0-100 e feedback claro em 3-5 pontos.\n\nRedação:\n"""${input.extra?.text ?? ""}"""`,
      schema: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, improvements: { type: "array", items: { type: "string" } } }, required: ["score", "feedback"] },
    },
    falhas: {
      sys: "Você corrige e explica erros de forma didática.",
      user: `Baseado nos erros abaixo, gere revisão focada com explicação corretiva e 5 questões novas para fixar.\n\nErros:\n${JSON.stringify(input.extra?.mistakes ?? []).slice(0, 3000)}`,
      schema: {
        type: "object", properties: {
          title: { type: "string" },
          review: { type: "string" },
          tips: { type: "array", items: { type: "string" } },
          questions: qSchema(5).properties.questions,
        }, required: ["title", "review", "questions"],
      },
    },
    duvida: {
      sys: "Você é um tutor amigável. Responda dúvidas de forma clara, com exemplos.",
      user: `Dúvida: ${input.subject}\n${input.extra?.context ?? ""}`,
      schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] },
    },
  };
  return bases[kind];
}

function qSchema(n: number) {
  return {
    type: "object", properties: {
      title: { type: "string" },
      questions: {
        type: "array", minItems: n, items: {
          type: "object", properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            answer: { type: "integer", minimum: 0, maximum: 3 },
            explanation: { type: "string" },
          }, required: ["question", "options", "answer"],
        },
      },
    }, required: ["title", "questions"],
  };
}

export const generateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const p = promptFor(data.kind, data);
    if (!p) throw new Error("Tipo de material inválido");
    const content = await callAI(
      [{ role: "system", content: p.sys }, { role: "user", content: p.user }],
      p.schema,
    );

    // Save unless it's a one-shot (duvida, escrita_avaliacao returned to client)
    let saved: { id: string } | null = null;
    if (data.kind !== "duvida" && data.kind !== "escrita_avaliacao" && data.kind !== "falhas") {
      const { data: row, error } = await context.supabase
        .from("materials")
        .insert({
          user_id: context.userId,
          kind: data.kind,
          stage: data.stage,
          discipline: data.discipline,
          subject: data.subject,
          difficulty: data.difficulty,
          size: data.size,
          content,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      saved = row;
    }
    return { content, id: saved?.id ?? null };
  });
