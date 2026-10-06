import { beforeEach, describe, expect, it, vi } from "vitest";

const findTaskOwner = vi.fn();
const insertTask = vi.fn();
const findOccurrence = vi.fn();
const upsertOccurrence = vi.fn();
const deleteOccurrence = vi.fn();
const listCoverableTasks = vi.fn();
const isMonthClosed = vi.fn();
const getRetroDeadlineHour = vi.fn();
const personExists = vi.fn();
const recordAuditLog = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/data/tasks", () => ({ findTaskOwner, insertTask }));
vi.mock("@/lib/data/taskOccurrences", () => ({
  findOccurrence,
  upsertOccurrence,
  deleteOccurrence,
}));
vi.mock("@/lib/data/occurrenceResolution", () => ({ listCoverableTasks }));
vi.mock("@/lib/data/months", () => ({ isMonthClosed }));
vi.mock("@/lib/data/settings", () => ({ getRetroDeadlineHour }));
vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("@/lib/data/auditLog", () => ({ recordAuditLog }));

const { markDone, undoMark, markMissed, coverTask, createTask, getCoverableTasks } = await import(
  "@/app/actions/tasks"
);
const { MonthClosedError } = await import("@/lib/data/errors");

const TASK_ID = "550e8400-e29b-41d4-a716-446655440000";
const DUE_DATE = "2026-10-05";
const OWNER_ID = 1;
const OTHER_ID = 2;

beforeEach(() => {
  vi.clearAllMocks();
  findTaskOwner.mockResolvedValue({ id: TASK_ID, personId: OWNER_ID, weight: 1 });
  findOccurrence.mockResolvedValue(null);
  isMonthClosed.mockResolvedValue(false);
  getRetroDeadlineHour.mockResolvedValue(23);
  personExists.mockResolvedValue(true);
  upsertOccurrence.mockResolvedValue(undefined);
  deleteOccurrence.mockResolvedValue(undefined);
  recordAuditLog.mockResolvedValue(undefined);
  insertTask.mockResolvedValue(TASK_ID);
  listCoverableTasks.mockResolvedValue([]);
});

describe("markDone", () => {
  it("marca a tarefa quando o ator é o dono, dentro do prazo e mês aberto", async () => {
    const result = await markDone({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(upsertOccurrence).toHaveBeenCalledWith({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      status: "done",
      doneBy: OWNER_ID,
      markedBy: OWNER_ID,
      note: null,
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "markDone", actorId: OWNER_ID }),
    );
  });

  it("rejeita entrada inválida sem consultar o banco", async () => {
    const result = await markDone({ taskId: "não-é-uuid", dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(findTaskOwner).not.toHaveBeenCalled();
  });

  it("rejeita quando o ator não é o dono da tarefa", async () => {
    const result = await markDone({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OTHER_ID });

    expect(result).toEqual({ ok: false, code: "NOT_OWNER", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o prazo já passou", async () => {
    getRetroDeadlineHour.mockResolvedValue(23);
    const result = await markDone({ taskId: TASK_ID, dueDate: "2000-01-01", actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "DEADLINE_PASSED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o mês já foi fechado", async () => {
    isMonthClosed.mockResolvedValue(true);
    const result = await markDone({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando a tarefa não existe", async () => {
    findTaskOwner.mockResolvedValue(null);
    const result = await markDone({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "TASK_NOT_FOUND", message: expect.any(String) });
  });

  it("traduz MonthClosedError do gatilho do banco para MONTH_CLOSED", async () => {
    upsertOccurrence.mockRejectedValue(new MonthClosedError("mês fechado"));
    const result = await markDone({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
  });
});

describe("undoMark", () => {
  it("remove a marcação quando ela existe e ainda está no prazo", async () => {
    findOccurrence.mockResolvedValue({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      status: "done",
      doneBy: OWNER_ID,
      markedBy: OWNER_ID,
      note: null,
    });

    const result = await undoMark({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(deleteOccurrence).toHaveBeenCalledWith(TASK_ID, DUE_DATE);
  });

  it("rejeita quando não há marcação para desfazer", async () => {
    findOccurrence.mockResolvedValue(null);
    const result = await undoMark({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "OCCURRENCE_NOT_FOUND", message: expect.any(String) });
    expect(deleteOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o prazo já passou", async () => {
    findOccurrence.mockResolvedValue({
      taskId: TASK_ID,
      dueDate: "2000-01-01",
      status: "done",
      doneBy: OWNER_ID,
      markedBy: OWNER_ID,
      note: null,
    });

    const result = await undoMark({ taskId: TASK_ID, dueDate: "2000-01-01", actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "DEADLINE_PASSED", message: expect.any(String) });
    expect(deleteOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o mês já foi fechado", async () => {
    findOccurrence.mockResolvedValue({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      status: "done",
      doneBy: OWNER_ID,
      markedBy: OWNER_ID,
      note: null,
    });
    isMonthClosed.mockResolvedValue(true);

    const result = await undoMark({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(deleteOccurrence).not.toHaveBeenCalled();
  });
});

describe("markMissed", () => {
  it("marca como não cumprida, de qualquer pessoa, sem checar prazo", async () => {
    const result = await markMissed({
      taskId: TASK_ID,
      dueDate: "2000-01-01",
      actorId: OTHER_ID,
      note: "esqueceu",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(upsertOccurrence).toHaveBeenCalledWith({
      taskId: TASK_ID,
      dueDate: "2000-01-01",
      status: "missed",
      doneBy: null,
      markedBy: OTHER_ID,
      note: "esqueceu",
    });
  });

  it("rejeita nota acima de 280 caracteres", async () => {
    const result = await markMissed({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      actorId: OTHER_ID,
      note: "a".repeat(281),
    });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o mês já foi fechado", async () => {
    isMonthClosed.mockResolvedValue(true);
    const result = await markMissed({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OTHER_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando a pessoa não existe", async () => {
    personExists.mockResolvedValue(false);
    const result = await markMissed({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: 99 });

    expect(result).toEqual({ ok: false, code: "PERSON_NOT_FOUND", message: expect.any(String) });
  });
});

describe("coverTask", () => {
  it("cobre uma ocorrência pendente de outra pessoa", async () => {
    const result = await coverTask({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OTHER_ID });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(upsertOccurrence).toHaveBeenCalledWith({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      status: "covered",
      doneBy: OTHER_ID,
      markedBy: OTHER_ID,
      note: null,
    });
  });

  it("rejeita quando o dono tenta cobrir a própria tarefa", async () => {
    const result = await coverTask({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OWNER_ID });

    expect(result).toEqual({ ok: false, code: "IS_OWNER", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando a ocorrência já foi resolvida", async () => {
    findOccurrence.mockResolvedValue({
      taskId: TASK_ID,
      dueDate: DUE_DATE,
      status: "done",
      doneBy: OWNER_ID,
      markedBy: OWNER_ID,
      note: null,
    });

    const result = await coverTask({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OTHER_ID });

    expect(result).toEqual({ ok: false, code: "ALREADY_RESOLVED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o prazo já passou", async () => {
    const result = await coverTask({ taskId: TASK_ID, dueDate: "2000-01-01", actorId: OTHER_ID });

    expect(result).toEqual({ ok: false, code: "DEADLINE_PASSED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("rejeita quando o mês já foi fechado", async () => {
    isMonthClosed.mockResolvedValue(true);
    const result = await coverTask({ taskId: TASK_ID, dueDate: DUE_DATE, actorId: OTHER_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });
});

describe("createTask", () => {
  const dailyInput = {
    personId: OWNER_ID,
    title: "Regar as plantas",
    period: "anytime",
    weight: 1,
    kind: "daily",
    weekdays: null,
    createdBy: OWNER_ID,
  };

  it("cria uma tarefa diária", async () => {
    const result = await createTask(dailyInput);

    expect(result).toEqual({ ok: true, data: { id: TASK_ID } });
    expect(insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ personId: OWNER_ID, title: "Regar as plantas", kind: "daily", weekdays: null }),
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "createTask", actorId: OWNER_ID }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("cria uma tarefa semanal com os dias informados", async () => {
    const result = await createTask({ ...dailyInput, kind: "weekly", weekdays: [1, 3, 5] });

    expect(result).toEqual({ ok: true, data: { id: TASK_ID } });
    expect(insertTask).toHaveBeenCalledWith(expect.objectContaining({ kind: "weekly", weekdays: [1, 3, 5] }));
  });

  it("rejeita semanal sem nenhum dia", async () => {
    const result = await createTask({ ...dailyInput, kind: "weekly", weekdays: [] });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(insertTask).not.toHaveBeenCalled();
  });

  it("rejeita título vazio", async () => {
    const result = await createTask({ ...dailyInput, title: "" });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(insertTask).not.toHaveBeenCalled();
  });

  it("rejeita peso fora de 1-3", async () => {
    const result = await createTask({ ...dailyInput, weight: 5 });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(insertTask).not.toHaveBeenCalled();
  });

  it("rejeita pessoa inexistente", async () => {
    personExists.mockResolvedValue(false);
    const result = await createTask(dailyInput);

    expect(result).toEqual({ ok: false, code: "PERSON_NOT_FOUND", message: expect.any(String) });
    expect(insertTask).not.toHaveBeenCalled();
  });
});

describe("getCoverableTasks", () => {
  it("devolve as tarefas pendentes das outras pessoas", async () => {
    const tasks = [{ taskId: TASK_ID, title: "Tirar o lixo", personId: OTHER_ID, personName: "Vania" }];
    listCoverableTasks.mockResolvedValue(tasks);

    const result = await getCoverableTasks(OWNER_ID);

    expect(result).toBe(tasks);
    expect(listCoverableTasks).toHaveBeenCalledWith(OWNER_ID, expect.any(String), expect.any(Date));
  });

  it("devolve lista vazia para um id inválido, sem consultar o banco", async () => {
    const result = await getCoverableTasks(-1);

    expect(result).toEqual([]);
    expect(listCoverableTasks).not.toHaveBeenCalled();
  });
});
