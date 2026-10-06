import { describe, expect, it } from "vitest";

import { isISODate, isPersonId, isUuid, isValidNote } from "@/lib/validation";

describe("isUuid", () => {
  it("aceita um UUID v4 válido", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejeita strings que não são UUID", () => {
    expect(isUuid("não-é-um-uuid")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("isISODate", () => {
  it("aceita datas de calendário válidas no formato YYYY-MM-DD", () => {
    expect(isISODate("2026-10-05")).toBe(true);
    expect(isISODate("2024-02-29")).toBe(true); // ano bissexto
  });

  it("rejeita formato errado e datas inexistentes", () => {
    expect(isISODate("05/10/2026")).toBe(false);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2023-02-29")).toBe(false); // não bissexto
    expect(isISODate(null)).toBe(false);
  });
});

describe("isPersonId", () => {
  it("aceita inteiros positivos", () => {
    expect(isPersonId(1)).toBe(true);
    expect(isPersonId(3)).toBe(true);
  });

  it("rejeita zero, negativos, decimais e não-números", () => {
    expect(isPersonId(0)).toBe(false);
    expect(isPersonId(-1)).toBe(false);
    expect(isPersonId(1.5)).toBe(false);
    expect(isPersonId("1")).toBe(false);
  });
});

describe("isValidNote", () => {
  it("aceita nulo, ausente e texto até 280 caracteres", () => {
    expect(isValidNote(null)).toBe(true);
    expect(isValidNote(undefined)).toBe(true);
    expect(isValidNote("tudo certo")).toBe(true);
    expect(isValidNote("a".repeat(280))).toBe(true);
  });

  it("rejeita texto acima de 280 caracteres e outros tipos", () => {
    expect(isValidNote("a".repeat(281))).toBe(false);
    expect(isValidNote(42)).toBe(false);
  });
});
