"use server";

// Server Action de agenda (seção 8.6/10, T13): `updateCalendar` — link iCal
// secreto e palavras-chave de prova de uma pessoa. Validação, log e
// revalidação do Painel e da tela de Configurações.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { personExists, updatePersonCalendar } from "@/lib/data/people";
import {
  actionError,
  actionOk,
  isExamKeywordList,
  isPersonId,
  isValidIcalUrl,
  type ActionResult,
} from "@/lib/validation";

interface UpdateCalendarInput {
  personId: number;
  /** `undefined` mantém o link atual (seção 11: nunca volta ao cliente). */
  icalUrl: string | null | undefined;
  examKeywords: string[];
  actorId: number;
}

function validateUpdateCalendarInput(input: unknown): input is UpdateCalendarInput {
  if (typeof input !== "object" || input === null) return false;
  const { personId, icalUrl, examKeywords, actorId } = input as Record<string, unknown>;
  if (!isPersonId(personId) || !isPersonId(actorId)) return false;
  if (!isValidIcalUrl(icalUrl)) return false;
  if (!isExamKeywordList(examKeywords)) return false;
  return true;
}

/** "Agenda" (seção 8.6: link iCal de Pedro e Rodrigo, palavras-chave de prova). */
export async function updateCalendar(input: unknown): Promise<ActionResult> {
  if (!validateUpdateCalendarInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { personId, icalUrl, examKeywords, actorId } = input;

  try {
    if (!(await personExists(personId)) || !(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    await updatePersonCalendar(personId, icalUrl, examKeywords);

    await recordAuditLog({
      actorId,
      action: "updateCalendar",
      entity: "people",
      entityId: String(personId),
      // O link iCal nunca entra no log: é segredo (seção 11).
      payload: {
        personId,
        examKeywords,
        icalUrlChange: icalUrl === undefined ? "unchanged" : icalUrl === null ? "removed" : "replaced",
      },
    });
    await broadcastChanged({ type: "calendar_updated", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    console.error("Erro inesperado ao atualizar a agenda:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível atualizar a agenda. Tente novamente.");
  }
}
