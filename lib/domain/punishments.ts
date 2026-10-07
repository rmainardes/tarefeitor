// Roleta do castigo (seção 2, decisões 16-17; seção 7.7). As três opções são
// fixas, combinadas pela casa. `pickPunishment` é pura: recebe o sorteio
// (0 a 1, normalmente `Math.random()`) em vez de lê-lo, para ser testável.

export const PUNISHMENT_IDS = ["arlete", "nonna", "vanderlei"] as const;

export type PunishmentId = (typeof PUNISHMENT_IDS)[number];

export function isPunishmentId(value: unknown): value is PunishmentId {
  return typeof value === "string" && (PUNISHMENT_IDS as readonly string[]).includes(value);
}

/** `randomValue` em `[0, 1)`. Fora desse intervalo, é fixado nas bordas. */
export function pickPunishment(randomValue: number): PunishmentId {
  const clamped = Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON);
  const index = Math.floor(clamped * PUNISHMENT_IDS.length);
  return PUNISHMENT_IDS[index];
}
