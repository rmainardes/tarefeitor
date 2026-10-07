import { describe, expect, it } from "vitest";
import { daysUntilBirthday, isLeapYear, observedDay } from "@/lib/domain/birthdays";

describe("isLeapYear", () => {
  it("segue a regra gregoriana (divisível por 4, exceto séculos não divisíveis por 400)", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe("observedDay", () => {
  it("29/02 em ano não bissexto é comemorado em 28/02", () => {
    expect(observedDay({ day: 29, month: 2 }, 2026)).toBe(28);
    expect(observedDay({ day: 29, month: 2 }, 2024)).toBe(29);
  });

  it("qualquer outro dia não muda", () => {
    expect(observedDay({ day: 15, month: 3 }, 2026)).toBe(15);
    expect(observedDay({ day: 28, month: 2 }, 2026)).toBe(28);
  });
});

describe("daysUntilBirthday", () => {
  it("é positivo antes do dia, zero no dia, negativo depois", () => {
    const birthday = { day: 12, month: 10 };
    expect(daysUntilBirthday(birthday, "2026-10-06")).toBe(6);
    expect(daysUntilBirthday(birthday, "2026-10-12")).toBe(0);
    expect(daysUntilBirthday(birthday, "2026-10-15")).toBe(-3);
  });

  it("usa o dia comemorado (29/02 → 28/02) em ano não bissexto", () => {
    const birthday = { day: 29, month: 2 };
    expect(daysUntilBirthday(birthday, "2026-02-28")).toBe(0);
    expect(daysUntilBirthday(birthday, "2026-02-26")).toBe(2);
  });
});
