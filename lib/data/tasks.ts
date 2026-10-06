import type { ISODate } from "../domain/dates";
import type { RecurrenceKind, TaskPeriod } from "../domain/recurrence";
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
