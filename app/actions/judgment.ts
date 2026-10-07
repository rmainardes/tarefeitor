"use server";

// Server Actions de julgamento (seção 10): createExtra, createReport. Validam
// a entrada, verificam mês aberto, gravam, registram em audit_log, emitem o
// broadcast em tempo real (seção 8.4) e revalidam o Painel. Votos e defesa
// entram na T11.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { createExtra as insertExtra, createReport as insertReport } from "@/lib/data/judgment";
import { isMonthClosed } from "@/lib/data/months";
import { personExists } from "@/lib/data/people";
import type { ISODate } from "@/lib/domain/dates";
import { MonthClosedError } from "@/lib/data/errors";
import {
  actionError,
  actionOk,
  isISODate,
  isPersonId,
  isValidDescription,
  type ActionResult,
} from "@/lib/validation";

function toInternalError<T = void>(error: unknown): ActionResult<T> {
  console.error("Erro inesperado em Server Action de julgamento:", error);
  if (error instanceof MonthClosedError) {
    return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
  }
  return actionError("INTERNAL_ERROR", "Não foi possível completar a ação. Tente novamente.");
}

interface CreateExtraInput {
  authorId: number;
  description: string;
  happenedOn: ISODate;
}

function validateCreateExtraInput(input: unknown): input is CreateExtraInput {
  if (typeof input !== "object" || input === null) return false;
  const { authorId, description, happenedOn } = input as Record<string, unknown>;
  return isPersonId(authorId) && isValidDescription(description) && isISODate(happenedOn);
}

/** "Fiz um extra": registrado para votação dos outros dois (seção 7.3). */
export async function createExtra(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateCreateExtraInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { authorId, description, happenedOn } = input;

  try {
    if (await isMonthClosed(happenedOn)) {
      return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
    }

    const id = await insertExtra({ authorId, description, happenedOn });

    await recordAuditLog({
      actorId: authorId,
      action: "createExtra",
      entity: "extras",
      entityId: id,
      payload: { description, happenedOn },
    });
    await broadcastChanged({ type: "extra_created", personId: authorId });

    revalidatePath("/");
    return actionOk({ id });
  } catch (error) {
    return toInternalError(error);
  }
}

interface CreateReportInput {
  authorId: number;
  accusedId: number;
  description: string;
  happenedOn: ISODate;
}

function validateCreateReportInput(input: unknown): input is CreateReportInput {
  if (typeof input !== "object" || input === null) return false;
  const { authorId, accusedId, description, happenedOn } = input as Record<string, unknown>;
  return (
    isPersonId(authorId) &&
    isPersonId(accusedId) &&
    isValidDescription(description) &&
    isISODate(happenedOn)
  );
}

/** "Dedurando": vai a voto dos três, com defesa do acusado (seção 7.7, T11). */
export async function createReport(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!validateCreateReportInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { authorId, accusedId, description, happenedOn } = input;

  if (authorId === accusedId) {
    return actionError("IS_SELF", "Não dá para dedurar a si mesmo.");
  }

  try {
    if (!(await personExists(accusedId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    if (await isMonthClosed(happenedOn)) {
      return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
    }

    const id = await insertReport({ authorId, accusedId, description, happenedOn });

    await recordAuditLog({
      actorId: authorId,
      action: "createReport",
      entity: "reports",
      entityId: id,
      payload: { accusedId, description, happenedOn },
    });
    await broadcastChanged({ type: "report_created", personId: authorId });

    revalidatePath("/");
    return actionOk({ id });
  } catch (error) {
    return toInternalError(error);
  }
}
