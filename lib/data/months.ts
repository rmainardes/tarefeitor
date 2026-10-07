import type { ISODate } from "../domain/dates";
import type { BadgeCode } from "../domain/badges";
import { getSupabaseAdmin } from "./supabaseAdmin";

/** O mês de `date` já foi fechado (existe linha em `month_results`)? Seção 6. */
export async function isMonthClosed(date: ISODate): Promise<boolean> {
  const monthStart = `${date.slice(0, 7)}-01`;

  const { data, error } = await getSupabaseAdmin()
    .from("month_results")
    .select("month")
    .eq("month", monthStart)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}

/** Repetição de uma chave primária (ex.: `month_results.month` já existe). */
export class AlreadyClosedError extends Error {}

export interface PersonMonthScoreInput {
  personId: number;
  taskPct: number;
  bonus: number;
  penalty: number;
  total: number;
  rank: 1 | 2 | 3;
  badges: BadgeCode[];
}

export interface CloseMonthInput {
  month: ISODate;
  closedBy: number;
  summary: Record<string, unknown>;
  scores: readonly PersonMonthScoreInput[];
}

/**
 * Grava `month_results` e `month_scores` em uma única transação (seção 7.7):
 * chama a função `close_month` (migração 0003), transacional por ser plpgsql.
 * Se o mês já estiver fechado, a chave primária de `month_results.month`
 * rejeita o insert (SQLSTATE 23505) e nada é gravado.
 */
export async function closeMonthTransaction(input: CloseMonthInput): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("close_month", {
    p_month: input.month,
    p_closed_by: input.closedBy,
    p_summary: input.summary,
    p_scores: input.scores.map((score) => ({
      person_id: score.personId,
      task_pct: score.taskPct,
      bonus: score.bonus,
      penalty: score.penalty,
      total: score.total,
      rank: score.rank,
      badges: score.badges,
    })),
  });

  if (error) {
    if (error.code === "23505") throw new AlreadyClosedError(error.message);
    throw new Error(error.message);
  }
}

export interface MonthResultRecord {
  month: ISODate;
  closedAt: string;
  closedBy: number | null;
  punishment: string | null;
  summary: unknown;
}

export interface MonthScoreRecord {
  personId: number;
  taskPct: number;
  bonus: number;
  penalty: number;
  total: number;
  rank: number;
  badges: string[];
}

export interface MonthResult {
  result: MonthResultRecord;
  scores: MonthScoreRecord[];
}

function toMonthResultRecord(row: {
  month: string;
  closed_at: string;
  closed_by: number | null;
  punishment: string | null;
  summary: unknown;
}): MonthResultRecord {
  return {
    month: row.month,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    punishment: row.punishment,
    summary: row.summary,
  };
}

function toMonthScoreRecord(row: {
  person_id: number;
  task_pct: number;
  bonus: number;
  penalty: number;
  total: number;
  rank: number;
  badges: string[] | null;
}): MonthScoreRecord {
  return {
    personId: row.person_id,
    taskPct: row.task_pct,
    bonus: row.bonus,
    penalty: row.penalty,
    total: row.total,
    rank: row.rank,
    badges: row.badges ?? [],
  };
}

/** Mês fechado com seu pódio, para a cerimônia (`/cerimonia/[month]`) e o Hall da fama. */
export async function getMonthResult(month: ISODate): Promise<MonthResult | null> {
  const supabase = getSupabaseAdmin();

  const [resultRes, scoresRes] = await Promise.all([
    supabase
      .from("month_results")
      .select("month, closed_at, closed_by, punishment, summary")
      .eq("month", month)
      .maybeSingle(),
    supabase
      .from("month_scores")
      .select("person_id, task_pct, bonus, penalty, total, rank, badges")
      .eq("month", month)
      .order("rank"),
  ]);

  if (resultRes.error) throw new Error(resultRes.error.message);
  if (scoresRes.error) throw new Error(scoresRes.error.message);
  if (!resultRes.data) return null;

  return {
    result: toMonthResultRecord(resultRes.data),
    scores: (scoresRes.data ?? []).map(toMonthScoreRecord),
  };
}

/** Todos os meses fechados, do mais recente ao mais antigo (Hall da fama). */
export async function listClosedMonths(): Promise<MonthResult[]> {
  const supabase = getSupabaseAdmin();

  const { data: results, error: resultsError } = await supabase
    .from("month_results")
    .select("month, closed_at, closed_by, punishment, summary")
    .order("month", { ascending: false });

  if (resultsError) throw new Error(resultsError.message);
  if (!results || results.length === 0) return [];

  const { data: scores, error: scoresError } = await supabase
    .from("month_scores")
    .select("month, person_id, task_pct, bonus, penalty, total, rank, badges")
    .in("month", results.map((row) => row.month))
    .order("rank");

  if (scoresError) throw new Error(scoresError.message);

  const scoresByMonth = new Map<string, MonthScoreRecord[]>();
  for (const row of scores ?? []) {
    const list = scoresByMonth.get(row.month) ?? [];
    list.push(toMonthScoreRecord(row));
    scoresByMonth.set(row.month, list);
  }

  return results.map((row) => ({
    result: toMonthResultRecord(row),
    scores: scoresByMonth.get(row.month) ?? [],
  }));
}

/**
 * Grava o castigo sorteado só se ainda não houver um (seção 7.7: "só uma
 * vez"). `UPDATE ... WHERE punishment IS NULL` é atômico no banco: em caso de
 * corrida, só uma chamada afeta a linha — a outra recebe `false`.
 */
export async function setPunishmentIfEmpty(month: ISODate, punishment: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("month_results")
    .update({ punishment })
    .eq("month", month)
    .is("punishment", null)
    .select("month");

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
