"use server";

// Server Action de exportação (seção 8.6/11, T13): cópia de segurança
// manual em JSON. É leitura, não escrita — sem log nem broadcast.

import { exportAllData, type DataExport } from "@/lib/data/export";

export async function exportData(): Promise<DataExport> {
  return exportAllData();
}
