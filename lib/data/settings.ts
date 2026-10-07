import type { QuietHours } from "../domain/dates";
import { getSupabaseAdmin } from "./supabaseAdmin";

async function getSettingValue(key: string): Promise<unknown> {
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data === null) {
    throw new Error(`Parâmetro "${key}" não encontrado em settings.`);
  }
  return data.value;
}

/** Lê um parâmetro numérico de `settings` (seção 6). Lança se não existir. */
export async function getNumberSetting(key: string): Promise<number> {
  const value = await getSettingValue(key);
  if (typeof value !== "number") {
    throw new Error(`Parâmetro "${key}" não é numérico em settings.`);
  }
  return value;
}

/** Lê um parâmetro booleano de `settings` (seção 6). Lança se não existir. */
export async function getBooleanSetting(key: string): Promise<boolean> {
  const value = await getSettingValue(key);
  if (typeof value !== "boolean") {
    throw new Error(`Parâmetro "${key}" não é booleano em settings.`);
  }
  return value;
}

export async function getRetroDeadlineHour(): Promise<number> {
  return getNumberSetting("retro_deadline_hour");
}

/** Interruptor global de som (seção 8.4/8.6), inicialmente `true`. */
export async function isSoundEnabled(): Promise<boolean> {
  return getBooleanSetting("sound_enabled");
}

/** Silêncio noturno (seção 6: `quiet_hours`, ex.: `{ from: 22, to: 7 }`). */
export async function getQuietHours(): Promise<QuietHours> {
  const value = await getSettingValue("quiet_hours");
  if (typeof value !== "object" || value === null) {
    throw new Error('Parâmetro "quiet_hours" malformado em settings.');
  }
  const { from, to } = value as Record<string, unknown>;
  if (typeof from !== "number" || typeof to !== "number") {
    throw new Error('Parâmetro "quiet_hours" malformado em settings.');
  }
  return { from, to };
}
