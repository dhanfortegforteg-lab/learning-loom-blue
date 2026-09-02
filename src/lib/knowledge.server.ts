/**
 * Base de conhecimento algorítmica.
 * Busca o conteúdo real na Wikipédia em português e o transforma em um "banco"
 * estruturado (títulos, seções, parágrafos, frases e palavras-chave) que os
 * geradores usam para montar todos os materiais — sem IA.
 */

const API = "https://pt.wikipedia.org/w/api.php";

export type Bank = {
  subject: string;
  title: string;
  summary: string;
  paragraphs: string[];
  sections: { heading: string; paragraphs: string[] }[];
  sentences: string[];
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
      { heading: `Introdução a ${s}`, paragraphs: [paragraphs[0], paragraphs[1]] },
      { heading: `Como estudar ${s}`, paragraphs: [paragraphs[2]] },
      { heading: `Aplicações de ${s}`, paragraphs: [paragraphs[3]] },
    ],
    sentences: paragraphs.flatMap(splitSentences),
    keywords: extractKeywords(paragraphs.join(" ") + " " + s, 20),
    sourced: false,
  };
}

async function j(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Foxstudy/1.0 (estudos)" } });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  return res.json() as Promise<any>;
}

async function findTitle(subject: string): Promise<string | null> {
  const url = `${API}?action=query&list=search&srsearch=${encodeURIComponent(subject)}&srlimit=1&format=json&utf8=1`;
  const data = await j(url);
  return data?.query?.search?.[0]?.title ?? null;
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
  const sections: { heading: string; paragraphs: string[] }[] = [];
  let current = { heading: `O que é ${title}`, paragraphs: [] as string[] };
  const skip = /^(ver também|referências|ligações externas|bibliografia|notas|galeria)$/i;

  for (const line of lines) {
    const h = line.match(/^\s*={2,}\s*(.+?)\s*={2,}\s*$/);
    if (h) {
      if (current.paragraphs.length) sections.push(current);
      current = { heading: h[1], paragraphs: [] };
      continue;
    }
    const p = line.trim();
    if (p.length >= 80) current.paragraphs.push(p);
  }
  if (current.paragraphs.length) sections.push(current);

  const useful = sections.filter((s) => !skip.test(s.heading.trim())).slice(0, 12);
  const paragraphs = useful.flatMap((s) => s.paragraphs);
  if (!paragraphs.length) return fallbackBank(subject);

  return {
    subject,
    title,
    summary: paragraphs[0],
    paragraphs,
    sections: useful,
    sentences: paragraphs.flatMap(splitSentences),
    keywords: extractKeywords(paragraphs.join(" "), 40),
    sourced: true,
  };
}

/** Monta (com cache) o banco de conteúdo de um assunto. Nunca lança erro. */
export async function getBank(subject: string): Promise<Bank> {
  const key = subject.trim().toLowerCase();
  if (!key) return fallbackBank("Estudo");
  const hit = cache.get(key);
  if (hit) return hit;

  let bank: Bank;
  try {
    const title = await findTitle(subject);
    const extract = title ? await fetchExtract(title) : null;
    bank = extract ? parseArticle(subject, title!, extract) : fallbackBank(subject);
  } catch {
    bank = fallbackBank(subject);
  }
  if (bank.sentences.length < 6) {
    const fb = fallbackBank(subject);
    bank = { ...bank, sentences: [...bank.sentences, ...fb.sentences], paragraphs: [...bank.paragraphs, ...fb.paragraphs] };
  }
  cache.set(key, bank);
  return bank;
}
