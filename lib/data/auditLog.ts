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
