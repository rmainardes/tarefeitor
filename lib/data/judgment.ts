import type { ISODate } from "../domain/dates";
import { mapDataError } from "./errors";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type JudgmentKind = "extra" | "report";

export interface VoteRecord {
  voterId: number;
  value: number;
}

/** Votos já registrados para extras/deduradas cujo `id` está em `ids`, agrupados por alvo. */
async function listVotesByTarget(
  kind: JudgmentKind,
  ids: readonly string[],
): Promise<Map<string, VoteRecord[]>> {
  const map = new Map<string, VoteRecord[]>();
  if (ids.length === 0) return map;

  const { data, error } = await getSupabaseAdmin()
    .from("votes")
    .select("target_id, voter_id, value")
    .eq("target_kind", kind)
    .in("target_id", ids);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const votes = map.get(row.target_id) ?? [];
    votes.push({ voterId: row.voter_id, value: row.value });
    map.set(row.target_id, votes);
  }
  return map;
}

/** Nº de votos para considerar o item julgado (seção 7.7): os outros dois / os três. */
export const EXTRA_VOTES_NEEDED = 2;
export const REPORT_VOTES_NEEDED = 3;

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

export interface ExtraRecord {
  id: string;
  authorId: number;
  description: string;
  happenedOn: ISODate;
  votes: VoteRecord[];
}

export function isExtraJudged(extra: Pick<ExtraRecord, "votes">): boolean {
  return extra.votes.length >= EXTRA_VOTES_NEEDED;
}

/** Extras do mês corrente, cada um já com os votos recebidos (seção 7.3/7.7). */
export async function listMonthExtras(monthStart: ISODate, today: ISODate): Promise<ExtraRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("extras")
    .select("id, author_id, description, happened_on")
    .gte("happened_on", monthStart)
    .lte("happened_on", today)
    .order("happened_on", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const votesByTarget = await listVotesByTarget("extra", rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    description: row.description,
    happenedOn: row.happened_on,
    votes: votesByTarget.get(row.id) ?? [],
  }));
}

export interface ReportRecord {
  id: string;
  authorId: number;
  accusedId: number;
  description: string;
  defense: string | null;
  /** Preenchido só na contestação ("não fez direito"), seção 7.3. */
  taskId: string | null;
  dueDate: ISODate | null;
  happenedOn: ISODate;
  votes: VoteRecord[];
}

export function isReportJudged(report: Pick<ReportRecord, "votes">): boolean {
  return report.votes.length >= REPORT_VOTES_NEEDED;
}

/** Deduradas do mês corrente, cada uma já com defesa e votos (seção 7.3/7.7). */
export async function listMonthReports(monthStart: ISODate, today: ISODate): Promise<ReportRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reports")
    .select("id, author_id, accused_id, description, defense, task_id, due_date, happened_on")
    .gte("happened_on", monthStart)
    .lte("happened_on", today)
    .order("happened_on", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const votesByTarget = await listVotesByTarget("report", rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    accusedId: row.accused_id,
    description: row.description,
    defense: row.defense,
    taskId: row.task_id,
    dueDate: row.due_date,
    happenedOn: row.happened_on,
    votes: votesByTarget.get(row.id) ?? [],
  }));
}

export interface PendingJudgmentItem {
  id: string;
  kind: JudgmentKind;
  authorId: number;
  /** Só nas deduradas. */
  accusedId: number | null;
  description: string;
  defense: string | null;
  happenedOn: ISODate;
  votes: VoteRecord[];
  votesNeeded: number;
}

/** Extras e deduradas do mês corrente ainda sem votos completos, para "em julgamento" (seção 7.3). */
export async function listPendingJudgments(
  monthStart: ISODate,
  today: ISODate,
): Promise<PendingJudgmentItem[]> {
  const [extras, reports] = await Promise.all([
    listMonthExtras(monthStart, today),
    listMonthReports(monthStart, today),
  ]);

  const extraItems: PendingJudgmentItem[] = extras
    .filter((extra) => !isExtraJudged(extra))
    .map((extra) => ({
      id: extra.id,
      kind: "extra",
      authorId: extra.authorId,
      accusedId: null,
      description: extra.description,
      defense: null,
      happenedOn: extra.happenedOn,
      votes: extra.votes,
      votesNeeded: EXTRA_VOTES_NEEDED,
    }));

  const reportItems: PendingJudgmentItem[] = reports
    .filter((report) => !isReportJudged(report))
    .map((report) => ({
      id: report.id,
      kind: "report",
      authorId: report.authorId,
      accusedId: report.accusedId,
      description: report.description,
      defense: report.defense,
      happenedOn: report.happenedOn,
      votes: report.votes,
      votesNeeded: REPORT_VOTES_NEEDED,
    }));

  return [...extraItems, ...reportItems].sort((a, b) => (a.happenedOn < b.happenedOn ? 1 : -1));
}

export interface ExtraLookup {
  id: string;
  authorId: number;
  happenedOn: ISODate;
}

export async function getExtraById(id: string): Promise<ExtraLookup | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("extras")
    .select("id, author_id, happened_on")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, authorId: data.author_id, happenedOn: data.happened_on };
}

export interface ReportLookup {
  id: string;
  authorId: number;
  accusedId: number;
  happenedOn: ISODate;
  taskId: string | null;
  dueDate: ISODate | null;
}

export async function getReportById(id: string): Promise<ReportLookup | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("reports")
    .select("id, author_id, accused_id, happened_on, task_id, due_date")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    authorId: data.author_id,
    accusedId: data.accused_id,
    happenedOn: data.happened_on,
    taskId: data.task_id,
    dueDate: data.due_date,
  };
}

/** "O acusado pode escrever uma linha de defesa" (seção 7.7): ator = acusado, checado no Server Action. */
export async function setReportDefense(reportId: string, defense: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("reports").update({ defense }).eq("id", reportId);
  if (error) throw mapDataError(error);
}

export interface CastVoteInput {
  targetKind: JudgmentKind;
  targetId: string;
  voterId: number;
  value: number;
}

/** Upsert: votar de novo substitui o voto anterior (mesma pessoa, mesmo alvo). */
export async function castVote(input: CastVoteInput): Promise<void> {
  const { error } = await getSupabaseAdmin().from("votes").upsert({
    target_kind: input.targetKind,
    target_id: input.targetId,
    voter_id: input.voterId,
    value: input.value,
  });

  if (error) throw mapDataError(error);
}

export async function listVotesFor(kind: JudgmentKind, targetId: string): Promise<VoteRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("votes")
    .select("voter_id, value")
    .eq("target_kind", kind)
    .eq("target_id", targetId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ voterId: row.voter_id, value: row.value }));
}
