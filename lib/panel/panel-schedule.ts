/**
 * Formatação de datas para o painel (rótulos em pt-BR). Fuso fixo
 * America/Sao_Paulo. A recorrência mock (`resolveDue`) saiu daqui na T2c:
 * dados reais já chegam com a data de vencimento resolvida pelo servidor.
 */
export const APP_TIMEZONE = "America/Sao_Paulo";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data "de hoje" no fuso da casa, como `YYYY-MM-DD`. */
export function toIsoDate(date: Date = new Date()): string {
  return isoFormatter.format(date);
}

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  weekday: "long",
});

const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
});

export function weekdayLabel(isoDate: string): string {
  return weekdayFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

export function dayMonthLabel(isoDate: string): string {
  return dayMonthFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

export function shortDateLabel(isoDate: string): string {
  return shortDateFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  month: "long",
  year: "numeric",
});

export function monthLabel(isoDate: string): string {
  return monthFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

export function clockLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Prazo retroativo: pode marcar até as 23h do dia seguinte. */
export function retroDeadlineLabel(isoDate: string): string {
  return `prazo até 23h de ${dayMonthLabel(addDays(isoDate, 1))}`;
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)}%`;
}
