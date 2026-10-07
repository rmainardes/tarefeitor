// Contrato do canal de tempo real (seção 8.4): compartilhado pelo servidor
// (`lib/data/broadcast.ts`, que emite) e pelo cliente (`use-realtime-updates`,
// que escuta). Só tipos e constantes — sem I/O, importável dos dois lados.

export const REALTIME_TOPIC = "panel";
export const REALTIME_EVENT = "changed";

export type ChangeType =
  | "task_done"
  | "task_undone"
  | "task_missed"
  | "task_covered"
  | "task_created"
  | "extra_created"
  | "report_created"
  | "birthday_created"
  | "vote_cast"
  | "defense_set"
  | "month_closed"
  | "punishment_spun";

/** Payload mínimo do broadcast — "e nada mais" (seção 8.4). */
export interface ChangeEvent {
  type: ChangeType;
  personId: number;
}
