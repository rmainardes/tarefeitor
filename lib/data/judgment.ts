import type { ISODate } from "../domain/dates";
import { mapDataError } from "./errors";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * Extras e deduradas do mês corrente, ainda sem decisão (seção 7.3: "em
 * julgamento"). Até a T11 trazer os votos, tudo que existe no mês aberto
 * conta aqui — não há como ainda estar julgado.
 */
export async function countPendingJudgments(monthStart: ISODate, today: ISODate): Promise<number> {
  const supabase = getSupabaseAdmin();

  const [extras, reports] = await Promise.all([
    supabase
      .from("extras")
      .select("id", { count: "exact", head: true })
      .gte("happened_on", monthStart)
      .lte("happened_on", today),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("happened_on", monthStart)
      .lte("happened_on", today),
  ]);

  if (extras.error) throw new Error(extras.error.message);
  if (reports.error) throw new Error(reports.error.message);

  return (extras.count ?? 0) + (reports.count ?? 0);
}

export interface CreateExtraInput {
  authorId: number;
  description: string;
  happenedOn: ISODate;
}

export async function createExtra(input: CreateExtraInput): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("extras")
    .insert({
      author_id: input.authorId,
      description: input.description,
      happened_on: input.happenedOn,
    })
    .select("id")
    .single();

  if (error) throw mapDataError(error);
  return data.id;
}

export interface CreateReportInput {
  authorId: number;
  accusedId: number;
  description: string;
  happenedOn: ISODate;
  taskId?: string | null;
  dueDate?: ISODate | null;
}

export async function createReport(input: CreateReportInput): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("reports")
    .insert({
      author_id: input.authorId,
      accused_id: input.accusedId,
      description: input.description,
      happened_on: input.happenedOn,
      task_id: input.taskId ?? null,
      due_date: input.dueDate ?? null,
    })
    .select("id")
    .single();

  if (error) throw mapDataError(error);
  return data.id;
}

export type JudgmentKind = "extra" | "report";

export interface PendingJudgmentItem {
  id: string;
  kind: JudgmentKind;
  authorId: number;
  /** Só nas deduradas. */
  accusedId: number | null;
  description: string;
  defense: string | null;
  happenedOn: ISODate;
}

/** Extras e deduradas do mês corrente ainda sem decisão, para exibir "em julgamento" (seção 7.3). */
export async function listPendingJudgments(
  monthStart: ISODate,
  today: ISODate,
): Promise<PendingJudgmentItem[]> {
  const supabase = getSupabaseAdmin();

  const [extras, reports] = await Promise.all([
    supabase
      .from("extras")
      .select("id, author_id, description, happened_on")
      .gte("happened_on", monthStart)
      .lte("happened_on", today)
      .order("happened_on", { ascending: false }),
    supabase
      .from("reports")
      .select("id, author_id, accused_id, description, defense, happened_on")
      .gte("happened_on", monthStart)
      .lte("happened_on", today)
      .order("happened_on", { ascending: false }),
  ]);

  if (extras.error) throw new Error(extras.error.message);
  if (reports.error) throw new Error(reports.error.message);

  const extraItems: PendingJudgmentItem[] = (extras.data ?? []).map((row) => ({
    id: row.id,
    kind: "extra",
    authorId: row.author_id,
    accusedId: null,
    description: row.description,
    defense: null,
    happenedOn: row.happened_on,
  }));

  const reportItems: PendingJudgmentItem[] = (reports.data ?? []).map((row) => ({
    id: row.id,
    kind: "report",
    authorId: row.author_id,
    accusedId: row.accused_id,
    description: row.description,
    defense: row.defense,
    happenedOn: row.happened_on,
  }));

  return [...extraItems, ...reportItems].sort((a, b) => (a.happenedOn < b.happenedOn ? 1 : -1));
}
