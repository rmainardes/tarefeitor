import { describe, expect, it } from "vitest";
import {
  calculatePersonalBadges,
  findSnitches,
  hasCleanRecord,
  hasHelpingHand,
  hasHotelBed,
  hasPerfectWeek,
  hasPingoBff,
  hasSherpa,
} from "@/lib/domain/badges";
import type { DayOutcome } from "@/lib/domain/streaks";

describe("medalhas de sequência de tarefa", () => {
  it("cama de hotel exige 30 dias seguidos", () => {
    const outcomes: DayOutcome[] = Array(30).fill("perfect");
    expect(hasHotelBed(outcomes)).toBe(true);
    expect(hasHotelBed(outcomes.slice(0, 29))).toBe(false);
  });

  it("sherpa do Everest exige 14 dias seguidos", () => {
    const outcomes: DayOutcome[] = Array(14).fill("perfect");
    expect(hasSherpa(outcomes)).toBe(true);
    expect(hasSherpa(outcomes.slice(0, 13))).toBe(false);
  });

  it("semana perfeita exige 7 dias seguidos com 100%", () => {
    const outcomes: DayOutcome[] = Array(7).fill("perfect");
    expect(hasPerfectWeek(outcomes)).toBe(true);
    expect(hasPerfectWeek(outcomes.slice(0, 6))).toBe(false);
  });
});

describe("hasPingoBff", () => {
  it("exige todos os passeios do mês feitos pela própria pessoa", () => {
    expect(hasPingoBff([{ status: "done" }, { status: "done" }])).toBe(true);
  });

  it("falha se algum passeio não foi feito", () => {
    expect(hasPingoBff([{ status: "done" }, { status: "missed" }])).toBe(false);
  });

  it("sem nenhum passeio devido no mês, não concede a medalha", () => {
    expect(hasPingoBff([])).toBe(false);
  });
});

describe("hasHelpingHand e hasCleanRecord", () => {
  it("mão na roda exige 5 ou mais 'Fiz para' no mês", () => {
    expect(hasHelpingHand(5)).toBe(true);
    expect(hasHelpingHand(4)).toBe(false);
  });

  it("ficha limpa exige nenhuma dedurada procedente", () => {
    expect(hasCleanRecord(0)).toBe(true);
    expect(hasCleanRecord(1)).toBe(false);
  });
});

describe("findSnitches", () => {
  it("aponta quem mais autorou deduradas procedentes", () => {
    const counts = new Map([[1, 2], [2, 0], [3, 1]]);
    expect(findSnitches(counts)).toEqual([1]);
  });

  it("pode haver empate entre duas pessoas", () => {
    const counts = new Map([[1, 2], [2, 2], [3, 0]]);
    expect(findSnitches(counts)).toEqual([1, 2]);
  });

  it("ninguém recebe a medalha se não houve dedurada procedente", () => {
    const counts = new Map([[1, 0], [2, 0], [3, 0]]);
    expect(findSnitches(counts)).toEqual([]);
  });
});

describe("calculatePersonalBadges", () => {
  it("combina todos os critérios pessoais", () => {
    const perfectDays: DayOutcome[] = Array(7).fill("perfect");
    const badges = calculatePersonalBadges({
      bedDayOutcomes: Array(30).fill("perfect"),
      everestDayOutcomes: Array(14).fill("perfect"),
      walkOccurrences: [{ status: "done" }],
      overallDayOutcomes: perfectDays,
      favorsDone: 5,
      upheldReportsAgainstPerson: 0,
    });
    expect(badges.sort()).toEqual(
      ["clean_record", "helping_hand", "hotel_bed", "perfect_week", "pingo_bff", "sherpa"].sort(),
    );
  });

  it("sem nenhum critério atendido, não concede medalha alguma", () => {
    const badges = calculatePersonalBadges({
      bedDayOutcomes: [],
      everestDayOutcomes: [],
      walkOccurrences: [],
      overallDayOutcomes: [],
      favorsDone: 0,
      upheldReportsAgainstPerson: 1,
    });
    expect(badges).toEqual([]);
  });
});
