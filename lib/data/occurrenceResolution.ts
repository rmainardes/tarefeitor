// Monta a lista de tarefas devidas por uma pessoa em um conjunto de datas,
// já com o estado de cada ocorrência resolvido (seção 7.2). Usado pelo Painel
// (lista de hoje/ontem) e pelo placar (percentual do mês corrente).

import type { ISODate } from "../domain/dates";
import {
  isDue,
  resolveOccurrenceState,
  type DayOffRule,
  type ExamEve,
  type OccurrenceRecord,
  type RecurrenceKind,
  type RecurringTask,
  type ResolvedOccurrenceState,
  type TaskPeriod,
} from "../domain/recurrence";
import { getRetroDeadlineHour } from "./settings";
import { getSupabaseAdmin } from "./supabaseAdmin";

export interface TaskListItem {
  id: string;
  title: string;
  icon: string;
  imagePath: string | null;
  period: TaskPeriod;
  weight: number;
  sortOrder: number;
}

export interface ResolvedTask {
  task: TaskListItem;
  dueDate: ISODate;
  state: ResolvedOccurrenceState;
  doneBy: number | null;
  /** Existe linha em `task_occurrences` (distingue "perdida" implícita de explícita). */
  hasRecord: boolean;
}

interface TaskRow {
  id: string;
  person_id: number;
  title: string;
  icon: string;
  image_path: string | null;
  period: TaskPeriod;
  weight: number;
  kind: RecurrenceKind;
  weekdays: number[] | null;
  month_day: number | null;
  once_date: ISODate | null;
  valid_from: ISODate;
  valid_to: ISODate | null;
  sort_order: number;
}

function toDomainTask(row: TaskRow): RecurringTask {
  return {
    id: row.id,
    personId: row.person_id,
    kind: row.kind,
    weekdays: row.weekdays,
    monthDay: row.month_day,
    onceDate: row.once_date,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

/**
 * Tarefas devidas por `personId` em cada data de `dates`, com o estado de
 * cada ocorrência já resolvido (pendente/feita/não cumprida/coberta/dispensada).
 */
export async function resolvePersonOccurrences(
  personId: number,
  dates: readonly ISODate[],
  now: Date,
): Promise<ResolvedTask[]> {
  if (dates.length === 0) return [];

  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));
  const supabase = getSupabaseAdmin();

  const [tasksResult, examEvesResult, daysOffResult, retroDeadlineHour] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, person_id, title, icon, image_path, period, weight, kind, weekdays, month_day, once_date, valid_from, valid_to, sort_order",
      )
      .eq("person_id", personId)
      .lte("valid_from", maxDate)
      .or(`valid_to.is.null,valid_to.gte.${minDate}`),
    supabase.from("exam_eves").select("person_id, eve_date").eq("person_id", personId).in("eve_date", dates),
    supabase
      .from("days_off")
      .select("person_id, task_id, date_from, date_to")
      .eq("person_id", personId)
      .lte("date_from", maxDate)
      .gte("date_to", minDate),
    getRetroDeadlineHour(),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (examEvesResult.error) throw new Error(examEvesResult.error.message);
  if (daysOffResult.error) throw new Error(daysOffResult.error.message);

  const taskRows = (tasksResult.data ?? []) as TaskRow[];
  const examEves: ExamEve[] = (examEvesResult.data ?? []).map((row) => ({
    personId: row.person_id,
    eveDate: row.eve_date,
  }));
  const daysOff: DayOffRule[] = (daysOffResult.data ?? []).map((row) => ({
    personId: row.person_id,
    taskId: row.task_id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
  }));

  const taskIds = taskRows.map((row) => row.id);
  const occurrenceMap = new Map<string, OccurrenceRecord & { doneBy: number | null }>();

  if (taskIds.length > 0) {
    const { data: occurrenceRows, error } = await supabase
      .from("task_occurrences")
      .select("task_id, due_date, status, done_by")
      .in("task_id", taskIds)
      .in("due_date", dates);

    if (error) throw new Error(error.message);

    for (const row of occurrenceRows ?? []) {
      occurrenceMap.set(`${row.task_id}:${row.due_date}`, { status: row.status, doneBy: row.done_by });
    }
  }

  const result: ResolvedTask[] = [];

  for (const date of dates) {
    for (const row of taskRows) {
      const domainTask = toDomainTask(row);
      if (!isDue(domainTask, date, examEves)) continue;

      const record = occurrenceMap.get(`${row.id}:${date}`) ?? null;
      const state = resolveOccurrenceState({
        personId,
        taskId: row.id,
        dueDate: date,
        record,
        daysOff,
        now,
        retroDeadlineHour,
      });

      result.push({
        task: {
          id: row.id,
          title: row.title,
          icon: row.icon,
          imagePath: row.image_path,
          period: row.period,
          weight: row.weight,
          sortOrder: row.sort_order,
        },
        dueDate: date,
        state,
        doneBy: record?.doneBy ?? null,
        hasRecord: record !== null,
      });
    }
  }

  return result.sort((a, b) => a.task.sortOrder - b.task.sortOrder);
}
