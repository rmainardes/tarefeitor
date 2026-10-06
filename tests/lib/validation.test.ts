import { describe, expect, it } from "vitest";

import {
  isISODate,
  isPersonId,
  isTaskPeriod,
  isTaskWeight,
  isUuid,
  isValidDescription,
  isValidNote,
  isValidTaskTitle,
  isWeekdayList,
} from "@/lib/validation";

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

describe("isValidDescription", () => {
  it("aceita texto de 1 a 280 caracteres", () => {
    expect(isValidDescription("lavei o carro")).toBe(true);
    expect(isValidDescription("a".repeat(280))).toBe(true);
  });

  it("rejeita vazio, só espaços, acima de 280 e outros tipos", () => {
    expect(isValidDescription("")).toBe(false);
    expect(isValidDescription("   ")).toBe(false);
    expect(isValidDescription("a".repeat(281))).toBe(false);
    expect(isValidDescription(null)).toBe(false);
    expect(isValidDescription(undefined)).toBe(false);
  });
});

describe("isValidTaskTitle", () => {
  it("aceita texto de 1 a 80 caracteres", () => {
    expect(isValidTaskTitle("Arrumar a cama")).toBe(true);
    expect(isValidTaskTitle("a".repeat(80))).toBe(true);
  });

  it("rejeita vazio, só espaços e acima de 80 caracteres", () => {
    expect(isValidTaskTitle("")).toBe(false);
    expect(isValidTaskTitle("   ")).toBe(false);
    expect(isValidTaskTitle("a".repeat(81))).toBe(false);
  });
});

describe("isTaskWeight", () => {
  it("aceita 1, 2 e 3", () => {
    expect(isTaskWeight(1)).toBe(true);
    expect(isTaskWeight(2)).toBe(true);
    expect(isTaskWeight(3)).toBe(true);
  });

  it("rejeita qualquer outro valor", () => {
    expect(isTaskWeight(0)).toBe(false);
    expect(isTaskWeight(4)).toBe(false);
    expect(isTaskWeight("1")).toBe(false);
  });
});

describe("isTaskPeriod", () => {
  it("aceita os quatro períodos válidos", () => {
    expect(isTaskPeriod("morning")).toBe(true);
    expect(isTaskPeriod("afternoon")).toBe(true);
    expect(isTaskPeriod("evening")).toBe(true);
    expect(isTaskPeriod("anytime")).toBe(true);
  });

  it("rejeita qualquer outro valor", () => {
    expect(isTaskPeriod("night")).toBe(false);
    expect(isTaskPeriod(undefined)).toBe(false);
  });
});

describe("isWeekdayList", () => {
  it("aceita listas de 1 a 7 sem repetição", () => {
    expect(isWeekdayList([1, 2, 3, 4, 5])).toBe(true);
    expect(isWeekdayList([7])).toBe(true);
  });

  it("rejeita vazio, repetidos, fora do intervalo e não-arrays", () => {
    expect(isWeekdayList([])).toBe(false);
    expect(isWeekdayList([1, 1])).toBe(false);
    expect(isWeekdayList([0])).toBe(false);
    expect(isWeekdayList([8])).toBe(false);
    expect(isWeekdayList("1,2,3")).toBe(false);
  });
});
