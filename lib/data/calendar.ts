// Agenda iCal (seção 7.5): busca e expande os eventos do Google Agenda de uma
// pessoa, com cache de 10 minutos por URL e fallback para a última leitura
// boa quando a rede falha. A sincronização de vésperas de prova mora em
// `./examEves` — este módulo só lê a agenda.

import ical from "node-ical";

import { addDays, toISODate, type ISODate } from "../domain/dates";
import { examEveRowsFromEvents, type AgendaEvent } from "../domain/calendar";
import { syncExamEves } from "./examEves";

const CACHE_TTL_MS = 10 * 60 * 1000;
/** Quantos dias adiante olhar para pré-cadastrar vésperas de prova futuras. */
const AGENDA_WINDOW_DAYS = 7;

const AGENDA_TIMEZONE = "America/Sao_Paulo";
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

interface CacheEntry {
  fetchedAt: number;
  events: AgendaEvent[];
}

const cache = new Map<string, CacheEntry>();

/**
 * Dia de calendário de um evento de dia inteiro. O node-ical reconstrói a
 * data usando os getters locais do processo (ver `localDate` em
 * node-ical/lib/date-utils.js): ler de volta com os mesmos getters locais
 * devolve o ano/mês/dia originais, independente do fuso do host.
 */
function fullDayDateIso(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toAgendaEvents(icsBody: string, from: Date, to: Date): AgendaEvent[] {
  const parsed = ical.sync.parseICS(icsBody);
  const events: AgendaEvent[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT") continue;

    for (const instance of ical.expandRecurringEvent(component, { from, to })) {
      events.push({
        uid: component.uid,
        title: String(instance.summary ?? "").trim(),
        dateIso: instance.isFullDay ? fullDayDateIso(instance.start) : toISODate(instance.start),
        timeLabel: instance.isFullDay ? null : timeFormatter.format(instance.start),
        allDay: instance.isFullDay,
      });
    }
  }

  return events.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || (a.timeLabel ?? "").localeCompare(b.timeLabel ?? ""));
}

export interface AgendaFetchResult {
  events: AgendaEvent[];
  /** `true` quando a leitura falhou e os eventos vêm do último sucesso (ou estão vazios, na primeira falha). */
  stale: boolean;
}

/** Busca e expande os eventos de `icalUrl` no intervalo [from, to], com cache de 10 min. */
export async function fetchAgendaEvents(icalUrl: string, from: Date, to: Date): Promise<AgendaFetchResult> {
  const cached = cache.get(icalUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { events: cached.events, stale: false };
  }

  try {
    const response = await fetch(icalUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`iCal respondeu ${response.status}`);
    const icsBody = await response.text();
    const events = toAgendaEvents(icsBody, from, to);
    cache.set(icalUrl, { fetchedAt: Date.now(), events });
    return { events, stale: false };
  } catch (error) {
    if (cached) return { events: cached.events, stale: true };
    console.error("Falha ao buscar agenda iCal:", error);
    return { events: [], stale: true };
  }
}

export interface AgendaPerson {
  id: number;
  icalUrl: string | null;
  examKeywords: readonly string[];
}

/**
 * Agenda de uma pessoa a partir de hoje (seção 7.5): busca os eventos da
 * janela e, quando a pessoa tem `examKeywords`, sincroniza `exam_eves`.
 * Pessoa sem `icalUrl` (ex.: Vania) devolve agenda vazia sem tocar a rede.
 */
export async function loadPersonAgenda(person: AgendaPerson, today: ISODate): Promise<AgendaFetchResult> {
  if (!person.icalUrl) return { events: [], stale: false };

  // Margem de um dia em cada ponta: só delimita a busca do node-ical, a data
  // exata de cada evento já é recalculada no fuso da casa em `toAgendaEvents`.
  const from = new Date(`${addDays(today, -1)}T00:00:00Z`);
  const to = new Date(`${addDays(today, AGENDA_WINDOW_DAYS + 1)}T00:00:00Z`);

  const result = await fetchAgendaEvents(person.icalUrl, from, to);

  if (person.examKeywords.length > 0) {
    const examEves = examEveRowsFromEvents(result.events, person.examKeywords);
    await syncExamEves(person.id, examEves, today);
  }

  return result;
}
