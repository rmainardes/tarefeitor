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
