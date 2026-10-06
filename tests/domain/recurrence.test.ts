import { describe, expect, it } from "vitest";
import {
  isDue,
  isExcusedByDayOff,
  resolveOccurrenceState,
  type RecurringTask,
} from "@/lib/domain/recurrence";

function baseTask(overrides: Partial<RecurringTask>): RecurringTask {
  return {
    id: "task-1",
    personId: 1,
    kind: "daily",
    weekdays: null,
    monthDay: null,
    onceDate: null,
    validFrom: "2026-01-01",
    validTo: null,
    ...overrides,
  };
}

describe("isDue", () => {
  it("daily é devida todos os dias dentro da validade", () => {
    const task = baseTask({ kind: "daily" });
    expect(isDue(task, "2026-10-05", [])).toBe(true);
    expect(isDue(task, "2026-12-25", [])).toBe(true);
  });

  it("weekly só é devida nos dias ISO configurados", () => {
    // 2026-10-05 é segunda (1), 2026-10-06 é terça (2), 2026-10-08 é quinta (4)
    const task = baseTask({ kind: "weekly", weekdays: [2, 4] });
    expect(isDue(task, "2026-10-05", [])).toBe(false);
    expect(isDue(task, "2026-10-06", [])).toBe(true);
    expect(isDue(task, "2026-10-08", [])).toBe(true);
  });

  it("monthly usa o último dia do mês quando ele é mais curto que month_day", () => {
    // Abril de 2026 tem 30 dias
    const task = baseTask({ kind: "monthly", monthDay: 31 });
    expect(isDue(task, "2026-04-30", [])).toBe(true);
    expect(isDue(task, "2026-04-29", [])).toBe(false);
    // Em um mês com 31 dias, vale o dia 31 mesmo
    expect(isDue(task, "2026-01-31", [])).toBe(true);
    expect(isDue(task, "2026-01-30", [])).toBe(false);
  });

  it("once só é devida na data exata", () => {
    const task = baseTask({ kind: "once", onceDate: "2026-10-10" });
    expect(isDue(task, "2026-10-10", [])).toBe(true);
    expect(isDue(task, "2026-10-09", [])).toBe(false);
    expect(isDue(task, "2026-10-11", [])).toBe(false);
  });

  it("exam_eve depende de existir véspera para a pessoa, mesmo em domingo", () => {
    // 2026-10-04 é domingo: prova na segunda gera estudo no domingo
    const task = baseTask({ kind: "exam_eve", personId: 1 });
    const examEves = [{ personId: 1, eveDate: "2026-10-04" }];
    expect(isDue(task, "2026-10-04", examEves)).toBe(true);
    expect(isDue(task, "2026-10-03", examEves)).toBe(false);
    // Véspera de outra pessoa não conta
    expect(isDue(baseTask({ kind: "exam_eve", personId: 2 }), "2026-10-04", examEves)).toBe(false);
  });

  it("respeita os limites de valid_from e valid_to", () => {
    const task = baseTask({ kind: "daily", validFrom: "2026-05-01", validTo: "2026-05-31" });
    expect(isDue(task, "2026-04-30", [])).toBe(false);
    expect(isDue(task, "2026-05-01", [])).toBe(true);
    expect(isDue(task, "2026-05-31", [])).toBe(true);
    expect(isDue(task, "2026-06-01", [])).toBe(false);
  });
});

describe("isExcusedByDayOff", () => {
  const dayOff = {
    personId: 1,
    taskId: null,
    dateFrom: "2026-10-10",
    dateTo: "2026-10-12",
  };

  it("cobre todas as tarefas da pessoa quando task_id é nulo", () => {
    expect(isExcusedByDayOff(1, "task-1", "2026-10-11", [dayOff])).toBe(true);
    expect(isExcusedByDayOff(1, "task-2", "2026-10-11", [dayOff])).toBe(true);
  });

  it("não cobre outra pessoa nem datas fora do período", () => {
    expect(isExcusedByDayOff(2, "task-1", "2026-10-11", [dayOff])).toBe(false);
    expect(isExcusedByDayOff(1, "task-1", "2026-10-13", [dayOff])).toBe(false);
  });

  it("quando task_id é informado, só cobre aquela tarefa", () => {
    const specific = { ...dayOff, taskId: "task-1" };
    expect(isExcusedByDayOff(1, "task-1", "2026-10-11", [specific])).toBe(true);
    expect(isExcusedByDayOff(1, "task-2", "2026-10-11", [specific])).toBe(false);
  });
});

describe("resolveOccurrenceState", () => {
  const dueDate = "2026-10-05";
  const retroDeadlineHour = 23;

  it("usa o estado gravado quando existe linha", () => {
    const state = resolveOccurrenceState({
      personId: 1,
      taskId: "task-1",
      dueDate,
      record: { status: "done" },
      daysOff: [],
      now: new Date(Date.UTC(2026, 9, 5, 13, 0)),
      retroDeadlineHour,
    });
    expect(state).toEqual({ kind: "done" });
  });

  it("é pendente sem linha e dentro do prazo", () => {
    const state = resolveOccurrenceState({
      personId: 1,
      taskId: "task-1",
      dueDate,
      record: null,
      daysOff: [],
      now: new Date(Date.UTC(2026, 9, 5, 13, 0)),
      retroDeadlineHour,
    });
    expect(state).toEqual({ kind: "pending" });
  });

  it("é perdida sem linha depois do prazo retroativo", () => {
    // 2026-10-07T02:30Z = 2026-10-06T23:30 em São Paulo (depois das 23h de D+1)
    const state = resolveOccurrenceState({
      personId: 1,
      taskId: "task-1",
      dueDate,
      record: null,
      daysOff: [],
      now: new Date(Date.UTC(2026, 9, 7, 2, 30)),
      retroDeadlineHour,
    });
    expect(state).toEqual({ kind: "missed" });
  });

  it("é dispensada quando coberta por folga e sem linha", () => {
    const state = resolveOccurrenceState({
      personId: 1,
      taskId: "task-1",
      dueDate,
      record: null,
      daysOff: [{ personId: 1, taskId: null, dateFrom: "2026-10-01", dateTo: "2026-10-31" }],
      now: new Date(Date.UTC(2026, 9, 5, 13, 0)),
      retroDeadlineHour,
    });
    expect(state).toEqual({ kind: "excused" });
  });
});
