import { describe, expect, it } from "vitest";
import { canMarkRetroactively, hourInTimeZone, toISODate } from "@/lib/domain/dates";

describe("toISODate", () => {
  it("usa o fuso America/Sao_Paulo, não o UTC", () => {
    // 2026-10-06T02:30Z = 2026-10-05T23:30 em São Paulo (UTC-3)
    const instant = new Date(Date.UTC(2026, 9, 6, 2, 30));
    expect(toISODate(instant)).toBe("2026-10-05");
  });

  it("vira o mês corretamente perto da meia-noite", () => {
    // 2026-03-01T02:30Z = 2026-02-28T23:30 em São Paulo
    const instant = new Date(Date.UTC(2026, 2, 1, 2, 30));
    expect(toISODate(instant)).toBe("2026-02-28");
  });
});

describe("hourInTimeZone", () => {
  it("calcula a hora local correta perto da meia-noite UTC", () => {
    // 2026-10-06T02:30Z = 2026-10-05T23:30 em São Paulo
    const instant = new Date(Date.UTC(2026, 9, 6, 2, 30));
    expect(hourInTimeZone(instant)).toBe(23);
  });
});

describe("canMarkRetroactively", () => {
  const dueDate = "2026-10-05";
  const retroDeadlineHour = 23;

  it("permite marcar no próprio dia do vencimento", () => {
    // 2026-10-05T13:00Z = 2026-10-05T10:00 em São Paulo
    const now = new Date(Date.UTC(2026, 9, 5, 13, 0));
    expect(canMarkRetroactively(dueDate, now, retroDeadlineHour)).toBe(true);
  });

  it("permite marcar no dia seguinte antes das 23h", () => {
    // 2026-10-07T01:00Z = 2026-10-06T22:00 em São Paulo
    const now = new Date(Date.UTC(2026, 9, 7, 1, 0));
    expect(canMarkRetroactively(dueDate, now, retroDeadlineHour)).toBe(true);
  });

  it("bloqueia no dia seguinte depois das 23h", () => {
    // 2026-10-07T02:30Z = 2026-10-06T23:30 em São Paulo
    const now = new Date(Date.UTC(2026, 9, 7, 2, 30));
    expect(canMarkRetroactively(dueDate, now, retroDeadlineHour)).toBe(false);
  });

  it("bloqueia a partir do segundo dia seguinte", () => {
    // 2026-10-07T03:10Z = 2026-10-07T00:10 em São Paulo
    const now = new Date(Date.UTC(2026, 9, 7, 3, 10));
    expect(canMarkRetroactively(dueDate, now, retroDeadlineHour)).toBe(false);
  });
});
