// Tipos compartilhados pela tela de Configurações (seção 8.6, T13).

import type { AuditLogRecord } from "@/lib/data/auditLog";
import type { BirthdayRecord } from "@/lib/data/birthdays";
import type { DayOffRecord } from "@/lib/data/daysOff";
import type { ConfigTaskRecord } from "@/lib/data/tasks";

export interface ConfigPerson {
  id: number;
  name: string;
  color: string;
  /** O link em si nunca chega ao cliente (seção 11) — só se já está configurado. */
  hasIcalUrl: boolean;
  examKeywords: string[];
}

export type { AuditLogRecord, BirthdayRecord, ConfigTaskRecord, DayOffRecord };
