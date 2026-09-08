/**
 * Base de conhecimento algorítmica.
 * Busca o conteúdo real na Wikipédia em português e o transforma em um "banco"
 * estruturado (títulos, seções, parágrafos, frases e palavras-chave) que os
 * geradores usam para montar todos os materiais — sem IA.
 */

const API = "https://pt.wikipedia.org/w/api.php";

export type Section = { heading: string; paragraphs: string[]; kind: SectionKind };

export type SectionKind =
  | "conceito"
  | "funcionamento"
  | "tipos"
  | "exemplo"
  | "aplicacao"
  | "historia"
  | "outro";

/** Frase que define/explica um termo — a matéria-prima do ensino. */
export type Definition = { term: string; text: string };

export type Bank = {
  subject: string;
  title: string;
  summary: string;
  paragraphs: string[];
  sections: Section[];
  sentences: string[];
  /** Frases explicativas (definição, causa, função, processo) — sem datas soltas. */
  teaching: string[];
  definitions: Definition[];
  keywords: string[];
  sourced: boolean;
};

const STOP = new Set(
  ("a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre até após ante desde " +
    "e ou mas que se como quando onde qual quais quem cujo cuja este esta esse essa aquele aquela isso isto aquilo " +
    "ao aos à às pelo pela pelos pelas seu sua seus suas meu minha nosso nossa dele dela deles delas " +
    "ser sao são foi eram era ter tem têm tinha havia há mais menos muito muita muitos muitas também já ainda " +
    "não sim outro outra outros outras cada todo toda todos todas grande pequeno primeiro segundo através dentro fora " +
    "durante porque assim então apenas pode podem deve devem entre").split(/\s+/),
);

const cache = new Map<string, Bank>();

function clean(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return clean(text)
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 50 && s.length <= 320 && !/^\s*[=•-]/.test(s));
}

function extractKeywords(text: string, limit = 40): string[] {
  const counts = new Map<string, number>();
  const words = clean(text).split(/[^A-Za-zÀ-ÿ0-9-]+/);
  for (const raw of words) {
    const w = raw.trim();
    if (w.length < 4 || w.length > 24) continue;
    const low = w.toLowerCase();
    if (STOP.has(low) || /^\d+$/.test(low)) continue;
    counts.set(low, (counts.get(low) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/* ------------------------------------------------- camada didática */

const KIND_RULES: Array<[RegExp, SectionKind]> = [
  [/defini|conceito|o que [ée]|introdu|vis[ãa]o geral|generalidades|descri[çc][ãa]o/i, "conceito"],
  [/funcionamento|como funciona|mecanismo|processo|princ[íi]pio|f[óo]rmula|c[áa]lculo|estrutura|propriedades|caracter[íi]sticas/i, "funcionamento"],
  [/tipos|classifica|categoria|divis[ãa]o|esp[ée]cies|formas/i, "tipos"],
  [/exemplo|casos?|amostra|modelo/i, "exemplo"],
  [/aplica|utiliza|uso|import[âa]ncia|no cotidiano|na pr[áa]tica|consequ[êe]ncia|efeito/i, "aplicacao"],
  [/hist[óo]ri|etimolog|origem|antiguidade|cronolog|biografia|s[ée]culo|contexto hist/i, "historia"],
];

function classify(heading: string): SectionKind {
  for (const [re, kind] of KIND_RULES) if (re.test(heading)) return kind;
  return "outro";
}

/** Ordem de valor pedagógico: primeiro entender, depois exemplificar, por último história. */
const KIND_ORDER: Record<SectionKind, number> = {
  conceito: 0,
  funcionamento: 1,
  tipos: 2,
  exemplo: 3,
  aplicacao: 4,
  outro: 5,
  historia: 9,
};

const DATE_HEAVY = /\b(1[0-9]{3}|20[0-2][0-9])\b|\bs[ée]culo\b|\bd\.?C\.?\b|\ba\.?C\.?\b/i;
const EXPLAINS =
  /\b([ée]|s[ãa]o|consiste|define-se|chama-se|denomina|significa|corresponde|serve para|funciona|ocorre quando|acontece quando|resulta|permite|depende|representa|caracteriza|classifica|calcula|indica|provoca|deve-se|por isso|porque|ou seja|isto [ée])\b/i;

/** Mantém frases que ensinam (definem, explicam causa, função ou processo). */
function teachingSentences(sentences: string[]): string[] {
  const scored = sentences
    .map((s) => {
      let score = 0;
      if (EXPLAINS.test(s)) score += 3;
      if (/\b(ou seja|isto [ée]|por exemplo|porque|portanto|assim)\b/i.test(s)) score += 2;
      if (/\bconsiste|define-se|chama-se|significa|serve para|ocorre quando\b/i.test(s)) score += 3;
      if (DATE_HEAVY.test(s)) score -= 4;
      if (/\b(nasceu|morreu|foi eleito|assinado em|fundad[oa] em)\b/i.test(s)) score -= 4;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.s);
}

/** Frases do tipo "X é ...", que viram definição de termo. */
function extractDefinitions(sentences: string[], keywords: string[]): Definition[] {
  const out: Definition[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const m = s.match(
      /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.,;:]{2,60}?)\s+(?:[ée]|s[ãa]o|consiste em|refere-se a|define-se como|significa|corresponde a)\s+([^.]{25,260}\.?)/,
    );
    if (!m) continue;
    const term = m[1].trim().replace(/^(o|a|os|as|um|uma)\s+/i, "");
    const key = term.toLowerCase();
    if (seen.has(key) || term.split(" ").length > 6) continue;
    if (DATE_HEAVY.test(s)) continue;
    seen.add(key);
    out.push({ term, text: s.trim() });
  }
  // completa com termos frequentes que aparecem em frases explicativas
  for (const k of keywords) {
    if (out.length >= 14) break;
    if (seen.has(k)) continue;
    const src = sentences.find((s) => s.toLowerCase().includes(k) && EXPLAINS.test(s) && !DATE_HEAVY.test(s));
    if (!src) continue;
    seen.add(k);
    out.push({ term: k, text: src.trim() });
  }
  return out;
}

function fallbackBank(subject: string): Bank {
  const s = subject.trim();
  const paragraphs = [
    `${s} é um conteúdo de estudo que precisa ser compreendido em três camadas: o que é, como funciona e para que serve. Nesta apostila o assunto é apresentado do conceito mais simples até as aplicações práticas.`,
    `Para dominar ${s}, comece identificando os termos centrais do tema, depois observe como esses termos se relacionam entre si e, por fim, pratique reconhecendo esses elementos em situações e exercícios.`,
    `O erro mais comum ao estudar ${s} é decorar definições isoladas. O caminho mais eficiente é explicar o conteúdo com as próprias palavras, criar exemplos próprios e revisar em intervalos crescentes.`,
    `Na prática, ${s} aparece em questões que pedem identificação de conceitos, comparação entre ideias e aplicação em um caso concreto. Reconhecer o tipo de pergunta já facilita metade da resposta.`,
  ];
  return {
    subject: s,
    title: s,
    summary: paragraphs[0],
    paragraphs,
    sections: [
      { heading: `O que é ${s}`, paragraphs: [paragraphs[0], paragraphs[1]], kind: "conceito" },
      { heading: `Como funciona na prática`, paragraphs: [paragraphs[2]], kind: "funcionamento" },
      { heading: `Aplicações de ${s}`, paragraphs: [paragraphs[3]], kind: "aplicacao" },
    ],
    sentences: paragraphs.flatMap(splitSentences),
    teaching: paragraphs.flatMap(splitSentences),
    definitions: [{ term: s, text: paragraphs[0] }],
    keywords: extractKeywords(paragraphs.join(" ") + " " + s, 20),
    sourced: false,
  };
}

async function j(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Foxstudy/1.0 (estudos)" } });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  return res.json() as Promise<any>;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Termos significativos do assunto pedido pelo aluno. */
function terms(subject: string) {
  return norm(subject)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/**
 * Busca vários candidatos e escolhe o melhor: prioriza títulos que cobrem os
 * termos pedidos, descarta desambiguações/listas e prefere artigos maiores.
 */
async function findTitles(subject: string, hint?: string): Promise<string[]> {
  const queries = [hint ? `${subject} ${hint}` : subject, subject].filter(
    (q, i, a) => a.indexOf(q) === i,
  );
  const wanted = terms(subject);
  const scored = new Map<string, number>();

  for (const q of queries) {
    const url = `${API}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=6&format=json&utf8=1`;
    let data: any;
    try {
      data = await j(url);
    } catch {
      continue;
    }
    const results: any[] = data?.query?.search ?? [];
    results.forEach((res, rank) => {
      const title: string = res.title;
      const nt = norm(title);
      if (/desambiguacao|lista de|anexo/.test(nt)) return;
      const covered = wanted.filter((w) => nt.includes(w)).length;
      const score =
        covered * 10 +
        (nt === norm(subject) ? 25 : 0) +
        Math.min(8, (res.wordcount ?? 0) / 800) -
        rank;
      scored.set(title, Math.max(scored.get(title) ?? -99, score));
    });
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 3);
}

async function fetchExtract(title: string): Promise<string | null> {
  const url = `${API}?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(title)}&format=json&utf8=1`;
  const data = await j(url);
  const pages = data?.query?.pages ?? {};
  const first: any = Object.values(pages)[0];
  return first?.extract ?? null;
}

function parseArticle(subject: string, title: string, extract: string): Bank {
  const text = clean(extract);
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: `O que é ${title}`, paragraphs: [], kind: "conceito" };
  const skip = /^(ver também|referências|ligações externas|bibliografia|notas|galeria)$/i;

  for (const line of lines) {
    const h = line.match(/^\s*={2,}\s*(.+?)\s*={2,}\s*$/);
    if (h) {
      if (current.paragraphs.length) sections.push(current);
      current = { heading: h[1], paragraphs: [], kind: classify(h[1]) };
      continue;
    }
    const p = line.trim();
    if (p.length >= 80) current.paragraphs.push(p);
  }
  if (current.paragraphs.length) sections.push(current);

  const kept = sections.filter((s) => !skip.test(s.heading.trim()));
  // Ordena pelo valor pedagógico e limita as seções puramente históricas a uma.
  const history = kept.filter((s) => s.kind === "historia");
  const rest = kept.filter((s) => s.kind !== "historia");
  const useful = [...rest, ...history.slice(0, 1)]
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .slice(0, 10);

  const paragraphs = useful.flatMap((s) => s.paragraphs);
  if (!paragraphs.length) return fallbackBank(subject);

  const sentences = paragraphs.flatMap(splitSentences);
  const keywords = extractKeywords(paragraphs.join(" "), 40);
  const teaching = teachingSentences(sentences);

  return {
    subject,
    title,
    summary: paragraphs[0],
    paragraphs,
    sections: useful,
    sentences,
    teaching: teaching.length >= 5 ? teaching : sentences,
    definitions: extractDefinitions(sentences, keywords),
    keywords,
    sourced: true,
  };
}

/**
 * Monta (com cache) o banco de conteúdo de um assunto. Nunca lança erro.
 * `hint` (disciplina/etapa) melhora a escolha do artigo certo.
 */
export async function getBank(subject: string, hint?: string): Promise<Bank> {
  const key = (subject.trim() + "|" + (hint ?? "")).toLowerCase();
  if (!subject.trim()) return fallbackBank("Estudo");
  const hit = cache.get(key);
  if (hit) return hit;

  let bank: Bank = fallbackBank(subject);
  try {
    const titles = await findTitles(subject, hint);
    for (const title of titles) {
      const extract = await fetchExtract(title);
      if (!extract || extract.length < 400) continue;
      const candidate = parseArticle(subject, title, extract);
      if (candidate.sourced && candidate.sentences.length >= 8) {
        bank = candidate;
        break;
      }
      if (candidate.sourced && !bank.sourced) bank = candidate;
    }
  } catch {
    bank = fallbackBank(subject);
  }
  if (bank.sentences.length < 6) {
    const fb = fallbackBank(subject);
    bank = {
      ...bank,
      sentences: [...bank.sentences, ...fb.sentences],
      teaching: [...bank.teaching, ...fb.teaching],
      paragraphs: [...bank.paragraphs, ...fb.paragraphs],
      definitions: bank.definitions.length ? bank.definitions : fb.definitions,
    };
  }
  cache.set(key, bank);
  return bank;
}
