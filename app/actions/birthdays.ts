"use server";

// Server Action de aniversários (seção 8.1/10): cadastro, com validação,
// log de alteração, broadcast em tempo real (seção 8.4) e revalidação do Painel.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { insertBirthday } from "@/lib/data/birthdays";
import { personExists } from "@/lib/data/people";
import {
  actionError,
  actionOk,
  isDayOfMonth,
  isMonthNumber,
  isPersonId,
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
