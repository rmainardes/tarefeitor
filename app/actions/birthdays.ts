"use server";

// Server Actions de aniversários (seção 8.1/8.6/10): cadastro pelo Painel e,
// na tela de Configurações (T13), edição e exclusão. Todas validam a
// entrada, logam em audit_log, emitem broadcast (seção 8.4) e revalidam.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { deleteBirthday as deleteBirthdayRecord, findBirthday, insertBirthday, updateBirthday as updateBirthdayRecord } from "@/lib/data/birthdays";
import { personExists } from "@/lib/data/people";
import {
  actionError,
  actionOk,
  isDayOfMonth,
  isMonthNumber,
  isPersonId,
  isUuid,
  isValidBirthYear,
  isValidBirthdayName,
  type ActionResult,
} from "@/lib/validation";

interface CreateBirthdayInput {
  name: string;
  day: number;
  month: number;
  birthYear: number | null;
  createdBy: number;
}

function validateCreateBirthdayInput(input: unknown): input is CreateBirthdayInput {
  if (typeof input !== "object" || input === null) return false;
  const { name, day, month, birthYear, createdBy } = input as Record<string, unknown>;
  if (!isValidBirthdayName(name)) return false;
  if (!isDayOfMonth(day)) return false;
  if (!isMonthNumber(month)) return false;
  if (!isValidBirthYear(birthYear)) return false;
  if (!isPersonId(createdBy)) return false;
  return true;
}

/** "Aniversário": nome, dia, mês e ano opcional (seção 8.1). */
export async function createBirthday(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateCreateBirthdayInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { name, day, month, birthYear, createdBy } = input;

  try {
    if (!(await personExists(createdBy))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const id = await insertBirthday({ name: name.trim(), day, month, birthYear: birthYear ?? null });

    await recordAuditLog({
      actorId: createdBy,
      action: "createBirthday",
      entity: "birthdays",
      entityId: id,
      payload: { name: name.trim(), day, month, birthYear: birthYear ?? null },
    });
    await broadcastChanged({ type: "birthday_created", personId: createdBy });

    revalidatePath("/");
    return actionOk({ id });
  } catch (error) {
    console.error("Erro inesperado ao cadastrar aniversário:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível cadastrar o aniversário. Tente novamente.");
  }
}

interface UpsertBirthdayInput {
  id: string;
  name: string;
  day: number;
  month: number;
  birthYear: number | null;
  actorId: number;
}

function validateUpsertBirthdayInput(input: unknown): input is UpsertBirthdayInput {
  if (typeof input !== "object" || input === null) return false;
  const { id, name, day, month, birthYear, actorId } = input as Record<string, unknown>;
  if (!isUuid(id)) return false;
  if (!isValidBirthdayName(name)) return false;
  if (!isDayOfMonth(day)) return false;
  if (!isMonthNumber(month)) return false;
  if (!isValidBirthYear(birthYear)) return false;
  if (!isPersonId(actorId)) return false;
  return true;
}

/** "Aniversário" na tela de Configurações (seção 8.6/10: `upsertBirthday`), para editar um existente. */
export async function upsertBirthday(input: unknown): Promise<ActionResult> {
  if (!validateUpsertBirthdayInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { id, name, day, month, birthYear, actorId } = input;

  try {
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }
    if (!(await findBirthday(id))) {
      return actionError("BIRTHDAY_NOT_FOUND", "Aniversário não encontrado.");
    }

    await updateBirthdayRecord({ id, name: name.trim(), day, month, birthYear: birthYear ?? null });

    await recordAuditLog({
      actorId,
      action: "upsertBirthday",
      entity: "birthdays",
      entityId: id,
      payload: { name: name.trim(), day, month, birthYear: birthYear ?? null },
    });
    await broadcastChanged({ type: "birthday_updated", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    console.error("Erro inesperado ao editar aniversário:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível editar o aniversário. Tente novamente.");
  }
}

interface DeleteBirthdayInput {
  id: string;
  actorId: number;
}

function validateDeleteBirthdayInput(input: unknown): input is DeleteBirthdayInput {
  if (typeof input !== "object" || input === null) return false;
  const { id, actorId } = input as Record<string, unknown>;
  return isUuid(id) && isPersonId(actorId);
}

/** Exclui um aniversário (seção 8.6/10: `deleteBirthday`). */
export async function deleteBirthday(input: unknown): Promise<ActionResult> {
  if (!validateDeleteBirthdayInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { id, actorId } = input;

  try {
    if (!(await findBirthday(id))) {
      return actionError("BIRTHDAY_NOT_FOUND", "Aniversário não encontrado.");
    }

    await deleteBirthdayRecord(id);

    await recordAuditLog({ actorId, action: "deleteBirthday", entity: "birthdays", entityId: id });
    await broadcastChanged({ type: "birthday_deleted", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    console.error("Erro inesperado ao excluir aniversário:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível excluir o aniversário. Tente novamente.");
  }
}
