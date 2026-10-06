/**
 * Datas e recorrência — parte pura do domínio (espelha `lib/domain`
 * do plano, para o porte em Next.js). Fuso fixo America/Sao_Paulo.
 */
import type { Task } from "./panel-types";

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

/** 1 = segunda … 7 = domingo. */
export function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

export function lastDayOfMonth(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Dia do mês respeitando mês curto (dia 31 em fevereiro vira 28/29). */
function clampMonthDay(isoDate: string, monthDay: number): string {
  const day = Math.min(monthDay, lastDayOfMonth(isoDate));
  return `${isoDate.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

export interface DueInfo {
  /** Data da ocorrência (a do vencimento, também para as mensais adiantadas). */
  dueDate: string;
  /** Mensal que já aparece na lista, mas ainda não vence. */
  upcoming: boolean;
}

/** `null` quando a tarefa não está na lista deste dia. */
export function resolveDue(
  task: Task,
  isoDate: string,
  examEves: ReadonlySet<string> = new Set(),
): DueInfo | null {
  switch (task.kind) {
    case "daily":
      return { dueDate: isoDate, upcoming: false };
    case "weekly":
      return (task.weekdays ?? []).includes(isoWeekday(isoDate))
        ? { dueDate: isoDate, upcoming: false }
        : null;
    case "exam_eve":
      return examEves.has(isoDate)
        ? { dueDate: isoDate, upcoming: false }
        : null;
    case "monthly": {
      const lead = task.leadDays ?? 3;
      const thisMonth = clampMonthDay(isoDate, task.monthDay ?? 1);
      if (isoDate <= thisMonth) {
        const diff = daysBetween(isoDate, thisMonth);
        return diff <= lead
          ? { dueDate: thisMonth, upcoming: thisMonth !== isoDate }
          : null;
      }
      const nextMonthBase = addDays(`${isoDate.slice(0, 7)}-28`, 10);
      const nextMonth = clampMonthDay(nextMonthBase, task.monthDay ?? 1);
      return daysBetween(isoDate, nextMonth) <= lead
        ? { dueDate: nextMonth, upcoming: true }
        : null;
    }
    default:
      return null;
  }
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00Z`).getTime();
  const b = new Date(`${toIso}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function occurrenceKey(taskId: string, isoDate: string): string {
  return `${taskId}|${isoDate}`;
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
