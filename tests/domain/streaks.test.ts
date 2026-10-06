import { describe, expect, it } from "vitest";
import { calculateCurrentStreak, classifyDay } from "@/lib/domain/streaks";

describe("classifyDay", () => {
  it("é 'perfect' quando todas as ocorrências devidas foram feitas", () => {
    expect(classifyDay([{ status: "done" }, { status: "done" }])).toBe("perfect");
  });

  it("é 'imperfect' quando pelo menos uma ocorrência não foi feita", () => {
    expect(classifyDay([{ status: "done" }, { status: "missed" }])).toBe("imperfect");
  });

  it("é 'neutral' sem nenhuma tarefa devida", () => {
    expect(classifyDay([])).toBe("neutral");
  });

  it("é 'neutral' quando o dia inteiro está em folga", () => {
    expect(classifyDay([{ status: "excused" }, { status: "excused" }])).toBe("neutral");
  });
});

describe("calculateCurrentStreak", () => {
  it("conta os dias perfeitos consecutivos a partir do mais recente", () => {
    const days = ["perfect", "perfect", "perfect"] as const;
    expect(calculateCurrentStreak(days)).toBe(3);
  });

  it("um dia em folga (neutral) não quebra nem soma a sequência", () => {
    const days = ["perfect", "neutral", "perfect", "perfect"] as const;
    expect(calculateCurrentStreak(days)).toBe(3);
  });

  it("uma falha (imperfect) quebra a sequência", () => {
    const days = ["perfect", "perfect", "imperfect", "perfect"] as const;
    expect(calculateCurrentStreak(days)).toBe(1);
  });

  it("é 0 quando o dia mais recente já é uma falha", () => {
    const days = ["perfect", "perfect", "imperfect"] as const;
    expect(calculateCurrentStreak(days)).toBe(0);
  });
});
