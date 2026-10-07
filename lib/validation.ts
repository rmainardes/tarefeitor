// Validação de entrada e formato do resultado das Server Actions (seção 10).
// Nunca expõe detalhes do banco: os `code` abaixo são o contrato com a UI.

export type ActionErrorCode =
  | "INVALID_INPUT"
  | "PERSON_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "NOT_OWNER"
  | "IS_OWNER"
  | "IS_SELF"
  | "IS_AUTHOR"
  | "NOT_ACCUSED"
  | "EXTRA_NOT_FOUND"
  | "REPORT_NOT_FOUND"
  | "OCCURRENCE_NOT_FOUND"
  | "ALREADY_RESOLVED"
  | "DEADLINE_PASSED"
  | "MONTH_CLOSED"
  | "MONTH_NOT_CLOSED"
  | "MONTH_NOT_READY"
  | "TASK_ALREADY_ENDED"
  | "DAY_OFF_NOT_FOUND"
  | "BIRTHDAY_NOT_FOUND"
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

/** `month_results.month` é sempre o dia 1 de um mês (seção 6). */
export function isMonthStart(value: unknown): value is string {
  return isISODate(value) && value.endsWith("-01");
}

export function isValidNote(value: unknown): value is string | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.length <= 280;
}

/** Descrição de extra/dedurada: obrigatória, 1 a 280 caracteres. */
export function isValidDescription(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 280;
}

/** Defesa da dedurada: opcional (pode ser vazia), até 280 caracteres (seção 7.7). */
export function isValidDefense(value: unknown): value is string {
  return typeof value === "string" && value.length <= 280;
}

/** Voto inteiro dentro do intervalo aceito pelo tipo de julgamento (seção 10). */
export function isVoteValue(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
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

/** Nome de aniversariante: obrigatório, 1 a 60 caracteres (igual ao check do banco). */
export function isValidBirthdayName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 60;
}

export function isDayOfMonth(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31;
}

export function isMonthNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

/** Ano de nascimento opcional: `null`/`undefined` ou inteiro plausível. */
export function isValidBirthYear(value: unknown): value is number | null | undefined {
  if (value === null || value === undefined) return true;
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1900 &&
    value <= new Date().getFullYear()
  );
}

/** Ícone/emoji de tarefa: obrigatório, até 8 caracteres (seção 8.6: "figura"). */
export function isValidTaskIcon(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 8;
}

/** Caminho de imagem opcional em `/public` (seção 8.6: "figura"). */
export function isValidImagePath(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" && value.startsWith("/") && value.length <= 200;
}

export function isValidSortOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 32767;
}

export function isRecurrenceKind(
  value: unknown,
): value is "daily" | "weekly" | "monthly" | "once" | "exam_eve" {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "once" || value === "exam_eve";
}

/** Antecedência de tarefas mensais, seção 6: `lead_days between 0 and 7`. */
export function isValidLeadDays(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 7;
}

export function isOccurrenceOverrideStatus(
  value: unknown,
): value is "pending" | "done" | "missed" | "covered" | "excused" {
  return value === "pending" || value === "done" || value === "missed" || value === "covered" || value === "excused";
}

/** Motivo obrigatório de uma edição pontual (seção 8.6: "com motivo obrigatório"). */
export function isValidMandatoryReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 280;
}

/** Motivo de folga: opcional, até 120 caracteres (igual ao check do banco). */
export function isValidDayOffReason(value: unknown): value is string | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.length <= 120;
}

export function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

/**
 * Link iCal secreto (seção 7.5/11): `undefined` = manter o valor atual (o
 * link nunca volta ao cliente, então "não mudar" precisa de um terceiro
 * estado além de preenchido/`null`), `null` = remover, string = novo link.
 */
export function isValidIcalUrl(value: unknown): value is string | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.startsWith("https://") && value.length <= 500;
}

/** Palavras-chave de prova: cada uma curta e não vazia (seção 7.5). */
export function isExamKeywordList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((keyword) => typeof keyword === "string" && keyword.trim().length >= 1 && keyword.length <= 40)
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Hora de 0 a 23 (prazo retroativo e limites do silêncio noturno). */
export function isValidHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
}

export function isValidIdleRotationSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 10 && value <= 3600;
}
