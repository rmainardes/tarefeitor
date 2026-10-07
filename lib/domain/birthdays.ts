// Aniversários (seção 7.6). Funções puras: recebem a data atual já resolvida
// pelo chamador; não leem o relógio do sistema.

import { parseISODate, type ISODate } from "./dates";

export interface BirthdayDate {
  day: number;
  month: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Dia em que o aniversário é celebrado em `year`: 29/02 em ano não bissexto cai em 28/02 (seção 7.6). */
export function observedDay(birthday: BirthdayDate, year: number): number {
  if (birthday.month === 2 && birthday.day === 29 && !isLeapYear(year)) return 28;
  return birthday.day;
}

/**
 * Dias até o aniversário celebrado em `todayIso`, assumindo que ambos já
 * estão no mesmo mês (quem chama filtra por `birthday.month`). Negativo
 * quando o dia já passou neste mês; zero no dia.
 */
export function daysUntilBirthday(birthday: BirthdayDate, todayIso: ISODate): number {
  const { year, day: todayDay } = parseISODate(todayIso);
  return observedDay(birthday, year) - todayDay;
}
