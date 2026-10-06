/**
 * Formato do placar exibido pelo painel. O cálculo real é
 * `lib/domain/scoring.ts` + `lib/data/scoreboard.ts`; `lib/panel/fromDomain`
 * converte o resultado para este formato (T2b do porte).
 */
import type { Person } from "./panel-types";

export interface BoardScore {
  person: Person;
  doneWeight: number;
  missedWeight: number;
  /** % do possível. */
  pct: number;
  bonus: number;
  penalty: number;
  total: number;
  streak: number;
  /** 1 = líder. */
  rank: number;
  isLeader: boolean;
  pendingJudgement: number;
}
