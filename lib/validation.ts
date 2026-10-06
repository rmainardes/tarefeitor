// Validação de entrada e formato do resultado das Server Actions (seção 10).
// Nunca expõe detalhes do banco: os `code` abaixo são o contrato com a UI.

export type ActionErrorCode =
  | "INVALID_INPUT"
  | "PERSON_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "NOT_OWNER"
  | "IS_OWNER"
  | "IS_SELF"
  | "OCCURRENCE_NOT_FOUND"
  | "ALREADY_RESOLVED"
  | "DEADLINE_PASSED"
  | "MONTH_CLOSED"
  | "INTERNAL_ERROR";

export interface ActionError {
  ok: false;
  code: ActionErrorCode;
  message: string;
}

export type ActionResult<T = void> = { ok: true; data: T } | ActionError;

export function actionError(code: ActionErrorCode, message: string): ActionError {
  return { ok: false, code, message };
}

export function actionOk<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Formato `YYYY-MM-DD` e data de calendário válida (rejeita "2026-02-30"). */
export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isPersonId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isValidNote(value: unknown): value is string | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.length <= 280;
}

/** Descrição de extra/dedurada: obrigatória, 1 a 280 caracteres. */
export function isValidDescription(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 280;
}

/** Título de tarefa: obrigatório, 1 a 80 caracteres (igual ao check do banco). */
export function isValidTaskTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 80;
}

export function isTaskWeight(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

export function isTaskPeriod(value: unknown): value is "morning" | "afternoon" | "evening" | "anytime" {
  return value === "morning" || value === "afternoon" || value === "evening" || value === "anytime";
}

/** ISO 1 (segunda) a 7 (domingo), sem repetição. */
export function isWeekdayList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
    new Set(value).size === value.length
  );
}
