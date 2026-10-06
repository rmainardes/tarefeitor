"use server";

// Server Actions de tarefas (seção 10): markDone, undoMark, markMissed,
// coverTask. Todas validam a entrada, verificam mês aberto e prazo, gravam,
// registram em audit_log e revalidam o Painel. Broadcast (seção 8.4) fica
// para a T10.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { toISODate, canMarkRetroactively, type ISODate } from "@/lib/domain/dates";
import { isMonthClosed } from "@/lib/data/months";
import { personExists } from "@/lib/data/people";
import { getRetroDeadlineHour } from "@/lib/data/settings";
import {
  findTaskOwner,
  insertTask,
  type NewTaskInput,
  type TaskOwnerRecord,
} from "@/lib/data/tasks";
import {
  deleteOccurrence,
  findOccurrence,
  upsertOccurrence,
} from "@/lib/data/taskOccurrences";
import {
  listCoverableTasks,
  type CoverableTask,
} from "@/lib/data/occurrenceResolution";
import { MonthClosedError } from "@/lib/data/errors";
import {
  actionError,
  actionOk,
  isISODate,
  isPersonId,
  isTaskPeriod,
  isTaskWeight,
  isUuid,
  isValidNote,
  isValidTaskTitle,
  isWeekdayList,
  type ActionResult,
} from "@/lib/validation";

interface TaskOccurrenceInput {
  taskId: string;
  dueDate: ISODate;
  actorId: number;
}

function validateTaskOccurrenceInput(
  input: unknown,
): input is TaskOccurrenceInput {
  if (typeof input !== "object" || input === null) return false;
  const { taskId, dueDate, actorId } = input as Record<string, unknown>;
  return isUuid(taskId) && isISODate(dueDate) && isPersonId(actorId);
}

/** Erro inesperado do banco: loga tudo no servidor, expõe só um código genérico. */
function toInternalError<T = void>(error: unknown): ActionResult<T> {
  console.error("Erro inesperado em Server Action de tarefas:", error);
  if (error instanceof MonthClosedError) {
    return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
  }
  return actionError("INTERNAL_ERROR", "Não foi possível completar a ação. Tente novamente.");
}

async function loadTaskOrError(
  taskId: string,
): Promise<{ task: TaskOwnerRecord } | ActionResult> {
  const task = await findTaskOwner(taskId);
  if (!task) return actionError("TASK_NOT_FOUND", "Tarefa não encontrada.");
  return { task };
}

async function assertMonthOpenOrError(dueDate: ISODate): Promise<ActionResult | null> {
  if (await isMonthClosed(dueDate)) {
    return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
  }
  return null;
}

async function assertWithinDeadlineOrError(dueDate: ISODate): Promise<ActionResult | null> {
  const retroDeadlineHour = await getRetroDeadlineHour();
  if (!canMarkRetroactively(dueDate, new Date(), retroDeadlineHour)) {
    return actionError("DEADLINE_PASSED", "O prazo para marcar essa tarefa já passou.");
  }
  return null;
}

/** "Fiz": o dono marca a própria tarefa como feita. Dentro do prazo; ator = dono. */
export async function markDone(input: unknown): Promise<ActionResult> {
  if (!validateTaskOccurrenceInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, dueDate, actorId } = input;

  try {
    const loaded = await loadTaskOrError(taskId);
    if ("ok" in loaded) return loaded;
    const { task } = loaded;

    if (actorId !== task.personId) {
      return actionError("NOT_OWNER", "Só o dono da tarefa pode marcar \"Fiz\".");
    }

    const deadlineError = await assertWithinDeadlineOrError(dueDate);
    if (deadlineError) return deadlineError;

    const monthError = await assertMonthOpenOrError(dueDate);
    if (monthError) return monthError;

    await upsertOccurrence({
      taskId,
      dueDate,
      status: "done",
      doneBy: actorId,
      markedBy: actorId,
      note: null,
    });

    await recordAuditLog({
      actorId,
      action: "markDone",
      entity: "task_occurrences",
      entityId: `${taskId}:${dueDate}`,
      payload: { taskId, dueDate },
    });

    revalidatePath("/");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

/** Desfaz uma marcação, voltando a ocorrência para "pendente". Dentro do prazo. */
export async function undoMark(input: unknown): Promise<ActionResult> {
  if (!validateTaskOccurrenceInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, dueDate, actorId } = input;

  try {
    const occurrence = await findOccurrence(taskId, dueDate);
    if (!occurrence) {
      return actionError("OCCURRENCE_NOT_FOUND", "Essa marcação não existe.");
    }

    const deadlineError = await assertWithinDeadlineOrError(dueDate);
    if (deadlineError) return deadlineError;

    const monthError = await assertMonthOpenOrError(dueDate);
    if (monthError) return monthError;

    await deleteOccurrence(taskId, dueDate);

    await recordAuditLog({
      actorId,
      action: "undoMark",
      entity: "task_occurrences",
      entityId: `${taskId}:${dueDate}`,
      payload: { taskId, dueDate, previousStatus: occurrence.status },
    });

    revalidatePath("/");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

interface MarkMissedInput extends TaskOccurrenceInput {
  note?: string | null;
}

/** "Não cumprida": qualquer pessoa pode marcar, direto, sem prazo. */
export async function markMissed(input: unknown): Promise<ActionResult> {
  if (!validateTaskOccurrenceInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { note } = input as Partial<MarkMissedInput>;
  if (!isValidNote(note)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, dueDate, actorId } = input;

  try {
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const loaded = await loadTaskOrError(taskId);
    if ("ok" in loaded) return loaded;

    const monthError = await assertMonthOpenOrError(dueDate);
    if (monthError) return monthError;

    await upsertOccurrence({
      taskId,
      dueDate,
      status: "missed",
      doneBy: null,
      markedBy: actorId,
      note: note ?? null,
    });

    await recordAuditLog({
      actorId,
      action: "markMissed",
      entity: "task_occurrences",
      entityId: `${taskId}:${dueDate}`,
      payload: { taskId, dueDate, note: note ?? null },
    });

    revalidatePath("/");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

/** "Fiz para": outra pessoa cobre uma ocorrência pendente do dono. Ator ≠ dono. */
export async function coverTask(input: unknown): Promise<ActionResult> {
  if (!validateTaskOccurrenceInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, dueDate, actorId } = input;

  try {
    const loaded = await loadTaskOrError(taskId);
    if ("ok" in loaded) return loaded;
    const { task } = loaded;

    if (actorId === task.personId) {
      return actionError("IS_OWNER", "O dono da tarefa não pode usar \"Fiz para\".");
    }
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const existing = await findOccurrence(taskId, dueDate);
    if (existing) {
      return actionError("ALREADY_RESOLVED", "Essa ocorrência já foi resolvida.");
    }

    const deadlineError = await assertWithinDeadlineOrError(dueDate);
    if (deadlineError) return deadlineError;

    const monthError = await assertMonthOpenOrError(dueDate);
    if (monthError) return monthError;

    await upsertOccurrence({
      taskId,
      dueDate,
      status: "covered",
      doneBy: actorId,
      markedBy: actorId,
      note: null,
    });

    await recordAuditLog({
      actorId,
      action: "coverTask",
      entity: "task_occurrences",
      entityId: `${taskId}:${dueDate}`,
      payload: { taskId, dueDate },
    });

    revalidatePath("/");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

interface CreateTaskInput {
  personId: number;
  title: string;
  period: NewTaskInput["period"];
  weight: 1 | 2 | 3;
  kind: "daily" | "weekly";
  weekdays: number[] | null;
  createdBy: number;
}

function validateCreateTaskInput(input: unknown): input is CreateTaskInput {
  if (typeof input !== "object" || input === null) return false;
  const { personId, title, period, weight, kind, weekdays, createdBy } = input as Record<string, unknown>;
  if (!isPersonId(personId) || !isPersonId(createdBy)) return false;
  if (!isValidTaskTitle(title)) return false;
  if (!isTaskPeriod(period)) return false;
  if (!isTaskWeight(weight)) return false;
  if (kind !== "daily" && kind !== "weekly") return false;
  if (kind === "weekly" && !isWeekdayList(weekdays)) return false;
  if (kind === "daily" && weekdays !== null) return false;
  return true;
}

/** "Nova tarefa": recorrência diária ou semanal só (mensal/avulsa ficam para Configurações, T13). */
export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateCreateTaskInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { personId, title, period, weight, kind, weekdays, createdBy } = input;

  try {
    if (!(await personExists(personId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const id = await insertTask({
      personId,
      title,
      period,
      weight,
      kind,
      weekdays: kind === "weekly" ? weekdays : null,
      validFrom: toISODate(new Date()),
      createdBy,
    });

    await recordAuditLog({
      actorId: createdBy,
      action: "createTask",
      entity: "tasks",
      entityId: id,
      payload: { personId, title, period, weight, kind, weekdays },
    });

    revalidatePath("/");
    return actionOk({ id });
  } catch (error) {
    return toInternalError(error);
  }
}

/** Tarefas pendentes de hoje das outras pessoas, para o diálogo "Fiz para o/a X". */
export async function getCoverableTasks(actorId: number): Promise<CoverableTask[]> {
  if (!isPersonId(actorId)) return [];
  return listCoverableTasks(actorId, toISODate(new Date()), new Date());
}
