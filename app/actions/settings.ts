"use server";

// Server Action de parâmetros (seção 8.6/10, T13): `updateSettings` — placar,
// som e horário de silêncio. Validação por parâmetro, log, broadcast
// (seção 8.4) e revalidação do Painel e da tela de Configurações.

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/data/auditLog";
import { broadcastChanged } from "@/lib/data/broadcast";
import { personExists } from "@/lib/data/people";
import { updateSettingValue } from "@/lib/data/settings";
import {
  actionError,
  actionOk,
  isNonNegativeNumber,
  isPersonId,
  isValidHour,
  isValidIdleRotationSeconds,
  isValidLeadDays,
  type ActionResult,
} from "@/lib/validation";

interface UpdateSettingsInput {
  favorBonus: number;
  reportPenalty: number;
  extraMax: number;
  retroDeadlineHour: number;
  monthlyLeadDays: number;
  soundEnabled: boolean;
  quietHoursFrom: number;
  quietHoursTo: number;
  idleRotationSeconds: number;
  actorId: number;
}

function validateUpdateSettingsInput(input: unknown): input is UpdateSettingsInput {
  if (typeof input !== "object" || input === null) return false;
  const {
    favorBonus,
    reportPenalty,
    extraMax,
    retroDeadlineHour,
    monthlyLeadDays,
    soundEnabled,
    quietHoursFrom,
    quietHoursTo,
    idleRotationSeconds,
    actorId,
  } = input as Record<string, unknown>;

  if (!isNonNegativeNumber(favorBonus) || !isNonNegativeNumber(reportPenalty)) return false;
  if (!isNonNegativeNumber(extraMax)) return false;
  if (!isValidHour(retroDeadlineHour)) return false;
  if (!isValidLeadDays(monthlyLeadDays)) return false;
  if (typeof soundEnabled !== "boolean") return false;
  if (!isValidHour(quietHoursFrom) || !isValidHour(quietHoursTo)) return false;
  if (!isValidIdleRotationSeconds(idleRotationSeconds)) return false;
  if (!isPersonId(actorId)) return false;
  return true;
}

/** "Parâmetros" (seção 8.6: pontuação, som e horário de silêncio). */
export async function updateSettings(input: unknown): Promise<ActionResult> {
  if (!validateUpdateSettingsInput(input)) {
    return actionError("INVALID_INPUT", "Dados inválidos.");
  }
  const {
    favorBonus,
    reportPenalty,
    extraMax,
    retroDeadlineHour,
    monthlyLeadDays,
    soundEnabled,
    quietHoursFrom,
    quietHoursTo,
    idleRotationSeconds,
    actorId,
  } = input;

  try {
    if (!(await personExists(actorId))) {
      return actionError("PERSON_NOT_FOUND", "Pessoa não encontrada.");
    }

    await Promise.all([
      updateSettingValue("favor_bonus", favorBonus),
      updateSettingValue("report_penalty", reportPenalty),
      updateSettingValue("extra_max", extraMax),
      updateSettingValue("retro_deadline_hour", retroDeadlineHour),
      updateSettingValue("monthly_lead_days", monthlyLeadDays),
      updateSettingValue("sound_enabled", soundEnabled),
      updateSettingValue("quiet_hours", { from: quietHoursFrom, to: quietHoursTo }),
      updateSettingValue("idle_rotation_seconds", idleRotationSeconds),
    ]);

    await recordAuditLog({
      actorId,
      action: "updateSettings",
      entity: "settings",
      payload: {
        favorBonus,
        reportPenalty,
        extraMax,
        retroDeadlineHour,
        monthlyLeadDays,
        soundEnabled,
        quietHours: { from: quietHoursFrom, to: quietHoursTo },
        idleRotationSeconds,
      },
    });
    await broadcastChanged({ type: "settings_updated", personId: actorId });

    revalidatePath("/");
    revalidatePath("/config");
    return actionOk(undefined);
  } catch (error) {
    console.error("Erro inesperado ao atualizar parâmetros:", error);
    return actionError("INTERNAL_ERROR", "Não foi possível atualizar os parâmetros. Tente novamente.");
  }
}
