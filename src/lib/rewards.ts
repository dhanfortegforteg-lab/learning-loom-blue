export type RewardStats = {
  xp: number;
  level: number;
  streak: number;
  materials: number;
  materialKinds: number;
  answers: number;
  correct: number;
  wrong: number;
  minutes: number;
  writings: number;
  bestWriting: number;
  exams: number;
  bestExam: number;
  examAvg: number;
  tracksDone: number;
  notes: number;
  events: number;
  foxHappyDays: number;
};

export const emptyStats: RewardStats = {
  xp: 0, level: 1, streak: 0, materials: 0, materialKinds: 0, answers: 0, correct: 0, wrong: 0,
  minutes: 0, writings: 0, bestWriting: 0, exams: 0, bestExam: 0, examAvg: 0, tracksDone: 0,
  notes: 0, events: 0, foxHappyDays: 0,
};

export type Reward = {
  id: string;
  kind: "trofeu" | "medalha";
  name: string;
  desc: string;
  icon: string;
  xp: number;
  target: number;
  value: (s: RewardStats) => number;
};

const t = (
  id: string, name: string, desc: string, icon: string, xp: number, target: number,
  value: (s: RewardStats) => number,
): Reward => ({ id, kind: "trofeu", name, desc, icon, xp, target, value });

const m = (
  id: string, name: string, desc: string, icon: string, xp: number, target: number,
  value: (s: RewardStats) => number,
): Reward => ({ id, kind: "medalha", name, desc, icon, xp, target, value });

/** 30 troféus obtidos por missões. */
export const TROPHIES: Reward[] = [
  t("t1", "Primeiros Passos", "Gere seu 1º material", "🏆", 20, 1, (s) => s.materials),
  t("t2", "Colecionador", "Gere 10 materiais", "🏆", 40, 10, (s) => s.materials),
  t("t3", "Fábrica de Estudos", "Gere 50 materiais", "🏆", 90, 50, (s) => s.materials),
  t("t4", "Explorador", "Use 5 tipos de material diferentes", "🧭", 50, 5, (s) => s.materialKinds),
  t("t5", "Enciclopédia", "Use 10 tipos de material diferentes", "📚", 80, 10, (s) => s.materialKinds),
  t("t6", "Iniciante Curioso", "Responda 10 questões", "❓", 20, 10, (s) => s.answers),
  t("t7", "Maratonista de Questões", "Responda 100 questões", "🎯", 60, 100, (s) => s.answers),
  t("t8", "Mil Questões", "Responda 500 questões", "🎖️", 150, 500, (s) => s.answers),
  t("t9", "Certeiro", "Acerte 50 questões", "✅", 40, 50, (s) => s.correct),
  t("t10", "Precisão Cirúrgica", "Acerte 250 questões", "🎯", 120, 250, (s) => s.correct),
  t("t11", "Aprendiz do Erro", "Registre 20 erros (e aprenda com eles)", "🧩", 30, 20, (s) => s.wrong),
  t("t12", "Foco Inicial", "Estude 60 minutos", "⏱️", 25, 60, (s) => s.minutes),
  t("t13", "Hora Cheia", "Estude 300 minutos", "⏳", 60, 300, (s) => s.minutes),
  t("t14", "Imersão Total", "Estude 1000 minutos", "🌌", 130, 1000, (s) => s.minutes),
  t("t15", "Chama Acesa", "3 dias de ofensiva", "🔥", 25, 3, (s) => s.streak),
  t("t16", "Semana Perfeita", "7 dias de ofensiva", "🔥", 55, 7, (s) => s.streak),
  t("t17", "Fogo Eterno", "30 dias de ofensiva", "🔥", 160, 30, (s) => s.streak),
  t("t18", "Escritor", "Envie 1 redação", "✍️", 20, 1, (s) => s.writings),
  t("t19", "Redator Constante", "Envie 10 redações", "🖋️", 70, 10, (s) => s.writings),
  t("t20", "Pena de Ouro", "Tire 90+ em uma redação", "🥇", 110, 90, (s) => s.bestWriting),
  t("t21", "Primeira Avaliação", "Faça 1 simulado ou prova", "📝", 25, 1, (s) => s.exams),
  t("t22", "Veterano de Provas", "Faça 10 avaliações", "📋", 70, 10, (s) => s.exams),
  t("t23", "Nota Alta", "Tire 8.0 em uma avaliação", "⭐", 80, 8, (s) => s.bestExam),
  t("t24", "Nota Máxima", "Tire 10 em uma avaliação", "💯", 150, 10, (s) => s.bestExam),
  t("t25", "Constância", "Média 7.0 nas avaliações", "📈", 90, 7, (s) => s.examAvg),
  t("t26", "Trilheiro", "Conclua 1 conteúdo de trilha", "🛤️", 30, 1, (s) => s.tracksDone),
  t("t27", "Trilha Avançada", "Conclua 10 conteúdos de trilha", "🚀", 90, 10, (s) => s.tracksDone),
  t("t28", "Organizado", "Crie 5 anotações", "🗒️", 25, 5, (s) => s.notes),
  t("t29", "Planejador", "Crie 5 eventos no calendário", "📅", 25, 5, (s) => s.events),
  t("t30", "Raposa Feliz", "Deixe a raposinha feliz 5 dias", "🦊", 100, 5, (s) => s.foxHappyDays),
];

/** 15 medalhas de valores diferentes. */
export const MEDALS: Reward[] = [
  m("m1", "Medalha de Bronze", "Alcance 250 XP", "🥉", 15, 250, (s) => s.xp),
  m("m2", "Medalha de Prata", "Alcance 750 XP", "🥈", 30, 750, (s) => s.xp),
  m("m3", "Medalha de Ouro", "Alcance 1500 XP", "🥇", 60, 1500, (s) => s.xp),
  m("m4", "Medalha de Platina", "Alcance 3000 XP", "🏅", 100, 3000, (s) => s.xp),
  m("m5", "Medalha de Diamante", "Alcance 6000 XP", "💎", 180, 6000, (s) => s.xp),
  m("m6", "Medalha do Nível 5", "Chegue ao nível 5", "🎖️", 25, 5, (s) => s.level),
  m("m7", "Medalha do Nível 10", "Chegue ao nível 10", "🎖️", 50, 10, (s) => s.level),
  m("m8", "Medalha do Nível 25", "Chegue ao nível 25", "🎖️", 120, 25, (s) => s.level),
  m("m9", "Medalha do Foco", "Estude 120 minutos", "🧘", 30, 120, (s) => s.minutes),
  m("m10", "Medalha da Resiliência", "Responda 200 questões", "🛡️", 70, 200, (s) => s.answers),
  m("m11", "Medalha da Escrita", "Tire 80+ em uma redação", "📜", 55, 80, (s) => s.bestWriting),
  m("m12", "Medalha da Disciplina", "5 dias de ofensiva", "⛓️", 40, 5, (s) => s.streak),
  m("m13", "Medalha do Simulado", "Faça 5 avaliações", "🧪", 45, 5, (s) => s.exams),
  m("m14", "Medalha da Trilha", "Conclua 5 conteúdos de trilha", "🗺️", 65, 5, (s) => s.tracksDone),
  m("m15", "Medalha Lendária", "Acerte 500 questões", "👑", 250, 500, (s) => s.correct),
];

export const ALL_REWARDS = [...TROPHIES, ...MEDALS];
export const REWARD_BY_ID = new Map(ALL_REWARDS.map((r) => [r.id, r]));

export function isEarned(r: Reward, s: RewardStats) {
  return r.value(s) >= r.target;
}

/** Ranking por minérios — a cada 10 níveis. */
export const RANKINGS = [
  { name: "Carvão", level: 1, icon: "⚫", color: "from-zinc-600 to-zinc-900" },
  { name: "Ferro", level: 10, icon: "🔩", color: "from-slate-300 to-slate-600" },
  { name: "Cobre", level: 20, icon: "🟠", color: "from-orange-400 to-amber-700" },
  { name: "Prata", level: 30, icon: "⚪", color: "from-slate-100 to-slate-400" },
  { name: "Ouro", level: 40, icon: "🟡", color: "from-yellow-300 to-yellow-600" },
  { name: "Esmeralda", level: 50, icon: "🟢", color: "from-emerald-300 to-emerald-600" },
  { name: "Safira", level: 60, icon: "🔵", color: "from-sky-300 to-blue-600" },
  { name: "Rubi", level: 70, icon: "🔴", color: "from-rose-400 to-red-700" },
  { name: "Diamante", level: 80, icon: "💠", color: "from-cyan-200 to-cyan-500" },
  { name: "Netherita", level: 90, icon: "🟣", color: "from-fuchsia-500 to-purple-900" },
];

export function rankingFor(level: number) {
  let current = RANKINGS[0]!;
  for (const r of RANKINGS) if (level >= r.level) current = r;
  const next = RANKINGS.find((r) => r.level > level) ?? null;
  return { current, next };
}

/** Estrelas: +5 por acerto, -10 por erro. */
export function starsFor(correct: number, wrong: number) {
  return correct * 5 - wrong * 10;
}
