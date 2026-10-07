import type { ISODate } from "../domain/dates";
import type { RecurrenceKind, TaskPeriod } from "../domain/recurrence";
import type { TaskVersionFields } from "../domain/taskVersioning";
import { getSupabaseAdmin } from "./supabaseAdmin";

export interface TaskOwnerRecord {
  id: string;
  personId: number;
  weight: number;
}

export async function findTaskOwner(taskId: string): Promise<TaskOwnerRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select("id, person_id, weight")
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return { id: data.id, personId: data.person_id, weight: data.weight };
}

export interface NewTaskInput {
  personId: number;
  title: string;
  period: TaskPeriod;
  weight: 1 | 2 | 3;
  /** Só `daily` e `weekly` têm formulário no painel; o resto fica para Configurações (T13). */
  kind: Extract<RecurrenceKind, "daily" | "weekly">;
  /** Obrigatório quando `kind === "weekly"`. ISO 1 (segunda) a 7 (domingo). */
  weekdays: number[] | null;
  validFrom: ISODate;
  createdBy: number;
}

/** Cria uma tarefa recorrente nova ("Nova tarefa", seção 8.1/10). Sem versionamento — isso é T13. */
export async function insertTask(input: NewTaskInput): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .insert({
      person_id: input.personId,
      title: input.title,
      period: input.period,
      weight: input.weight,
      kind: input.kind,
      weekdays: input.kind === "weekly" ? input.weekdays : null,
      valid_from: input.validFrom,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export interface ConfigTaskRecord extends TaskVersionFields {
  id: string;
  title: string;
  icon: string;
  imagePath: string | null;
  period: TaskPeriod;
  sortOrder: number;
  validFrom: ISODate;
  validTo: ISODate | null;
}

interface ConfigTaskRow {
  id: string;
  person_id: number;
  title: string;
  icon: string;
  image_path: string | null;
  period: TaskPeriod;
  weight: number;
  kind: RecurrenceKind;
  weekdays: number[] | null;
  month_day: number | null;
  once_date: ISODate | null;
  lead_days: number;
  sort_order: number;
  valid_from: ISODate;
  valid_to: ISODate | null;
}

function toConfigTaskRecord(row: ConfigTaskRow): ConfigTaskRecord {
  return {
    id: row.id,
    personId: row.person_id,
    title: row.title,
    icon: row.icon,
    imagePath: row.image_path,
    period: row.period,
    weight: row.weight,
    kind: row.kind,
    weekdays: row.weekdays,
    monthDay: row.month_day,
    onceDate: row.once_date,
    leadDays: row.lead_days,
    sortOrder: row.sort_order,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

const CONFIG_TASK_COLUMNS =
  "id, person_id, title, icon, image_path, period, weight, kind, weekdays, month_day, once_date, lead_days, sort_order, valid_from, valid_to";

/** Tarefas em vigor em `today` (todas as pessoas), para a tela de Configurações (seção 8.6). */
export async function listActiveTasks(today: ISODate): Promise<ConfigTaskRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select(CONFIG_TASK_COLUMNS)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order("person_id")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return ((data ?? []) as ConfigTaskRow[]).map(toConfigTaskRecord);
}

export async function findConfigTask(taskId: string): Promise<ConfigTaskRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select(CONFIG_TASK_COLUMNS)
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toConfigTaskRecord(data as ConfigTaskRow);
}

export interface TaskInPlaceEdit {
  title: string;
  icon: string;
  imagePath: string | null;
  period: TaskPeriod;
  sortOrder: number;
}

/** Edição no lugar (seção 6: título, figura ou ordem não reescrevem o passado). */
export async function updateTaskInPlace(taskId: string, edit: TaskInPlaceEdit): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("tasks")
    .update({
      title: edit.title,
      icon: edit.icon,
      image_path: edit.imagePath,
      period: edit.period,
      sort_order: edit.sortOrder,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
}

export interface TaskRevision extends TaskVersionFields {
  title: string;
  icon: string;
  imagePath: string | null;
  period: TaskPeriod;
  sortOrder: number;
  createdBy: number;
  /** Sempre "ontem" em relação a `validFrom` (seção 6). */
  previousValidTo: ISODate;
  validFrom: ISODate;
}

/**
 * Encerra a versão atual e cria uma nova (seção 6: peso, recorrência ou
 * responsável mudaram). Duas gravações sequenciais — sem RPC transacional
 * dedicado, aceitável para uma edição manual e pouco frequente de um app
 * doméstico. Devolve o id da nova versão.
 */
export async function reviseTask(taskId: string, revision: TaskRevision): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { error: endError } = await supabase
    .from("tasks")
    .update({ valid_to: revision.previousValidTo })
    .eq("id", taskId);
  if (endError) throw new Error(endError.message);

  const { data, error: insertError } = await supabase
    .from("tasks")
    .insert({
      person_id: revision.personId,
      title: revision.title,
      icon: revision.icon,
      image_path: revision.imagePath,
      period: revision.period,
      weight: revision.weight,
      kind: revision.kind,
      weekdays: revision.weekdays,
      month_day: revision.monthDay,
      once_date: revision.onceDate,
      lead_days: revision.leadDays,
      sort_order: revision.sortOrder,
      valid_from: revision.validFrom,
      created_by: revision.createdBy,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return data.id;
}

/** "Encerrar tarefa" (seção 6: excluir = preencher `valid_to`, nunca apagar). */
export async function endTask(taskId: string, validTo: ISODate): Promise<void> {
  const { error } = await getSupabaseAdmin().from("tasks").update({ valid_to: validTo }).eq("id", taskId);
  if (error) throw new Error(error.message);
}

export interface NewConfigTaskInput extends TaskVersionFields {
  title: string;
  icon: string;
  imagePath: string | null;
  period: TaskPeriod;
  sortOrder: number;
  validFrom: ISODate;
  createdBy: number;
}

/** "Nova tarefa" na tela de Configurações (seção 8.6): todos os tipos de recorrência. */
export async function insertConfigTask(input: NewConfigTaskInput): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .insert({
      person_id: input.personId,
      title: input.title,
      icon: input.icon,
      image_path: input.imagePath,
      period: input.period,
      weight: input.weight,
      kind: input.kind,
      weekdays: input.weekdays,
      month_day: input.monthDay,
      once_date: input.onceDate,
      lead_days: input.leadDays,
      sort_order: input.sortOrder,
      valid_from: input.validFrom,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}
