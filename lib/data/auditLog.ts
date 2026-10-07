import { getSupabaseAdmin } from "./supabaseAdmin";

export interface AuditLogEntry {
  actorId: number;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: unknown;
}

/** Toda Server Action de escrita registra aqui (seção 6/10). */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const { error } = await getSupabaseAdmin().from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    payload: entry.payload ?? null,
  });

  if (error) throw new Error(error.message);
}

export interface AuditLogRecord {
  id: number;
  at: string;
  actorId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload: unknown;
}

/** Últimas `limit` entradas do log (seção 8.6: "últimas 200 entradas"). */
export async function listRecentAuditLog(limit: number): Promise<AuditLogRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("audit_log")
    .select("id, at, actor_id, action, entity, entity_id, payload")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    at: row.at,
    actorId: row.actor_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    payload: row.payload,
  }));
}
