// Medalhas iniciais (seção 7.4). Funções puras que reaproveitam a mesma
// classificação de dia usada nas sequências (lib/domain/streaks.ts).

import type { OccurrenceStatus } from "./recurrence";
import { calculateCurrentStreak, type DayOutcome } from "./streaks";

export type BadgeCode =
  | "hotel_bed"
  | "sherpa"
  | "pingo_bff"
  | "perfect_week"
  | "helping_hand"
  | "clean_record";

/** 30 dias seguidos de "Arrumar a cama". */
export function hasHotelBed(bedDayOutcomes: readonly DayOutcome[]): boolean {
  return calculateCurrentStreak(bedDayOutcomes) >= 30;
}

/** 14 dias seguidos de "Guardar Everest". */
export function hasSherpa(everestDayOutcomes: readonly DayOutcome[]): boolean {
  return calculateCurrentStreak(everestDayOutcomes) >= 14;
}

/**
 * Todos os passeios do mês com o Pingo feitos pela própria pessoa.
 * Sem nenhum passeio devido no mês, a medalha não é concedida.
 */
export function hasPingoBff(walkOccurrences: readonly { status: OccurrenceStatus }[]): boolean {
  const countable = walkOccurrences.filter((occurrence) => occurrence.status !== "excused");
  if (countable.length === 0) return false;
  return countable.every((occurrence) => occurrence.status === "done");
}

/** 7 dias seguidos com 100% das próprias tarefas devidas. */
export function hasPerfectWeek(overallDayOutcomes: readonly DayOutcome[]): boolean {
  return calculateCurrentStreak(overallDayOutcomes) >= 7;
}

/** 5 ou mais "Fiz para o/a X" no mês. */
export function hasHelpingHand(favorsDone: number): boolean {
  return favorsDone >= 5;
}

/** Nenhuma dedurada procedente contra a pessoa no mês (contestações não contam). */
export function hasCleanRecord(upheldReportsAgainstPerson: number): boolean {
  return upheldReportsAgainstPerson === 0;
}

export function calculatePersonalBadges(params: {
  bedDayOutcomes: readonly DayOutcome[];
  everestDayOutcomes: readonly DayOutcome[];
  walkOccurrences: readonly { status: OccurrenceStatus }[];
  overallDayOutcomes: readonly DayOutcome[];
  favorsDone: number;
  upheldReportsAgainstPerson: number;
}): BadgeCode[] {
  const badges: BadgeCode[] = [];
  if (hasHotelBed(params.bedDayOutcomes)) badges.push("hotel_bed");
  if (hasSherpa(params.everestDayOutcomes)) badges.push("sherpa");
  if (hasPingoBff(params.walkOccurrences)) badges.push("pingo_bff");
  if (hasPerfectWeek(params.overallDayOutcomes)) badges.push("perfect_week");
  if (hasHelpingHand(params.favorsDone)) badges.push("helping_hand");
  if (hasCleanRecord(params.upheldReportsAgainstPerson)) badges.push("clean_record");
  return badges;
}

/**
 * "X-9 do mês": quem mais autorou deduradas procedentes. Cruza as três
 * pessoas, por isso fica fora de `calculatePersonalBadges`. Pode haver mais
 * de uma pessoa (empate) ou nenhuma (ninguém autorou dedurada procedente).
 */
export function findSnitches(upheldReportsAuthoredByPerson: ReadonlyMap<number, number>): number[] {
  let max = 0;
  for (const count of upheldReportsAuthoredByPerson.values()) {
    if (count > max) max = count;
  }
  if (max === 0) return [];

  return [...upheldReportsAuthoredByPerson.entries()]
    .filter(([, count]) => count === max)
    .map(([personId]) => personId);
}
