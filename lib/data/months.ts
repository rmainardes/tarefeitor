import type { ISODate } from "../domain/dates";
import { getSupabaseAdmin } from "./supabaseAdmin";

/** O mês de `date` já foi fechado (existe linha em `month_results`)? Seção 6. */
export async function isMonthClosed(date: ISODate): Promise<boolean> {
  const monthStart = `${date.slice(0, 7)}-01`;

  const { data, error } = await getSupabaseAdmin()
    .from("month_results")
    .select("month")
    .eq("month", monthStart)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}
