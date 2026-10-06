// Recorrência e estados de ocorrência (seções 7.1 e 7.2 do plano). Funções puras:
// recebem os dados já lidos do banco e o instante atual; não fazem I/O.

import {
  type ISODate,
  APP_TIMEZONE,
  canMarkRetroactively,
  daysInMonth,
  isWithinRange,
  isoWeekday,
  parseISODate,
} from "./dates";

export type TaskPeriod = "morning" | "afternoon" | "evening" | "anytime";
export type RecurrenceKind = "daily" | "weekly" | "monthly" | "once" | "exam_eve";
export type OccurrenceStatus = "done" | "missed" | "covered" | "excused";

export interface RecurringTask {
  id: string;
  personId: number;
  kind: RecurrenceKind;
  /** ISO 1..7 (segunda..domingo), obrigatório quando `kind === "weekly"`. */
  weekdays: number[] | null;
  /** Obrigatório quando `kind === "monthly"`. */
  monthDay: number | null;
  /** Obrigatório quando `kind === "once"`. */
  onceDate: ISODate | null;
  validFrom: ISODate;
  validTo: ISODate | null;
}

export interface ExamEve {
  personId: number;
  eveDate: ISODate;
}

/** A tarefa é devida em `date`? */
export function isDue(task: RecurringTask, date: ISODate, examEves: readonly ExamEve[]): boolean {
  if (!isWithinRange(date, task.validFrom, task.validTo)) return false;

  switch (task.kind) {
    case "daily":
      return true;
    case "weekly":
      return (task.weekdays ?? []).includes(isoWeekday(date));
    case "monthly": {
      if (task.monthDay == null) return false;
      const { year, month, day } = parseISODate(date);
      const effectiveDay = Math.min(task.monthDay, daysInMonth(year, month));
      return day === effectiveDay;
    }
    case "once":
      return task.onceDate === date;
    case "exam_eve":
      return examEves.some((eve) => eve.personId === task.personId && eve.eveDate === date);
  }
}

export interface OccurrenceRecord {
  status: OccurrenceStatus;
}

export interface DayOffRule {
  personId: number;
  /** `null` = cobre todas as tarefas da pessoa. */
  taskId: string | null;
  dateFrom: ISODate;
  dateTo: ISODate;
}

export function isExcusedByDayOff(
  personId: number,
  taskId: string,
  date: ISODate,
  daysOff: readonly DayOffRule[],
): boolean {
  return daysOff.some(
    (dayOff) =>
      dayOff.personId === personId &&
      (dayOff.taskId === null || dayOff.taskId === taskId) &&
      isWithinRange(date, dayOff.dateFrom, dayOff.dateTo),
  );
}

export type ResolvedOccurrenceState = { kind: "pending" } | { kind: OccurrenceStatus };

/**
 * Estado efetivo de uma ocorrência na leitura (seção 7.2). Sem linha no banco
 * e dentro do prazo: pendente. Sem linha, prazo vencido: perdida. Sem linha,
 * coberta por folga: dispensada. Com linha: o estado gravado.
 */
export function resolveOccurrenceState(params: {
  personId: number;
  taskId: string;
  dueDate: ISODate;
  record: OccurrenceRecord | null;
  daysOff: readonly DayOffRule[];
  now: Date;
  retroDeadlineHour: number;
  timeZone?: string;
}): ResolvedOccurrenceState {
  const { personId, taskId, dueDate, record, daysOff, now, retroDeadlineHour, timeZone } = params;

  if (record) return { kind: record.status };

  if (isExcusedByDayOff(personId, taskId, dueDate, daysOff)) {
    return { kind: "excused" };
  }

  const stillWithinDeadline = canMarkRetroactively(
    dueDate,
    now,
    retroDeadlineHour,
    timeZone ?? APP_TIMEZONE,
  );
  return stillWithinDeadline ? { kind: "pending" } : { kind: "missed" };
}
