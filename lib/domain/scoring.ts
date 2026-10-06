// Placar do mês (seção 7.3). Funções puras: recebem os dados já resolvidos
// (estados de ocorrência, votos) e devolvem os números do placar.

import type { OccurrenceStatus } from "./recurrence";

export interface WeightedOccurrence {
  weight: number;
  status: OccurrenceStatus;
}

/**
 * `task_pct = 100 × Σ peso(done) ÷ Σ peso(done + missed)`.
 * `covered` e `excused` ficam fora do cálculo (nem numerador, nem denominador).
 * Sem nenhuma ocorrência resolvida (done/missed) no mês, o percentual é 0.
 */
export function calculateTaskPct(occurrences: readonly WeightedOccurrence[]): number {
  let doneWeight = 0;
  let resolvedWeight = 0;

  for (const occurrence of occurrences) {
    if (occurrence.status === "done") {
      doneWeight += occurrence.weight;
      resolvedWeight += occurrence.weight;
    } else if (occurrence.status === "missed") {
      resolvedWeight += occurrence.weight;
    }
  }

  return resolvedWeight === 0 ? 0 : (100 * doneWeight) / resolvedWeight;
}

export interface JudgedExtra {
  /** Notas de 0 a 3 dadas pelos outros dois. */
  votes: readonly number[];
}

/** Soma, para cada extra já julgado, a média dos votos recebidos (0 a 3). */
export function calculateExtraBonus(judgedExtras: readonly JudgedExtra[]): number {
  return judgedExtras.reduce((sum, extra) => {
    if (extra.votes.length === 0) return sum;
    const average = extra.votes.reduce((total, vote) => total + vote, 0) / extra.votes.length;
    return sum + average;
  }, 0);
}

/** `bonus = Σ média dos extras julgados + favor_bonus × nº de 'covered' feitas pela pessoa`. */
export function calculateBonus(params: {
  judgedExtras: readonly JudgedExtra[];
  favorsDone: number;
  favorBonus: number;
}): number {
  return calculateExtraBonus(params.judgedExtras) + params.favorBonus * params.favorsDone;
}

/** Dedurada procedente: 2 ou mais votos "procede" (valor 1) entre os três. */
export function isReportUpheld(votes: readonly number[]): boolean {
  return votes.filter((vote) => vote === 1).length >= 2;
}

/**
 * `penalty = report_penalty × nº de deduradas procedentes contra a pessoa`.
 * Contestações ("não fez direito") procedentes NÃO entram aqui: a perda do
 * peso da tarefa (done → missed) já é a punição, conforme a seção 7.3.
 */
export function calculatePenalty(params: {
  upheldReportsAgainstPerson: number;
  reportPenalty: number;
}): number {
  return params.reportPenalty * params.upheldReportsAgainstPerson;
}

export interface MonthScoreInput {
  occurrences: readonly WeightedOccurrence[];
  judgedExtras: readonly JudgedExtra[];
  favorsDone: number;
  favorBonus: number;
  upheldReportsAgainstPerson: number;
  reportPenalty: number;
}

export interface MonthScore {
  taskPct: number;
  bonus: number;
  penalty: number;
  /** `total = task_pct + bonus − penalty`. Pode passar de 100. */
  total: number;
}

export function calculateMonthScore(input: MonthScoreInput): MonthScore {
  const taskPct = calculateTaskPct(input.occurrences);
  const bonus = calculateBonus({
    judgedExtras: input.judgedExtras,
    favorsDone: input.favorsDone,
    favorBonus: input.favorBonus,
  });
  const penalty = calculatePenalty({
    upheldReportsAgainstPerson: input.upheldReportsAgainstPerson,
    reportPenalty: input.reportPenalty,
  });

  return { taskPct, bonus, penalty, total: taskPct + bonus - penalty };
}

export interface RankableScore {
  personId: number;
  total: number;
  upheldReportsCount: number;
  currentStreak: number;
}

/**
 * Compara duas pessoas para o ranking do mês (do melhor para o pior).
 * Desempate: maior total → menos deduradas procedentes → maior sequência atual.
 * Se ainda houver empate, cabe ao sorteio da cerimônia (fora do domínio puro).
 */
export function compareForRanking(a: RankableScore, b: RankableScore): number {
  if (a.total !== b.total) return b.total - a.total;
  if (a.upheldReportsCount !== b.upheldReportsCount) {
    return a.upheldReportsCount - b.upheldReportsCount;
  }
  if (a.currentStreak !== b.currentStreak) return b.currentStreak - a.currentStreak;
  return 0;
}

export function rankScores(scores: readonly RankableScore[]): RankableScore[] {
  return [...scores].sort(compareForRanking);
}
