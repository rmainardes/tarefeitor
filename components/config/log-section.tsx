"use client";

import type { AuditLogRecord } from "./config-types";

interface LogSectionProps {
  auditLog: AuditLogRecord[];
  peopleNameById: Map<number, string>;
}

const atFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Log de alterações (seção 8.6: "últimas 200 entradas"). */
export function LogSection({ auditLog, peopleNameById }: LogSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Log de alterações</h2>
      <p className="t-caption text-muted-foreground">Últimas {auditLog.length} entradas, da mais recente à mais antiga.</p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="bg-surface-2">
            <tr>
              <th className="t-caption p-2.5 font-semibold text-muted-foreground">Quando</th>
              <th className="t-caption p-2.5 font-semibold text-muted-foreground">Quem</th>
              <th className="t-caption p-2.5 font-semibold text-muted-foreground">Ação</th>
              <th className="t-caption p-2.5 font-semibold text-muted-foreground">Entidade</th>
              <th className="t-caption p-2.5 font-semibold text-muted-foreground">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="t-caption whitespace-nowrap p-2.5 text-muted-foreground">
                  {atFormatter.format(new Date(entry.at))}
                </td>
                <td className="t-caption whitespace-nowrap p-2.5">
                  {entry.actorId !== null ? peopleNameById.get(entry.actorId) ?? entry.actorId : "—"}
                </td>
                <td className="t-caption whitespace-nowrap p-2.5 font-mono">{entry.action}</td>
                <td className="t-caption whitespace-nowrap p-2.5 text-muted-foreground">
                  {entry.entity}
                  {entry.entityId ? ` · ${entry.entityId}` : ""}
                </td>
                <td className="t-caption max-w-xs truncate p-2.5 text-muted-foreground" title={JSON.stringify(entry.payload)}>
                  {entry.payload ? JSON.stringify(entry.payload) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
