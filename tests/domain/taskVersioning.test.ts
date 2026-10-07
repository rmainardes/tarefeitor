import { describe, expect, it } from "vitest";

import { needsNewTaskVersion, type TaskVersionFields } from "@/lib/domain/taskVersioning";

const base: TaskVersionFields = {
  personId: 1,
  weight: 2,
  kind: "weekly",
  weekdays: [1, 3, 5],
  monthDay: null,
  onceDate: null,
  leadDays: 0,
};

describe("needsNewTaskVersion", () => {
  it("não precisa de nova versão quando nada muda", () => {
    expect(needsNewTaskVersion(base, { ...base })).toBe(false);
  });

  it("não precisa de nova versão quando os mesmos dias da semana vêm em outra ordem", () => {
    expect(needsNewTaskVersion(base, { ...base, weekdays: [5, 1, 3] })).toBe(false);
  });

  it("muda de versão quando o peso muda", () => {
    expect(needsNewTaskVersion(base, { ...base, weight: 3 })).toBe(true);
  });

  it("muda de versão quando o responsável muda", () => {
    expect(needsNewTaskVersion(base, { ...base, personId: 2 })).toBe(true);
  });

  it("muda de versão quando o tipo de recorrência muda", () => {
    expect(needsNewTaskVersion(base, { ...base, kind: "daily" })).toBe(true);
  });

  it("muda de versão quando os dias da semana mudam de fato", () => {
    expect(needsNewTaskVersion(base, { ...base, weekdays: [2, 4] })).toBe(true);
  });

  it("muda de versão quando o dia do mês muda", () => {
    const monthly: TaskVersionFields = { ...base, kind: "monthly", weekdays: null, monthDay: 1 };
    expect(needsNewTaskVersion(monthly, { ...monthly, monthDay: 15 })).toBe(true);
  });

  it("muda de versão quando a data única muda", () => {
    const once: TaskVersionFields = { ...base, kind: "once", weekdays: null, onceDate: "2026-12-01" };
    expect(needsNewTaskVersion(once, { ...once, onceDate: "2026-12-02" })).toBe(true);
  });

  it("muda de versão quando a antecedência muda", () => {
    expect(needsNewTaskVersion(base, { ...base, leadDays: 3 })).toBe(true);
  });
});
