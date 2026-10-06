import { getSupabaseAdmin } from "./supabaseAdmin";

export async function personExists(personId: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("people")
    .select("id")
    .eq("id", personId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}
