"use server";

// Server Actions de folgas (seção 8.6/10, T13): `upsertDayOff`,
// `deleteDayOff`. Pessoa, período, tarefa específica ou todas, motivo
// opcional. Validação, log, broadcast (seção 8.4) e revalidação.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { deleteDayOffRecord, findDayOff, upsertDayOffRecord } from "@/lib/data/daysOff";
import { findTaskOwner } from "@/lib/data/tasks";
import { personExists } from "@/lib/data/people";
import { compareISODates, type ISODate } from "@/lib/domain/dates";
import {
  actionError,
  actionOk,
  isISODate,
  isNullableUuid,
  isPersonId,
  isUuid,
  isValidDayOffReason,
  type ActionResult,
} from "@/lib/validation";

interface UpsertDayOffInput {
  id?: string;
  personId: number;
  dateFrom: ISODate;
  dateTo: ISODate;
  taskId: string | null;
  reason: string | null;
  actorId: number;
}

function validateUpsertDayOffInput(input: unknown): input is UpsertDayOffInput {
  if (typeof input !== "object" || input === null) return false;
  const { id, personId, dateFrom, dateTo, taskId, reason, actorId } = input as Record<string, unknown>;
  if (id !== undefined && !isUuid(id)) return false;
  if (!isPersonId(personId) || !isPersonId(actorId)) return false;
  if (!isISODate(dateFrom) || !isISODate(dateTo)) return false;
  if (compareISODates(dateFrom, dateTo) > 0) return false;
  if (!isNullableUuid(taskId)) return false;
  if (!isValidDayOffReason(reason)) return false;
  return true;
}

/** "Folga" (seção 8.6: pessoa, período, tarefa específica ou todas, motivo). */
export async function upsertDayOff(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateUpsertDayOffInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { id, personId, dateFrom, dateTo, taskId, reason, actorId } = input;

  try {
    if (!(await personExists(personId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }
    if (taskId !== null) {
      const task = await findTaskOwner(taskId);
      if (!task) return actionError("TASK_NOT_FOUND", "Tarefa não encontrada.");
    }
    if (id && !(await findDayOff(id))) {
      return actionError("DAY_OFF_NOT_FOUND", "Folga não encontrada.");
    }

    const savedId = await upsertDayOffRecord({
      id,
      personId,
      dateFrom,
      dateTo,
      taskId,
      reason: reason ?? null,
    });

    await recordAuditLog({
      actorId,
      action: "upsertDayOff",
      entity: "days_off",
      entityId: savedId,
      payload: { personId, dateFrom, dateTo, taskId, reason: reason ?? null },
    });
    await broadcastChanged({ type: "day_off_changed", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk({ id: savedId });
  } catch (error) {
    console.error("Erro inesperado ao salvar folga:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível salvar a folga. Tente novamente.");
  }
}

interface DeleteDayOffInput {
  id: string;
  actorId: number;
}

function validateDeleteDayOffInput(input: unknown): input is DeleteDayOffInput {
  if (typeof input !== "object" || input === null) return false;
  const { id, actorId } = input as Record<string, unknown>;
  return isUuid(id) && isPersonId(actorId);
}

export async function deleteDayOff(input: unknown): Promise<ActionResult> {
  if (!validateDeleteDayOffInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { id, actorId } = input;

  try {
    if (!(await findDayOff(id))) {
      return actionError("DAY_OFF_NOT_FOUND", "Folga não encontrada.");
    }

    await deleteDayOffRecord(id);

    await recordAuditLog({ actorId, action: "deleteDayOff", entity: "days_off", entityId: id });
    await broadcastChanged({ type: "day_off_changed", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    console.error("Erro inesperado ao excluir folga:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível excluir a folga. Tente novamente.");
  }
}
