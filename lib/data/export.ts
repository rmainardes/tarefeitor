// Exportação manual em JSON (seção 8.6/11): cópia de segurança completa, já
// que o plano gratuito do Supabase não oferece backup automático.

import { getSupabaseAdmin } from "./supabaseAdmin";

const EXPORTED_TABLES = [
  "people",
  "tasks",
  "task_occurrences",
  "exam_eves",
  "extras",
  "reports",
  "votes",
  "days_off",
  "birthdays",
  "settings",
  "month_results",
  "month_scores",
  "audit_log",
] as const;

export interface DataExport {
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** Lê todas as tabelas da seção 6 para o backup manual em JSON. */
export async function exportAllData(): Promise<DataExport> {
  const supabase = getSupabaseAdmin();

  const results = await Promise.all(
    EXPORTED_TABLES.map((table) => supabase.from(table).select("*")),
  );

  const tables: Record<string, unknown[]> = {};
  EXPORTED_TABLES.forEach((table, index) => {
    const { data, error } = results[index];
    if (error) throw new Error(error.message);
    tables[table] = data ?? [];
  });

  return { exportedAt: new Date().toISOString(), tables };
}
