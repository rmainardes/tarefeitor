// Funções puras de data. "Dia" é sempre uma string ISO "YYYY-MM-DD",
// calculada no fuso America/Sao_Paulo a partir de um instante (`Date`).
// Nenhuma função aqui lê o relógio do sistema: o instante é sempre recebido por fora.

export const APP_TIMEZONE = "America/Sao_Paulo";

export type ISODate = string;

export function toISODate(instant: Date, timeZone: string = APP_TIMEZONE): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function hourInTimeZone(instant: Date, timeZone: string = APP_TIMEZONE): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(instant)
    .find((part) => part.type === "hour")!.value;
  // Algumas implementações de ICU retornam "24" para meia-noite com hour12: false.
  return Number(hourPart) % 24;
}

export function parseISODate(isoDate: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function isoDateToUTC(isoDate: ISODate): Date {
  const { year, month, day } = parseISODate(isoDate);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(isoDate: ISODate, days: number): ISODate {
  const date = isoDateToUTC(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 1 = segunda ... 7 = domingo (ISO 8601). */
export function isoWeekday(isoDate: ISODate): number {
  const jsDay = isoDateToUTC(isoDate).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

/** `month` em 1..12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `date` é o último dia do seu mês (seção 7.7: "o julgamento abre no último dia do mês"). */
export function isLastDayOfMonth(isoDate: ISODate): boolean {
  const { year, month, day } = parseISODate(isoDate);
  return day === daysInMonth(year, month);
}

export function compareISODates(a: ISODate, b: ISODate): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isWithinRange(isoDate: ISODate, from: ISODate, to: ISODate | null): boolean {
  if (compareISODates(isoDate, from) < 0) return false;
  if (to !== null && compareISODates(isoDate, to) > 0) return false;
  return true;
}

/**
 * Uma ocorrência com vencimento em `dueDate` pode ser marcada (inclusive
 * retroativamente) até as `retroDeadlineHour`h do dia seguinte, no fuso do app.
 */
export function canMarkRetroactively(
  dueDate: ISODate,
  now: Date,
  retroDeadlineHour: number,
  timeZone: string = APP_TIMEZONE,
): boolean {
  const today = toISODate(now, timeZone);
  const deadlineDate = addDays(dueDate, 1);

  const dayComparison = compareISODates(today, deadlineDate);
  if (dayComparison < 0) return true;
  if (dayComparison > 0) return false;
  return hourInTimeZone(now, timeZone) < retroDeadlineHour;
}

export interface QuietHours {
  from: number;
  to: number;
}

/**
 * `hour` cai dentro do silêncio noturno (seção 6: `quiet_hours`, ex.: 22h–7h)?
 * `from === to` nunca é silêncio; `from > to` cruza a meia-noite.
 */
export function isWithinQuietHours(hour: number, quietHours: QuietHours): boolean {
  const { from, to } = quietHours;
  if (from === to) return false;
  if (from < to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}
