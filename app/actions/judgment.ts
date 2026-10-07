"use server";

// Server Actions de julgamento (seções 7.7 e 10): createExtra, createReport,
// setDefense, castVote. Validam a entrada, verificam mês aberto, gravam,
// registram em audit_log, emitem o broadcast em tempo real (seção 8.4) e
// revalidam o Painel e o Julgamento.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import {
  createExtra as insertExtra,
  createReport as insertReport,
  castVote as insertVote,
  getExtraById,
  getReportById,
  listVotesFor,
  setReportDefense,
  REPORT_VOTES_NEEDED,
  type JudgmentKind,
} from "@/lib/data/judgment";
import { isMonthClosed } from "@/lib/data/months";
import { personExists } from "@/lib/data/people";
import { getNumberSetting } from "@/lib/data/settings";
import { upsertOccurrence } from "@/lib/data/taskOccurrences";
import type { ISODate } from "@/lib/domain/dates";
import { isReportUpheld } from "@/lib/domain/scoring";
import { MonthClosedError } from "@/lib/data/errors";
import {
  actionError,
  actionOk,
  isISODate,
  isPersonId,
  isUuid,
  isValidDefense,
  isValidDescription,
  isVoteValue,
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

/** "Dedurando": vai a voto dos três, com defesa do acusado (seção 7.7). */
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

interface SetDefenseInput {
  reportId: string;
  actorId: number;
  defense: string;
}

function validateSetDefenseInput(input: unknown): input is SetDefenseInput {
  if (typeof input !== "object" || input === null) return false;
  const { reportId, actorId, defense } = input as Record<string, unknown>;
  return isUuid(reportId) && isPersonId(actorId) && isValidDefense(defense);
}

/** "O acusado pode escrever uma linha de defesa" (seção 7.7): ator = acusado. */
export async function setDefense(input: unknown): Promise<ActionResult> {
  if (!validateSetDefenseInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { reportId, actorId, defense } = input;

  try {
    const report = await getReportById(reportId);
    if (!report) {
      return actionError("REPORT_NOT_FOUND", "Dedurada não encontrada.");
    }
    if (actorId !== report.accusedId) {
      return actionError("NOT_ACCUSED", "Só o acusado pode escrever a defesa.");
    }

    if (await isMonthClosed(report.happenedOn)) {
      return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
    }

    await setReportDefense(reportId, defense.trim());

    await recordAuditLog({
      actorId,
      action: "setDefense",
      entity: "reports",
      entityId: reportId,
      payload: { defense },
    });
    await broadcastChanged({ type: "defense_set", personId: actorId });

    revalidatePath("/");
    revalidatePath("/julgamento");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}

interface CastVoteInput {
  targetKind: JudgmentKind;
  targetId: string;
  voterId: number;
  value: number;
}

function validateCastVoteInput(input: unknown): input is CastVoteInput {
  if (typeof input !== "object" || input === null) return false;
  const { targetKind, targetId, voterId, value } = input as Record<string, unknown>;
  if (targetKind !== "extra" && targetKind !== "report") return false;
  if (!isUuid(targetId) || !isPersonId(voterId)) return false;
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * `castVote` (seção 10). Regras de quem vota (seção 7.7):
 * - Extra: os outros dois, nota de 0 a `extra_max` (padrão 3).
 * - Dedurada: os três, 0 (improcedente) ou 1 (procede) — inclusive autor e acusado.
 * Vota com a pessoa selecionada no dispositivo; votar de novo substitui o voto anterior.
 */
export async function castVote(input: unknown): Promise<ActionResult> {
  if (!validateCastVoteInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { targetKind, targetId, voterId, value } = input;

  try {
    if (!(await personExists(voterId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    if (targetKind === "extra") {
      const extra = await getExtraById(targetId);
      if (!extra) {
        return actionError("EXTRA_NOT_FOUND", "Extra não encontrado.");
      }
      if (voterId === extra.authorId) {
        return actionError("IS_AUTHOR", "Quem fez o extra não vota nele.");
      }

      const extraMax = await getNumberSetting("extra_max");
      if (!isVoteValue(value, extraMax)) {
        return actionError("INVALID_INPUT", `A nota vai de 0 a ${extraMax}.`);
      }

      if (await isMonthClosed(extra.happenedOn)) {
        return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
      }

      await insertVote({ targetKind, targetId, voterId, value });

      await recordAuditLog({
        actorId: voterId,
        action: "castVote",
        entity: "votes",
        entityId: `extra:${targetId}`,
        payload: { value },
      });
      await broadcastChanged({ type: "vote_cast", personId: voterId });

      revalidatePath("/");
      revalidatePath("/julgamento");
      return actionOk(undefined);
    }

    const report = await getReportById(targetId);
    if (!report) {
      return actionError("REPORT_NOT_FOUND", "Dedurada não encontrada.");
    }
    if (!isVoteValue(value, 1)) {
      return actionError("INVALID_INPUT", "O voto é 0 (improcedente) ou 1 (procede).");
    }

    if (await isMonthClosed(report.happenedOn)) {
      return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
    }

    await insertVote({ targetKind, targetId, voterId, value });

    const votes = await listVotesFor("report", targetId);
    if (
      votes.length >= REPORT_VOTES_NEEDED &&
      report.taskId &&
      report.dueDate &&
      isReportUpheld(votes.map((vote) => vote.value))
    ) {
      // Contestação ("não fez direito") procedente: a ocorrência passa de done
      // para missed. A perda do peso já é a punição — seção 7.3.
      await upsertOccurrence({
        taskId: report.taskId,
        dueDate: report.dueDate,
        status: "missed",
        doneBy: null,
        markedBy: voterId,
        note: "contestação procedente: não fez direito",
      });
    }

    await recordAuditLog({
      actorId: voterId,
      action: "castVote",
      entity: "votes",
      entityId: `report:${targetId}`,
      payload: { value },
    });
    await broadcastChanged({ type: "vote_cast", personId: voterId });

    revalidatePath("/");
    revalidatePath("/julgamento");
    return actionOk(undefined);
  } catch (error) {
    return toInternalError(error);
  }
}
