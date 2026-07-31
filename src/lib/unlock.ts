export type UnlockRule = "score" | "attempts" | "both" | "any" | "free";

export type UnlockGoal = {
  unlock_rule?: string | null;
  min_score?: number | string | null;
  min_attempts?: number | null;
  score?: number | string | null;
  attempts?: number | null;
};

export const UNLOCK_RULES: { value: UnlockRule; label: string }[] = [
  { value: "score", label: "Nota mínima" },
  { value: "attempts", label: "Nº de tentativas" },
  { value: "both", label: "Nota e tentativas" },
  { value: "any", label: "Nota ou tentativas" },
  { value: "free", label: "Sem meta (livre)" },
];

/** O conteúdo atingiu a meta configurada? */
export function goalMet(c: UnlockGoal | null | undefined): boolean {
  if (!c) return false;
  const rule = (c.unlock_rule ?? "score") as UnlockRule;
  if (rule === "free") return true;
  const score = Number(c.score ?? 0);
  const attempts = Number(c.attempts ?? 0);
  const minScore = Number(c.min_score ?? 6);
  const minAttempts = Number(c.min_attempts ?? 1);
  const okScore = score >= minScore;
  const okAttempts = attempts >= minAttempts;
  if (rule === "score") return okScore;
  if (rule === "attempts") return okAttempts;
  if (rule === "both") return okScore && okAttempts;
  return okScore || okAttempts;
}

export function goalLabel(c: UnlockGoal | null | undefined): string {
  const rule = ((c?.unlock_rule ?? "score") as UnlockRule);
  const minScore = Number(c?.min_score ?? 6).toFixed(1);
  const minAttempts = Number(c?.min_attempts ?? 1);
  switch (rule) {
    case "free":
      return "Sem meta — liberado direto";
    case "attempts":
      return `${minAttempts} tentativa(s) concluída(s)`;
    case "both":
      return `Nota ${minScore} e ${minAttempts} tentativa(s)`;
    case "any":
      return `Nota ${minScore} ou ${minAttempts} tentativa(s)`;
    default:
      return `Nota mínima ${minScore}`;
  }
}
