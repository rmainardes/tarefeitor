import type { ISODate } from "../domain/dates";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * Extras e deduradas do mês corrente, ainda sem decisão (seção 7.3: "em
 * julgamento"). Até a T11 trazer os votos, tudo que existe no mês aberto
 * conta aqui — não há como ainda estar julgado.
 */
export async function countPendingJudgments(monthStart: ISODate, today: ISODate): Promise<number> {
  const supabase = getSupabaseAdmin();

  const [extras, reports] = await Promise.all([
    supabase
      .from("extras")
      .select("id", { count: "exact", head: true })
      .gte("happened_on", monthStart)
      .lte("happened_on", today),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("happened_on", monthStart)
      .lte("happened_on", today),
  ]);

  if (extras.error) throw new Error(extras.error.message);
  if (reports.error) throw new Error(reports.error.message);

  return (extras.count ?? 0) + (reports.count ?? 0);
}
