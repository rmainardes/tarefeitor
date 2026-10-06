import { describe, expect, it } from "vitest";
import {
  diffExamEves,
  examEveRowsFromEvents,
  matchesExamKeywords,
  normalizeForMatch,
  type AgendaEvent,
  type ExamEveRow,
} from "@/lib/domain/calendar";

function event(overrides: Partial<AgendaEvent>): AgendaEvent {
  return {
    uid: "evt-1",
    title: "Prova de matemática",
    dateIso: "2026-10-12",
    timeLabel: "08:00",
    allDay: false,
    ...overrides,
  };
}

describe("normalizeForMatch", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalizeForMatch("PRÓVA")).toBe("prova");
    expect(normalizeForMatch("Prova de Matemática")).toBe("prova de matematica");
  });
});

describe("matchesExamKeywords", () => {
  it("bate sem diferenciar maiúsculas nem acentos", () => {
    expect(matchesExamKeywords("Prova de matemática", ["prova"])).toBe(true);
    expect(matchesExamKeywords("PROVA DE INGLÊS", ["prova"])).toBe(true);
    expect(matchesExamKeywords("prôva de história", ["Prova"])).toBe(true);
  });

  it("não bate quando a palavra não aparece", () => {
    expect(matchesExamKeywords("Reunião de pais", ["prova"])).toBe(false);
  });

  it("sem palavras-chave nunca bate (ex.: Vania e Rodrigo)", () => {
    expect(matchesExamKeywords("Prova de matemática", [])).toBe(false);
  });
});

describe("examEveRowsFromEvents", () => {
  it("gera a véspera (dia anterior) só para eventos que batem a palavra-chave", () => {
    const events = [
      event({ uid: "evt-1", title: "Prova de matemática", dateIso: "2026-10-12" }),
      event({ uid: "evt-2", title: "Reunião de pais", dateIso: "2026-10-13" }),
    ];

    const rows = examEveRowsFromEvents(events, ["prova"]);

    expect(rows).toEqual([
      { eveDate: "2026-10-11", examDate: "2026-10-12", eventUid: "evt-1", eventTitle: "Prova de matemática" },
    ]);
  });

  it("prova na segunda gera estudo no domingo", () => {
    // 2026-10-12 é segunda-feira
    const rows = examEveRowsFromEvents(
      [event({ uid: "evt-1", title: "Prova", dateIso: "2026-10-12" })],
      ["prova"],
    );
    expect(rows[0].eveDate).toBe("2026-10-11");
  });
});

describe("diffExamEves", () => {
  const today = "2026-10-10";

  function row(overrides: Partial<ExamEveRow>): ExamEveRow {
    return {
      eveDate: "2026-10-11",
      examDate: "2026-10-12",
      eventUid: "evt-1",
      eventTitle: "Prova de matemática",
      ...overrides,
    };
  }

  it("insere vésperas futuras novas", () => {
    const current = [row({ eventUid: "evt-1" })];
    const diff = diffExamEves([], current, today);
    expect(diff.toInsert).toEqual(current);
    expect(diff.toDeleteEventUids).toEqual([]);
  });

  it("não reinsere véspera já cadastrada", () => {
    const existing = [row({ eventUid: "evt-1" })];
    const current = [row({ eventUid: "evt-1" })];
    const diff = diffExamEves(existing, current, today);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toDeleteEventUids).toEqual([]);
  });

  it("remove véspera futura cujo evento sumiu da agenda", () => {
    const existing = [row({ eventUid: "evt-1" }), row({ eventUid: "evt-2", eveDate: "2026-10-15" })];
    const current = [row({ eventUid: "evt-1" })];
    const diff = diffExamEves(existing, current, today);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toDeleteEventUids).toEqual(["evt-2"]);
  });

  it("nunca toca vésperas passadas, mesmo que o evento tenha sumido", () => {
    const existing = [row({ eventUid: "evt-passado", eveDate: "2026-10-01" })];
    const diff = diffExamEves(existing, [], today);
    expect(diff.toDeleteEventUids).toEqual([]);
  });
});
