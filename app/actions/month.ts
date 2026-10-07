"use server";

// Server Actions de fechamento de mês (seção 7.7 e 10): closeMonth,
// spinPunishment. Validam a entrada, verificam as condições de fechamento,
// gravam, registram em audit_log, emitem o broadcast em tempo real (seção
// 8.4) e revalidam o Painel, o Julgamento, a cerimônia e o Hall da fama.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { AlreadyClosedError, closeMonthTransaction, getMonthResult, isMonthClosed, setPunishmentIfEmpty } from "@/lib/data/months";
import { buildMonthSnapshot, getMonthReadiness, resolveLastDayPendencies } from "@/lib/data/monthScoring";
import { personExists } from "@/lib/data/people";
import { toISODate } from "@/lib/domain/dates";
import { isPunishmentId, pickPunishment } from "@/lib/domain/punishments";
import {
  actionError,
  actionOk,
  isMonthStart,
  isPersonId,
  type ActionResult,
} from "@/lib/validation";

function toInternalError<T = void>(error: unknown): ActionResult<T> {
  console.error("Erro inesperado em Server Action de fechamento de mês:", error);
  if (error instanceof AlreadyClosedError) {
    return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
  }
  return actionError("INTERNAL_ERROR", "Não foi possível completar a ação. Tente novamente.");
}

function ceremonyPath(month: string): string {
  return `/cerimonia/${month.slice(0, 7)}`;
}

interface CloseMonthInput {
  month: string;
  actorId: number;
}

function validateCloseMonthInput(input: unknown): input is CloseMonthInput {
  if (typeof input !== "object" || input === null) return false;
  const { month, actorId } = input as Record<string, unknown>;
  return isMonthStart(month) && isPersonId(actorId);
}

/**
 * "Fechar mês" (seção 7.7): disponível a partir do dia 1 do mês seguinte,
 * quando todos os votos necessários existirem. Resolve as pendências do
 * último dia, grava `month_results`/`month_scores` em uma transação e abre
 * caminho para a cerimônia.
 */
export async function closeMonth(input: unknown): Promise<ActionResult<{ month: string }>> {
  if (!validateCloseMonthInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { month, actorId } = input;

  try {
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    if (await isMonthClosed(month)) {
      return actionError("MONTH_CLOSED", "Esse mês já foi fechado.");
    }

    const today = toISODate(new Date());
    const readiness = await getMonthReadiness(month, today);
    if (!readiness.monthOver) {
      return actionError("MONTH_NOT_READY", "Só é possível fechar um mês depois que ele acabar.");
    }
    if (!readiness.votesComplete) {
      return actionError(
        "MONTH_NOT_READY",
        `Ainda há ${readiness.pendingJudgments} item(ns) em julgamento sem voto completo.`,
      );
    }

    await resolveLastDayPendencies(month, actorId);
    const { scores, summary } = await buildMonthSnapshot(month);

    await closeMonthTransaction({ month, closedBy: actorId, summary, scores });

    await recordAuditLog({
      actorId,
      action: "closeMonth",
      entity: "month_results",
      entityId: month,
      payload: { scores },
    });
    await broadcastChanged({ type: "month_closed", personId: actorId });

    revalidatePath("/");
    revalidatePath("/julgamento");
    revalidatePath(ceremonyPath(month));
    revalidatePath("/hall-da-fama");
    return actionOk({ month });
  } catch (error) {
    return toInternalError(error);
  }
}

interface SpinPunishmentInput {
  month: string;
  actorId: number;
}

function validateSpinPunishmentInput(input: unknown): input is SpinPunishmentInput {
  if (typeof input !== "object" || input === null) return false;
  const { month, actorId } = input as Record<string, unknown>;
  return isMonthStart(month) && isPersonId(actorId);
}

/**
 * "Escolha o seu castigo" (seção 7.7): sorteio no servidor, só uma vez por
 * mês. Se já tiver sido sorteado (inclusive por outra aba em paralelo),
 * devolve o mesmo resultado em vez de sortear de novo.
 */
export async function spinPunishment(
  input: unknown,
): Promise<ActionResult<{ punishmentId: string }>> {
  if (!validateSpinPunishmentInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const { month, actorId } = input;

  try {
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    const existing = await getMonthResult(month);
    if (!existing) {
      return actionError("MONTH_NOT_CLOSED", "Esse mês ainda não foi fechado.");
    }
    if (existing.result.punishment && isPunishmentId(existing.result.punishment)) {
      return actionOk({ punishmentId: existing.result.punishment });
    }

    const punishmentId = pickPunishment(Math.random());
    const applied = await setPunishmentIfEmpty(month, punishmentId);

    const finalId = applied ? punishmentId : (await getMonthResult(month))?.result.punishment ?? punishmentId;

    await recordAuditLog({
      actorId,
      action: "spinPunishment",
      entity: "month_results",
      entityId: month,
      payload: { punishmentId: finalId, applied },
    });
    if (applied) {
      await broadcastChanged({ type: "punishment_spun", personId: actorId });
    }

    revalidatePath(ceremonyPath(month));
    revalidatePath("/hall-da-fama");
    return actionOk({ punishmentId: finalId });
  } catch (error) {
    return toInternalError(error);
  }
}
