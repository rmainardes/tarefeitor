import { getSupabaseAdmin } from "./supabaseAdmin";

/** Lê um parâmetro numérico de `settings` (seção 6). Lança se não existir. */
export async function getNumberSetting(key: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data === null || typeof data.value !== "number") {
    throw new Error(`Parâmetro "${key}" não encontrado em settings.`);
  }
  return data.value;
}

export async function getRetroDeadlineHour(): Promise<number> {
  return getNumberSetting("retro_deadline_hour");
}
