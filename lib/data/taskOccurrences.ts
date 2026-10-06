import type { ISODate } from "../domain/dates";
import type { OccurrenceStatus } from "../domain/recurrence";
import { mapDataError } from "./errors";
import { getSupabaseAdmin } from "./supabaseAdmin";

export interface TaskOccurrenceRecord {
  taskId: string;
  dueDate: ISODate;
  status: OccurrenceStatus;
  doneBy: number | null;
  markedBy: number;
  note: string | null;
}

export async function findOccurrence(
  taskId: string,
  dueDate: ISODate,
): Promise<TaskOccurrenceRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("task_occurrences")
    .select("task_id, due_date, status, done_by, marked_by, note")
    .eq("task_id", taskId)
    .eq("due_date", dueDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    taskId: data.task_id,
    dueDate: data.due_date,
    status: data.status,
    doneBy: data.done_by,
    markedBy: data.marked_by,
    note: data.note,
  };
}

export interface UpsertOccurrenceInput {
  taskId: string;
  dueDate: ISODate;
  status: OccurrenceStatus;
  doneBy: number | null;
  markedBy: number;
  note?: string | null;
}

/** Grava o estado final de uma ocorrência (`markDone`, `markMissed`, `coverTask`). */
export async function upsertOccurrence(input: UpsertOccurrenceInput): Promise<void> {
  const { error } = await getSupabaseAdmin().from("task_occurrences").upsert({
    task_id: input.taskId,
    due_date: input.dueDate,
    status: input.status,
    done_by: input.doneBy,
    marked_by: input.markedBy,
    marked_at: new Date().toISOString(),
    note: input.note ?? null,
  });

  if (error) throw mapDataError(error);
}

/** Remove a linha de uma ocorrência, devolvendo-a a "pendente" (`undoMark`). */
export async function deleteOccurrence(taskId: string, dueDate: ISODate): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("task_occurrences")
    .delete()
    .eq("task_id", taskId)
    .eq("due_date", dueDate);

  if (error) throw mapDataError(error);
}
