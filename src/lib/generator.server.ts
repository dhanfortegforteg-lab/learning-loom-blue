/**
 * Motor algorítmico de geração de materiais.
 * Recebe um schema JSON (o mesmo que antes era enviado à IA) e o preenche
 * com conteúdo real derivado do banco de conhecimento — de forma determinística.
 */
import { getBank, type Bank } from "./knowledge.server";

/* ------------------------------------------------------------------ util */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function trimTo(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

/* -------------------------------------------------------------- questões */

type Q = { text?: string; question: string; options: string[]; answer: number; explanation: string };

function usableSentences(bank: Bank) {
  const teach = (bank.teaching ?? []).filter((s) => s.split(" ").length >= 8);
  if (teach.length >= 6) return teach;
  return [...teach, ...bank.sentences.filter((s) => s.split(" ").length >= 8 && !teach.includes(s))];
}

function clozeQuestion(bank: Bank, i: number, r: () => number): Q | null {
  const sents = usableSentences(bank);
  if (!sents.length || bank.keywords.length < 4) return null;
  for (let tries = 0; tries < sents.length; tries++) {
    const s = pick(sents, i * 3 + tries);
    const words = s.split(/(\s+)/);
    const idx = words.findIndex((w) => {
      const clean = w.replace(/[^A-Za-zÀ-ÿ-]/g, "").toLowerCase();
      return clean.length >= 5 && bank.keywords.includes(clean);
    });
    if (idx < 0) continue;
    const correct = words[idx].replace(/[^A-Za-zÀ-ÿ-]/g, "");
    const blanked = [...words];
    blanked[idx] = words[idx].replace(correct, "_______");
    const distract = bank.keywords
      .filter((k) => k !== correct.toLowerCase() && !s.toLowerCase().includes(k))
      .slice(0, 12);
    if (distract.length < 3) continue;
    const opts = [correct, ...shuffle(distract, r).slice(0, 3).map(cap)];
    const order = shuffle(opts.map((_, k) => k), r);
    const options = order.map((k) => opts[k]);
    return {
      question: `Complete a lacuna: "${trimTo(blanked.join(""), 260)}"`,
      options,
      answer: order.indexOf(0),
      explanation: `A palavra certa é "${cap(correct)}". A frase completa fica: "${trimTo(s, 240)}" — repare que o termo é o que dá sentido à ideia; as outras opções pertencem a outro ponto do conteúdo.`,
    };
  }
  return null;
}

function statementQuestion(bank: Bank, i: number, r: () => number): Q {
  const sents = usableSentences(bank);
  const correct = trimTo(pick(sents.length ? sents : bank.paragraphs, i * 5 + 1), 180);
  const pool = (sents.length ? sents : bank.paragraphs).filter((s) => !s.startsWith(correct.slice(0, 40)));
  const wrong = shuffle(pool, r)
    .slice(0, 3)
    .map((s, k) => distort(trimTo(s, 180), k, bank));
  while (wrong.length < 3) wrong.push(distort(correct, wrong.length + 3, bank));
  const opts = [correct, ...wrong];
  const order = shuffle(opts.map((_, k) => k), r);
  return {
    question: `Sobre ${bank.title}, qual alternativa está correta?`,
    options: order.map((k) => opts[k]),
    answer: order.indexOf(0),
    explanation: `Correta: "${correct}" — essa é a informação apresentada no estudo de ${bank.title}.`,
  };
}

function distort(sentence: string, k: number, bank: Bank) {
  const kw = bank.keywords;
  const swaps: Array<(s: string) => string> = [
    (s) => s.replace(/\bnão\b/i, "sempre").replace(/\bé\b/, "nunca é"),
    (s) => `Ao contrário do estudado, ${s.charAt(0).toLowerCase()}${s.slice(1)}`,
    (s) => s.replace(new RegExp(`\\b${kw[0] ?? "conceito"}\\b`, "i"), kw[kw.length - 1] ?? "outro conceito"),
    (s) => `${s.replace(/\.$/, "")}, o que é considerado irrelevante para o tema.`,
  ];
  return trimTo(pick(swaps, k)(sentence), 190);
}

function supportText(bank: Bank, i: number, lines: number) {
  const sents = usableSentences(bank);
  const take = sents.length ? [pick(sents, i * 2), pick(sents, i * 2 + 1)] : bank.paragraphs.slice(0, 2);
  return trimTo(take.join(" "), lines * 90);
}

export function buildQuestions(bank: Bank, n: number, withText: boolean, difficulty = 0.5): Q[] {
  const r = rng(bank.title + n + Math.round(difficulty * 10));
  const out: Q[] = [];
  // Fácil: mais lacunas (reconhecimento). Difícil: mais análise de afirmações.
  const clozeEvery = difficulty < 0.35 ? 1 : difficulty < 0.7 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const q = (i % clozeEvery === 0 ? clozeQuestion(bank, i, r) : null) ?? statementQuestion(bank, i, r);
    // Texto-guia mais curto quanto maior a dificuldade (menos ajuda).
    if (withText) q.text = supportText(bank, i, difficulty > 0.7 ? 2 : 3);
    out.push(q);
  }
  return out;
}

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------- currículo */

const CURRICULUM: Record<string, string[]> = {
  base: ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Arte", "Educação Física", "Inglês"],
  medio: [
    "Língua Portuguesa", "Literatura", "Redação", "Matemática", "Física", "Química", "Biologia",
    "História", "Geografia", "Filosofia", "Sociologia", "Inglês",
  ],
};

const TOPICS: Record<string, string[]> = {
  "Língua Portuguesa": ["Classes de palavras", "Sintaxe da oração", "Concordância verbal e nominal", "Interpretação de texto", "Gêneros textuais", "Figuras de linguagem", "Ortografia e acentuação", "Coesão e coerência"],
  Literatura: ["Trovadorismo", "Barroco", "Arcadismo", "Romantismo", "Realismo", "Modernismo no Brasil", "Literatura contemporânea"],
  Redação: ["Estrutura dissertativa-argumentativa", "Tese e argumentação", "Repertório sociocultural", "Proposta de intervenção", "Coesão textual", "Erros mais comuns na redação"],
  Matemática: ["Números e operações", "Frações e decimais", "Razão e proporção", "Equações do 1º grau", "Equações do 2º grau", "Funções", "Geometria plana", "Estatística e probabilidade"],
  Ciências: ["Célula", "Corpo humano", "Ecossistemas", "Matéria e energia", "Sistema solar", "Cadeia alimentar"],
  Física: ["Cinemática", "Leis de Newton", "Trabalho e energia", "Termologia", "Óptica", "Eletricidade", "Ondulatória"],
  Química: ["Estrutura atômica", "Tabela periódica", "Ligações químicas", "Funções inorgânicas", "Estequiometria", "Química orgânica", "Termoquímica"],
  Biologia: ["Citologia", "Genética", "Evolução", "Ecologia", "Fisiologia humana", "Botânica", "Zoologia"],
  História: ["Antiguidade clássica", "Idade Média", "Expansão marítima", "Brasil colonial", "Independência do Brasil", "Revolução Industrial", "Primeira Guerra Mundial", "Ditadura militar no Brasil"],
  Geografia: ["Cartografia", "Relevo e clima", "População e migrações", "Urbanização", "Globalização", "Fontes de energia", "Geopolítica mundial"],
  Filosofia: ["Filosofia antiga", "Ética", "Política em Maquiavel", "Iluminismo", "Existencialismo"],
  Sociologia: ["Cultura e sociedade", "Trabalho e capitalismo", "Movimentos sociais", "Desigualdade social", "Cidadania e direitos"],
  Inglês: ["Verb to be", "Presente simples", "Passado simples", "Estrutura da frase em inglês", "Vocabulário essencial", "Interpretação de texto em inglês"],
  Arte: ["Elementos visuais", "Arte brasileira", "Movimentos artísticos", "Música e ritmo"],
  "Educação Física": ["Esportes coletivos", "Saúde e atividade física", "Ginástica", "Jogos e brincadeiras"],
};

export function buildCurriculum(yearLevel: string) {
  const y = yearLevel.toLowerCase();
  const isMedio = /médio|medio|vestibular|enem|3º ano|2º ano do ensino m/.test(y);
  const subjects = isMedio ? CURRICULUM.medio : CURRICULUM.base;
  return {
    subjects: subjects.map((subject) => ({
      subject,
      contents: (TOPICS[subject] ?? [`Fundamentos de ${subject}`, `Aprofundamento em ${subject}`, `Prática de ${subject}`]).map((title) => ({
        title,
        description: `Estudo de ${title.toLowerCase()} em ${subject} para ${yearLevel}, do conceito básico até a aplicação em questões.`,
      })),
    })),
  };
}

/* ------------------------------------------------- preenchimento genérico */

type Ctx = { bank: Bank; prompt: string; counter: { n: number }; intent?: Intent };

function next(ctx: Ctx) {
  return ctx.counter.n++;
}

function promptCount(prompt: string, key: string): number | null {
  const nouns: Record<string, string[]> = {
    questions: ["quest"],
    cards: ["flashcard", "cart"],
    slides: ["slide"],
    blocks: ["bloco"],
    sections: ["seç", "sec"],
    points: ["ponto"],
    branches: ["ramo"],
    items: ["sub-ideia", "item"],
    keywords: ["palavra"],
    tips: ["dica"],
    contents: ["conteúdo", "conteudo"],
    days: ["dia"],
    miniSimulado: ["quest"],
    flashcards: ["flashcard"],
  };
  const words = nouns[key];
  if (!words) return null;
  for (const w of words) {
    const re = new RegExp(`(\\d+)\\s*(?:a\\s*(\\d+)\\s*)?${w}`, "i");
    const m = prompt.match(re);
    if (m) return parseInt(m[2] ?? m[1], 10);
  }
  return null;
}

const DEFAULT_N: Record<string, number> = {
  questions: 10, cards: 12, slides: 8, blocks: 5, sections: 5, points: 4, branches: 5,
  items: 3, keywords: 5, tips: 4, bullets: 4, contents: 6, subjects: 8, connections: 3,
  analogies: 3, strengths: 3, improvements: 3, keyTerms: 5, days: 7, flashcards: 5, miniSimulado: 4,
};

/** Multiplicador de extensão conforme o tamanho pedido pelo aluno. */
function sizeFactor(ctx: Ctx) {
  return 0.7 + (ctx.intent?.size ?? 0.5) * 0.9;
}

function paragraph(ctx: Ctx, i: number, count = 1) {
  const b = ctx.bank;
  const total = Math.max(1, Math.round(count * sizeFactor(ctx)));
  const parts: string[] = [];
  for (let k = 0; k < total; k++) parts.push(pick(b.paragraphs, i + k));
  return parts.join("\n\n");
}

function sentence(ctx: Ctx, i: number) {
  const b = ctx.bank;
  const pool = b.teaching?.length ? b.teaching : b.sentences;
  return pool.length ? pick(pool, i) : pick(b.paragraphs, i);
}

/* -------------------------------------------------------- didática */

/** Termo central estudado na posição i (com a frase que o define). */
function conceptAt(ctx: Ctx, i: number) {
  const b = ctx.bank;
  if (b.definitions?.length) {
    const d = pick(b.definitions, i);
    return { term: cap(d.term), text: d.text };
  }
  const term = cap(pick(b.keywords, i) ?? b.title);
  return { term, text: sentence(ctx, i) };
}

/** Explica o conceito com as próprias palavras, em linguagem de professor. */
function explainConcept(ctx: Ctx, i: number) {
  const b = ctx.bank;
  const { term, text } = conceptAt(ctx, i);
  const why = trimTo(sentence(ctx, i + 3), 220);
  return [
    `**O que é:** ${trimTo(text, 280)}`,
    `**Em palavras simples:** entender ${term.toLowerCase()} é entender o que acontece, por que acontece e em que situação isso aparece dentro de ${b.title}.`,
    `**Por que importa:** ${why}`,
  ].join("\n\n");
}

/** Passo a passo de raciocínio para usar o conceito. */
function howToSteps(ctx: Ctx, i: number) {
  const { term } = conceptAt(ctx, i);
  const t = term.toLowerCase();
  return [
    `1. Leia o enunciado e identifique se o assunto envolve ${t}.`,
    `2. Escreva a definição de ${t} com as suas palavras antes de responder.`,
    `3. Relacione ${t} com os outros elementos de ${ctx.bank.title} que aparecem no enunciado.`,
    `4. Aplique o conceito no caso apresentado e confira se a resposta responde exatamente ao que foi pedido.`,
  ].join("\n");
}

function workedExample(ctx: Ctx, i: number) {
  const { term } = conceptAt(ctx, i);
  const evidence = trimTo(sentence(ctx, i + 1), 200);
  return `Imagine uma situação em que ${term.toLowerCase()} precisa ser reconhecido em ${ctx.bank.title}. Ponto de partida: ${evidence} A partir daí, você identifica o conceito, explica o motivo e chega à conclusão.`;
}

function commonMistakes(ctx: Ctx, i: number) {
  const { term } = conceptAt(ctx, i);
  return [
    `Decorar a definição de ${term.toLowerCase()} sem saber aplicá-la.`,
    `Confundir ${term.toLowerCase()} com outro conceito parecido de ${ctx.bank.title}.`,
    `Responder pelo "achismo" sem voltar ao enunciado.`,
  ].join("\n");
}

/** Bloco de estudo completo: entender → aplicar → praticar. */
function didacticBody(ctx: Ctx, i: number) {
  const base = sectionBody(ctx, i, 2);
  return [
    explainConcept(ctx, i),
    `**Como funciona, passo a passo:**\n${howToSteps(ctx, i)}`,
    `**Exemplo comentado:** ${workedExample(ctx, i)}`,
    `**No conteúdo:** ${trimTo(base, 700)}`,
    `**Erros comuns:**\n${commonMistakes(ctx, i)}`,
  ].join("\n\n");
}

function heading(ctx: Ctx, i: number) {
  const b = ctx.bank;
  if (b.sections.length) return pick(b.sections, i).heading;
  return `${b.title} — parte ${i + 1}`;
}

function sectionBody(ctx: Ctx, i: number, paras = 2) {
  const b = ctx.bank;
  if (b.sections.length) {
    const s = pick(b.sections, i);
    if (s.paragraphs.length) return s.paragraphs.slice(0, Math.max(1, Math.round(paras * sizeFactor(ctx)))).join("\n\n");
  }
  return paragraph(ctx, i, paras);
}

function textFor(key: string, ctx: Ctx, i: number): string {
  const b = ctx.bank;
  switch (key) {
    case "title":
    case "heading":
    case "center":
    case "focus":
      return i === 0 && (key === "title" || key === "center") ? b.title : heading(ctx, i);
    case "subject":
      return b.subject;
    case "label":
    case "term":
      return conceptAt(ctx, i).term;
    case "definition":
      return trimTo(conceptAt(ctx, i).text, 260);
    case "example":
      return workedExample(ctx, i);
    case "detail":
    case "highlight":
    case "keyIdea":
    case "visual":
      if (key === "visual") return `${b.title} ${pick(b.keywords, i) ?? ""}`.trim();
      return trimTo(sentence(ctx, i + 2), 240);
    case "intro":
    case "overview":
      return `${explainConcept(ctx, i)}\n\n${trimTo(paragraph(ctx, i, 1), 600)}`;
    case "summary":
    case "review":
      return [
        `**Ideia central:** ${trimTo(conceptAt(ctx, i).text, 240)}`,
        `**Para lembrar:** ${b.keywords.slice(0, 6).map(cap).join(" · ")}`,
        `**Checagem rápida:** consigo explicar ${b.title} para outra pessoa em três frases, dar um exemplo e dizer onde isso é usado?`,
      ].join("\n\n");
    case "body":
    case "theory":
    case "guide":
      return didacticBody(ctx, i);
    case "miniText":
    case "answer":
      return sectionBody(ctx, i, 1);
    case "text":
      return supportText(b, i, 3);
    case "front":
      return `Explique com suas palavras: ${conceptAt(ctx, i).term} em ${b.title}.`;
    case "back":
      return trimTo(conceptAt(ctx, i).text, 300);
    case "essayPrompt":
    case "writingPrompt":
      return `Escreva um texto explicando ${b.title}, mostrando domínio do tema: apresente o conceito, um exemplo e a importância do assunto.`;
    case "feedback":
      return "Avaliação automática por comparação de termos-chave do tema com o texto enviado.";
    default:
      return trimTo(sentence(ctx, i), 240);
  }
}

function isQuestionSchema(schema: any) {
  const p = schema?.properties ?? {};
  return !!(p.question && p.options && p.answer !== undefined);
}

function fill(schema: any, key: string, ctx: Ctx): any {
  if (!schema) return null;
  const type = schema.type ?? (schema.properties ? "object" : "string");

  if (type === "object") {
    if (isQuestionSchema(schema)) {
      const withText = !!schema.properties.text;
      const diff = ctx.intent?.difficulty ?? 0.5;
      const q = buildQuestions(ctx.bank, 1, withText, diff)[0];
      const idx = next(ctx);
      const qs = buildQuestions(ctx.bank, idx + 1, withText, diff);
      return qs[idx] ?? q;
    }
    // Flashcard: frente e verso precisam falar do MESMO conceito
    if (schema.properties?.front && schema.properties?.back) {
      const i = next(ctx);
      const { term, text } = conceptAt(ctx, i);
      return {
        front: `O que é ${term} em ${ctx.bank.title} e para que serve?`,
        back: trimTo(text, 300),
      };
    }

    const out: any = {};
    for (const [k, sub] of Object.entries<any>(schema.properties ?? {})) out[k] = fill(sub, k, ctx);
    return out;
  }

  if (type === "array") {
    const n = schema.minItems ?? promptCount(ctx.prompt, key) ?? DEFAULT_N[key] ?? 4;
    const items = schema.items ?? { type: "string" };
    if (isQuestionSchema(items)) return buildQuestions(ctx.bank, n, !!items.properties.text, ctx.intent?.difficulty ?? 0.5);
    const out: any[] = [];
    for (let i = 0; i < n; i++) {
      if ((items.type ?? "string") === "string") out.push(stringItem(key, ctx, i));
      else out.push(fill(items, key === "sections" ? "section" : key.replace(/s$/, ""), ctx));
    }
    return out;
  }

  if (type === "integer" || type === "number") {
    if (key === "day") return next(ctx) % 7 || 7;
    if (key === "score") return 0;
    return 0;
  }
  if (type === "boolean") return false;

  return textFor(key, ctx, next(ctx));
}

function stringItem(key: string, ctx: Ctx, i: number) {
  switch (key) {
    case "bullets":
      return trimTo(sentence(ctx, i + 1), 120);
    case "keywords":
      return cap(pick(ctx.bank.keywords, i) ?? ctx.bank.title);
    case "options":
      return trimTo(sentence(ctx, i), 120);
    case "connections":
    case "analogies":
    case "tips":
    case "strengths":
    case "improvements":
      return trimTo(sentence(ctx, i + 2), 200);
    default:
      return trimTo(sentence(ctx, i), 200);
  }
}

/* --------------------------------------------------------- casos especiais */

function gradeEssay(text: string, bank: Bank, max: number) {
  const t = (text ?? "").toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const kws = bank.keywords.slice(0, 20);
  const hits = kws.filter((k) => t.includes(k));
  const coverage = kws.length ? hits.length / kws.length : 0;
  const lengthScore = Math.min(1, words.length / 220);
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length > 4).length;
  const structure = Math.min(1, sentences / 8);
  const raw = coverage * 0.5 + lengthScore * 0.3 + structure * 0.2;
  const score = Math.round(raw * max * 10) / 10;
  const feedback = [
    `Aderência ao tema "${bank.title}": ${Math.round(coverage * 100)}% dos termos centrais do assunto apareceram no texto.`,
    `Extensão: ${words.length} palavras e ${sentences} períodos bem formados.`,
    hits.length ? `Termos reconhecidos: ${hits.slice(0, 8).join(", ")}.` : "Nenhum termo central do tema foi reconhecido — cite os conceitos do assunto.",
    coverage < 0.4 ? "Para subir a nota, desenvolva os conceitos principais do tema e dê exemplos." : "Bom domínio do tema; aprofunde os exemplos para ganhar pontos.",
    words.length < 150 ? "Escreva mais: textos curtos limitam a nota." : "Extensão adequada.",
  ];
  return {
    score,
    feedback: feedback.join("\n"),
    strengths: [feedback[1], hits.length ? feedback[2] : "Texto entregue dentro da proposta."],
    improvements: [feedback[3], feedback[4]],
  };
}


/* --------------------------------------------------------------- intenção */

export type Intent = {
  subject: string;
  discipline?: string;
  stage?: string;
  /** 0 = introdutório, 1 = aprofundado */
  difficulty: number;
  /** 0 = curto, 1 = completo */
  size: number;
};

function grab(prompt: string, labels: string[]): string | undefined {
  for (const l of labels) {
    const m = prompt.match(new RegExp(`${l}\\s*[:=]\\s*"?([^"|\\n]+)"?`, "i"));
    const v = m?.[1]?.trim().replace(/[.,;]$/, "");
    if (v && !/^(n[ãa]o informad|indefinid|-|nenhum)/i.test(v)) return v;
  }
  return undefined;
}

function scale(value: string | undefined, words: Array<[RegExp, number]>, fallback: number) {
  if (!value) return fallback;
  const numeric = value.match(/(\d+)\s*(?:\/|de\s*)?(\d+)?/);
  if (numeric && /n[íi]vel|^\d+$/.test(value)) {
    const n = parseInt(numeric[1], 10);
    const max = numeric[2] ? parseInt(numeric[2], 10) : 15;
    if (n > 0 && max > 1) return Math.min(1, Math.max(0, (n - 1) / (max - 1)));
  }
  for (const [re, v] of words) if (re.test(value)) return v;
  return fallback;
}

/** Lê o pedido do aluno (assunto, disciplina, etapa, dificuldade e tamanho). */
export function parseIntent(prompt: string): Intent {
  const discipline = grab(prompt, ["disciplina", "mat[ée]ria"]);
  const stage = grab(prompt, ["etapa", "ano letivo", "n[íi]vel de ensino", "s[ée]rie"]);
  const difficultyRaw = grab(prompt, ["dificuldade"]);
  const sizeRaw = grab(prompt, ["tamanho( do texto)?", "extens[ãa]o"]);
  return {
    subject: extractSubject(prompt),
    discipline,
    stage,
    difficulty: scale(difficultyRaw, [[/f[áa]cil|introdut/i, 0.15], [/m[ée]di|intermedi/i, 0.5], [/dif[íi]cil|aprofund|avan[çc]ad/i, 0.9]], 0.5),
    size: scale(sizeRaw, [[/pequen|curt/i, 0.2], [/m[ée]di|equilibr/i, 0.5], [/grande|complet|long/i, 0.9]], 0.5),
  };
}

/* -------------------------------------------------------------- entrada */

function extractSubject(prompt: string): string {
  const patterns = [
    /Conteúdo estudado:\s*"([^"]+)"/i,
    /Tema:\s*"([^"]+)"/i,
    /Assunto:\s*([^|\n]+)/i,
    /Conteúdo:\s*([^|\n—-]+)/i,
    /sobre\s+"([^"]+)"/i,
    /"([^"]{3,80})"/,
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    const raw = m?.[1]?.trim();
    if (raw) return cleanSubject(raw);
  }
  return "Estudo";
}

/** Limpa o que o aluno digitou: tira "Ex:", artigos iniciais e pontuação. */
function cleanSubject(raw: string): string {
  let s = raw
    .replace(/^\s*(ex\.?|exemplo|assunto|tema|sobre|estudar|quero estudar|preciso de|me ensina)\s*[:\-]?\s*/i, "")
    .replace(/[\s"'.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^(o|a|os|as|um|uma)\s+/i, "");
  return s.length >= 2 ? s : raw.trim();
}

function extractYearLevel(prompt: string) {
  const m = prompt.match(/ano letivo\s*"([^"]+)"/i) ?? prompt.match(/"([^"]+)"/);
  return m?.[1] ?? "Ensino Fundamental";
}

/** Substitui a antiga chamada de IA por geração algorítmica. */
export async function generate(messages: any[], schema?: any): Promise<any> {
  const prompt = messages.map((m) => String(m?.content ?? "")).join("\n");
  const props = schema?.properties ?? {};

  // Grade curricular
  if (props.subjects?.items?.properties?.contents) return buildCurriculum(extractYearLevel(prompt));

  const intent = parseIntent(prompt);
  const bank = await getBank(intent.subject, [intent.discipline, intent.stage].filter(Boolean).join(" "));

  // Correção de redação
  if (props.score && props.feedback) {
    const m = prompt.match(/"""([\s\S]*?)"""/) ?? prompt.match(/Texto do aluno:\s*([\s\S]+)$/);
    const max = /0 a 35/.test(prompt) ? 35 : 100;
    return gradeEssay(m?.[1] ?? "", bank, max);
  }

  // Dúvida direta
  if (Object.keys(props).length === 1 && props.answer) {
    const parts = [
      `**${bank.title}** — ${trimTo(bank.summary, 600)}`,
      ...bank.sections.slice(1, 4).map((s) => `\n**${s.heading}**\n${trimTo(s.paragraphs[0] ?? "", 500)}`),
      `\n**Resumo rápido:** ${bank.keywords.slice(0, 8).map(cap).join(" · ")}`,
      bank.sourced ? `\n_Fonte: Wikipédia (pt) — ${bank.title}._` : "",
    ];
    return { answer: parts.join("\n") };
  }

  if (!schema) {
    return { text: `${bank.title}\n\n${bank.paragraphs.slice(0, 4).join("\n\n")}` };
  }

  const ctx: Ctx = { bank, prompt, counter: { n: 0 }, intent };
  return fill(schema, "root", ctx);
}
