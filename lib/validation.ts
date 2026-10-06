// Validação de entrada e formato do resultado das Server Actions (seção 10).
// Nunca expõe detalhes do banco: os `code` abaixo são o contrato com a UI.

export type ActionErrorCode =
  | "INVALID_INPUT"
  | "PERSON_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "NOT_OWNER"
  | "IS_OWNER"
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
