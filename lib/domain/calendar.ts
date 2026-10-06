// Agenda iCal e véspera de prova (seção 7.5). Funções puras: recebem os
// eventos já parseados e as palavras-chave; não fazem I/O.

import { addDays, compareISODates, type ISODate } from "./dates";

export interface AgendaEvent {
  uid: string;
  title: string;
  /** Dia do evento (fuso da casa). */
  dateIso: ISODate;
  /** `null` quando `allDay`. */
  timeLabel: string | null;
  allDay: boolean;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Minúsculas e sem acento, para comparar título de evento com palavra-chave. */
export function normalizeForMatch(value: string): string {
  return stripDiacritics(value).toLowerCase();
}

/** O título do evento contém alguma palavra de `exam_keywords` (seção 7.5)? */
export function matchesExamKeywords(title: string, keywords: readonly string[]): boolean {
  if (keywords.length === 0) return false;
  const normalizedTitle = normalizeForMatch(title);
  return keywords.some((keyword) => normalizedTitle.includes(normalizeForMatch(keyword)));
}

export interface ExamEveRow {
  eveDate: ISODate;
  examDate: ISODate;
  eventUid: string;
  eventTitle: string;
}

/** Vésperas derivadas dos eventos cujo título bate com `keywords`: `eveDate = examDate − 1`. */
export function examEveRowsFromEvents(
  events: readonly AgendaEvent[],
  keywords: readonly string[],
): ExamEveRow[] {
  return events
    .filter((event) => matchesExamKeywords(event.title, keywords))
    .map((event) => ({
      eveDate: addDays(event.dateIso, -1),
      examDate: event.dateIso,
      eventUid: event.uid,
      eventTitle: event.title,
    }));
}

export interface ExamEveDiff {
  toInsert: ExamEveRow[];
  toDeleteEventUids: string[];
}

/**
 * O que sincronizar em `exam_eves` nesta leitura da agenda: insere vésperas
 * futuras novas, remove vésperas futuras cujo evento sumiu, nunca toca o
 * passado (seção 7.5). `existingFuture` já deve vir filtrado a `eveDate >= today`.
 */
export function diffExamEves(
  existingFuture: readonly ExamEveRow[],
  current: readonly ExamEveRow[],
  today: ISODate,
): ExamEveDiff {
  const isFuture = (row: ExamEveRow) => compareISODates(row.eveDate, today) >= 0;

  const currentUids = new Set(current.map((row) => row.eventUid));
  const existingUids = new Set(existingFuture.map((row) => row.eventUid));

  return {
    toInsert: current.filter((row) => isFuture(row) && !existingUids.has(row.eventUid)),
    toDeleteEventUids: existingFuture
      .filter((row) => isFuture(row) && !currentUids.has(row.eventUid))
      .map((row) => row.eventUid),
  };
}
