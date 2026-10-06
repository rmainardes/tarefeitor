// Sequências (seção 7.4, 🔥). Funções puras: recebem o resultado de cada dia,
// já resolvido pelo chamador, e devolvem o tamanho da sequência atual.

import type { OccurrenceStatus } from "./recurrence";

export type DayOutcome = "perfect" | "imperfect" | "neutral";

/**
 * Classifica um dia a partir das ocorrências devidas pela pessoa nele.
 * `excused` (folga) é ignorada. Um dia só é `perfect` se todas as demais
 * ocorrências estiverem `done` — `covered` não conta como feita pela própria
 * pessoa. Sem nenhuma ocorrência devida (ou todas em folga), o dia é `neutral`.
 */
export function classifyDay(
  occurrences: readonly { status: OccurrenceStatus }[],
): DayOutcome {
  const countable = occurrences.filter((occurrence) => occurrence.status !== "excused");
  if (countable.length === 0) return "neutral";
  return countable.every((occurrence) => occurrence.status === "done") ? "perfect" : "imperfect";
}

/**
 * Sequência atual (em dias), contando a partir do dia mais recente para trás.
 * Dias `neutral` não quebram nem somam; o primeiro `imperfect` encontrado
 * interrompe a contagem.
 */
export function calculateCurrentStreak(daysChronological: readonly DayOutcome[]): number {
  let streak = 0;

  for (let i = daysChronological.length - 1; i >= 0; i--) {
    const outcome = daysChronological[i];
    if (outcome === "neutral") continue;
    if (outcome === "imperfect") break;
    streak += 1;
  }

  return streak;
}
