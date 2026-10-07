// Folgas (seção 8.6/10, T13): pessoa, período, tarefa específica ou todas,
// motivo opcional. Calculadas na leitura por `resolveOccurrenceState`
// (lib/domain/recurrence.ts) — este módulo só grava e lista o cadastro.

import type { ISODate } from "../domain/dates";
import { getSupabaseAdmin } from "./supabaseAdmin";

export interface DayOffRecord {
  id: string;
  personId: number;
  dateFrom: ISODate;
  dateTo: ISODate;
  /** `null` = cobre todas as tarefas da pessoa. */
  taskId: string | null;
  reason: string | null;
}

interface DayOffRow {
  id: string;
  person_id: number;
  date_from: ISODate;
  date_to: ISODate;
  task_id: string | null;
  reason: string | null;
}

function toDayOffRecord(row: DayOffRow): DayOffRecord {
  return {
    id: row.id,
    personId: row.person_id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    taskId: row.task_id,
    reason: row.reason,
  };
}

/** Todas as folgas, da mais recente à mais antiga (tela de Configurações). */
export async function listDaysOff(): Promise<DayOffRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("days_off")
    .select("id, person_id, date_from, date_to, task_id, reason")
    .order("date_from", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DayOffRow[]).map(toDayOffRecord);
}

export interface UpsertDayOffInput {
  id?: string;
  personId: number;
  dateFrom: ISODate;
  dateTo: ISODate;
  taskId: string | null;
  reason: string | null;
}

/** Cria ou atualiza uma folga (seção 10: `upsertDayOff`). Devolve o id. */
export async function upsertDayOffRecord(input: UpsertDayOffInput): Promise<string> {
  const supabase = getSupabaseAdmin();
  const row = {
    person_id: input.personId,
    date_from: input.dateFrom,
    date_to: input.dateTo,
    task_id: input.taskId,
    reason: input.reason,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("days_off")
      .update(row)
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  const { data, error } = await supabase.from("days_off").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteDayOffRecord(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("days_off").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function findDayOff(id: string): Promise<DayOffRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("days_off")
    .select("id, person_id, date_from, date_to, task_id, reason")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toDayOffRecord(data as DayOffRow);
}
