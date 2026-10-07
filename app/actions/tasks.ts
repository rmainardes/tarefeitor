"use server";

// Server Actions de tarefas (seção 10): markDone, undoMark, markMissed,
// coverTask, createTask e, para a tela de Configurações (T13), updateTask,
// endTask e overrideOccurrence. Todas validam a entrada, verificam mês
// aberto e prazo, gravam, registram em audit_log, emitem o broadcast em
// tempo real (seção 8.4) e revalidam as páginas afetadas.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { addDays, toISODate, canMarkRetroactively, type ISODate } from "@/lib/domain/dates";
import { needsNewTaskVersion } from "@/lib/domain/taskVersioning";
import { isMonthClosed } from "@/lib/data/months";
import { personExists } from "@/lib/data/people";
import { getRetroDeadlineHour } from "@/lib/data/settings";
import {
  endTask as endTaskRecord,
  findConfigTask,
  findTaskOwner,
  insertConfigTask,
  insertTask,
  reviseTask,
  updateTaskInPlace,
  type ConfigTaskRecord,
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
  isDayOfMonth,
  isISODate,
  isOccurrenceOverrideStatus,
  isPersonId,
  isRecurrenceKind,
  isTaskPeriod,
  isTaskWeight,
  isUuid,
  isValidImagePath,
  isValidLeadDays,
  isValidMandatoryReason,
  isValidNote,
  isValidSortOrder,
  isValidTaskIcon,
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
    await broadcastChanged({ type: "task_done", personId: actorId });

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
    await broadcastChanged({ type: "task_undone", personId: actorId });

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
    await broadcastChanged({ type: "task_missed", personId: actorId });

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
    await broadcastChanged({ type: "task_covered", personId: actorId });

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
    await broadcastChanged({ type: "task_created", personId: createdBy });

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

interface ConfigTaskFields {
  personId: number;
  title: string;
  icon: string;
  imagePath: string | null;
  period: NewTaskInput["period"];
  weight: 1 | 2 | 3;
  kind: "daily" | "weekly" | "monthly" | "once" | "exam_eve";
  weekdays: number[] | null;
  monthDay: number | null;
  onceDate: ISODate | null;
  leadDays: number;
  sortOrder: number;
}

/** Validação de campos de tarefa comum à criação e à edição (tela de Configurações). */
function isValidConfigTaskFields(value: Record<string, unknown>): boolean {
  const { personId, title, icon, imagePath, period, weight, kind, weekdays, monthDay, onceDate, leadDays, sortOrder } =
    value;

  if (!isPersonId(personId)) return false;
  if (!isValidTaskTitle(title) || !isValidTaskIcon(icon) || !isValidImagePath(imagePath)) return false;
  if (!isTaskPeriod(period) || !isTaskWeight(weight)) return false;
  if (!isRecurrenceKind(kind) || !isValidLeadDays(leadDays) || !isValidSortOrder(sortOrder)) return false;

  if (kind === "weekly") {
    if (!isWeekdayList(weekdays) || monthDay !== null || onceDate !== null) return false;
  } else if (kind === "monthly") {
    if (weekdays !== null || !isDayOfMonth(monthDay) || onceDate !== null) return false;
  } else if (kind === "once") {
    if (weekdays !== null || monthDay !== null || !isISODate(onceDate)) return false;
  } else {
    // daily, exam_eve
    if (weekdays !== null || monthDay !== null || onceDate !== null) return false;
  }

  return true;
}

interface UpdateTaskInput extends ConfigTaskFields {
  taskId: string;
  actorId: number;
}

function validateUpdateTaskInput(input: unknown): input is UpdateTaskInput {
  if (typeof input !== "object" || input === null) return false;
  const { taskId, actorId, ...rest } = input as Record<string, unknown>;
  if (!isUuid(taskId) || !isPersonId(actorId)) return false;
  return isValidConfigTaskFields(rest);
}

function configTaskVersionFields(task: {
  personId: number;
  weight: number;
  kind: string;
  weekdays: number[] | null;
  monthDay: number | null;
  onceDate: ISODate | null;
  leadDays: number;
}) {
  return {
    personId: task.personId,
    weight: task.weight,
    kind: task.kind as ConfigTaskRecord["kind"],
    weekdays: task.weekdays,
    monthDay: task.monthDay,
    onceDate: task.onceDate,
    leadDays: task.leadDays,
  };
}

interface CreateConfigTaskInput extends ConfigTaskFields {
  actorId: number;
}

function validateCreateConfigTaskInput(input: unknown): input is CreateConfigTaskInput {
  if (typeof input !== "object" || input === null) return false;
  const { actorId, ...rest } = input as Record<string, unknown>;
  if (!isPersonId(actorId)) return false;
  return isValidConfigTaskFields(rest);
}

/** "Nova tarefa" na tela de Configurações (seção 8.6): todos os tipos de recorrência. */
export async function createTaskConfig(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateCreateConfigTaskInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { actorId, ...fields } = input;

  try {
    if (!(await personExists(fields.personId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const id = await insertConfigTask({
      ...fields,
      validFrom: toISODate(new Date()),
      createdBy: actorId,
    });

    await recordAuditLog({
      actorId,
      action: "createTaskConfig",
      entity: "tasks",
      entityId: id,
      payload: fields,
    });
    await broadcastChanged({ type: "task_created", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk({ id });
  } catch (error) {
    return toInternalError(error);
  }
}

/**
 * "Editar tarefa" (seção 8.6/10, T13): título, figura e ordem são editados no
 * lugar; peso, recorrência ou responsável encerram a versão atual e abrem
 * uma nova (seção 6), decidido por `needsNewTaskVersion`.
 */
export async function updateTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateUpdateTaskInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, actorId, ...fields } = input;

  try {
    if (!(await personExists(fields.personId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const current = await findConfigTask(taskId);
    if (!current) return actionError("TASK_NOT_FOUND", "Tarefa não encontrada.");

    const today = toISODate(new Date());
    const next = configTaskVersionFields(fields);

    let id = taskId;
    if (needsNewTaskVersion(configTaskVersionFields(current), next)) {
      id = await reviseTask(taskId, {
        ...next,
        title: fields.title,
        icon: fields.icon,
        imagePath: fields.imagePath,
        period: fields.period,
        sortOrder: fields.sortOrder,
        createdBy: actorId,
        previousValidTo: addDays(today, -1),
        validFrom: today,
      });
    } else {
      await updateTaskInPlace(taskId, {
        title: fields.title,
        icon: fields.icon,
        imagePath: fields.imagePath,
        period: fields.period,
        sortOrder: fields.sortOrder,
      });
    }

    await recordAuditLog({
      actorId,
      action: "updateTask",
      entity: "tasks",
      entityId: taskId,
      payload: { ...fields, newVersionId: id !== taskId ? id : null },
    });
    await broadcastChanged({ type: "task_updated", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk({ id });
  } catch (error) {
    return toInternalError(error);
  }
}

interface EndTaskInput {
  taskId: string;
  actorId: number;
}

function validateEndTaskInput(input: unknown): input is EndTaskInput {
  if (typeof input !== "object" || input === null) return false;
  const { taskId, actorId } = input as Record<string, unknown>;
  return isUuid(taskId) && isPersonId(actorId);
}

/** "Encerrar tarefa" (seção 6/8.6): preenche `valid_to`, nunca apaga. */
export async function endTask(input: unknown): Promise<ActionResult> {
  if (!validateEndTaskInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, actorId } = input;

  try {
    const current = await findConfigTask(taskId);
    if (!current) return actionError("TASK_NOT_FOUND", "Tarefa não encontrada.");

    const yesterday = addDays(toISODate(new Date()), -1);
    if (current.validTo !== null && current.validTo <= yesterday) {
      return actionError("TASK_ALREADY_ENDED", "Essa tarefa já está encerrada.");
    }

    await endTaskRecord(taskId, yesterday);

    await recordAuditLog({
      actorId,
      action: "endTask",
      entity: "tasks",
      entityId: taskId,
      payload: { validTo: yesterday },
    });
    await broadcastChanged({ type: "task_ended", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

interface OverrideOccurrenceInput {
  taskId: string;
  dueDate: ISODate;
  status: "pending" | "done" | "missed" | "covered" | "excused";
  reason: string;
  actorId: number;
}

function validateOverrideOccurrenceInput(input: unknown): input is OverrideOccurrenceInput {
  if (typeof input !== "object" || input === null) return false;
  const { taskId, dueDate, status, reason, actorId } = input as Record<string, unknown>;
  return (
    isUuid(taskId) &&
    isISODate(dueDate) &&
    isOccurrenceOverrideStatus(status) &&
    isValidMandatoryReason(reason) &&
    isPersonId(actorId)
  );
}

/**
 * "Edição pontual" (seção 8.6/10, T13): altera o estado de qualquer
 * ocorrência de um mês aberto, com motivo obrigatório (vai para o log).
 * `status: "pending"` remove a linha, devolvendo a ocorrência a pendente.
 */
export async function overrideOccurrence(input: unknown): Promise<ActionResult> {
  if (!validateOverrideOccurrenceInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { taskId, dueDate, status, reason, actorId } = input;

  try {
    const loaded = await loadTaskOrError(taskId);
    if ("ok" in loaded) return loaded;
    const { task } = loaded;

    const monthError = await assertMonthOpenOrError(dueDate);
    if (monthError) return monthError;

    if (status === "pending") {
      await deleteOccurrence(taskId, dueDate);
    } else {
      await upsertOccurrence({
        taskId,
        dueDate,
        status,
        doneBy: status === "done" ? task.personId : status === "covered" ? actorId : null,
        markedBy: actorId,
        note: reason,
      });
    }

    await recordAuditLog({
      actorId,
      action: "overrideOccurrence",
      entity: "task_occurrences",
      entityId: `${taskId}:${dueDate}`,
      payload: { taskId, dueDate, status, reason },
    });
    await broadcastChanged({ type: "occurrence_overridden", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}
