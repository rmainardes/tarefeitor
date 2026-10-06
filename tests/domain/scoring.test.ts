import { describe, expect, it } from "vitest";
import {
  calculateExtraBonus,
  calculateMonthScore,
  calculatePenalty,
  calculateTaskPct,
  compareForRanking,
  isReportUpheld,
  rankScores,
  type WeightedOccurrence,
} from "@/lib/domain/scoring";

describe("calculateTaskPct", () => {
  it("pondera pelo peso da tarefa", () => {
    const occurrences: WeightedOccurrence[] = [
      { weight: 1, status: "done" },
      { weight: 3, status: "done" },
      { weight: 1, status: "missed" },
    ];
    // feito: 1 + 3 = 4; resolvido: 1 + 3 + 1 = 5 → 80%
    expect(calculateTaskPct(occurrences)).toBe(80);
  });

  it("ignora ocorrências 'covered' (neutras para o dono)", () => {
    const occurrences: WeightedOccurrence[] = [
      { weight: 1, status: "done" },
      { weight: 2, status: "covered" },
      { weight: 1, status: "missed" },
    ];
    // feito: 1; resolvido: 1 + 1 = 2 (covered não entra) → 50%
    expect(calculateTaskPct(occurrences)).toBe(50);
  });

  it("ignora ocorrências dispensadas por folga", () => {
    const occurrences: WeightedOccurrence[] = [
      { weight: 1, status: "done" },
      { weight: 5, status: "excused" },
    ];
    expect(calculateTaskPct(occurrences)).toBe(100);
  });

  it("é 0 quando não há nenhuma ocorrência resolvida no mês", () => {
    const occurrences: WeightedOccurrence[] = [
      { weight: 1, status: "excused" },
      { weight: 2, status: "covered" },
    ];
    expect(calculateTaskPct(occurrences)).toBe(0);
  });
});

describe("calculateExtraBonus", () => {
  it("soma a média dos dois votos de cada extra julgado", () => {
    const bonus = calculateExtraBonus([{ votes: [2, 3] }, { votes: [0, 1] }]);
    // (2+3)/2 + (0+1)/2 = 2.5 + 0.5 = 3
    expect(bonus).toBe(3);
  });

  it("extras ainda não julgados (sem votos) não entram no total", () => {
    const bonus = calculateExtraBonus([{ votes: [3, 3] }, { votes: [] }]);
    expect(bonus).toBe(3);
  });
});

describe("isReportUpheld", () => {
  it("é procedente com 2 votos 'procede' entre os três", () => {
    expect(isReportUpheld([1, 1, 0])).toBe(true);
  });

  it("não é procedente com apenas 1 voto 'procede'", () => {
    expect(isReportUpheld([1, 0, 0])).toBe(false);
  });

  it("é procedente com os 3 votos 'procede'", () => {
    expect(isReportUpheld([1, 1, 1])).toBe(true);
  });
});

describe("calculatePenalty", () => {
  it("multiplica o valor configurado pelo número de deduradas procedentes", () => {
    expect(calculatePenalty({ upheldReportsAgainstPerson: 2, reportPenalty: 2 })).toBe(4);
  });

  it("contestações procedentes não entram aqui (a punição já é a perda do peso)", () => {
    // O chamador nunca deve contar contestações em upheldReportsAgainstPerson;
    // aqui só validamos que, com 0, a função não inventa penalidade.
    expect(calculatePenalty({ upheldReportsAgainstPerson: 0, reportPenalty: 2 })).toBe(0);
  });
});

describe("calculateMonthScore", () => {
  it("combina task_pct, bônus e penalidade no total", () => {
    const score = calculateMonthScore({
      occurrences: [
        { weight: 2, status: "done" },
        { weight: 2, status: "missed" },
      ],
      judgedExtras: [{ votes: [2, 2] }],
      favorsDone: 1,
      favorBonus: 1,
      upheldReportsAgainstPerson: 1,
      reportPenalty: 2,
    });
    // taskPct = 50; bonus = 2 (extra) + 1 (favor) = 3; penalty = 2
    expect(score.taskPct).toBe(50);
    expect(score.bonus).toBe(3);
    expect(score.penalty).toBe(2);
    expect(score.total).toBe(51);
  });

  it("o total pode passar de 100", () => {
    const score = calculateMonthScore({
      occurrences: [{ weight: 1, status: "done" }],
      judgedExtras: [{ votes: [3, 3] }],
      favorsDone: 0,
      favorBonus: 1,
      upheldReportsAgainstPerson: 0,
      reportPenalty: 2,
    });
    expect(score.total).toBe(103);
  });
});

describe("desempate (compareForRanking / rankScores)", () => {
  it("ordena primeiro pelo total", () => {
    const a = { personId: 1, total: 90, upheldReportsCount: 0, currentStreak: 0 };
    const b = { personId: 2, total: 95, upheldReportsCount: 0, currentStreak: 0 };
    expect(rankScores([a, b]).map((s) => s.personId)).toEqual([2, 1]);
  });

  it("com o mesmo total, quem tem menos deduradas procedentes fica na frente", () => {
    const a = { personId: 1, total: 90, upheldReportsCount: 1, currentStreak: 0 };
    const b = { personId: 2, total: 90, upheldReportsCount: 0, currentStreak: 0 };
    expect(rankScores([a, b]).map((s) => s.personId)).toEqual([2, 1]);
  });

  it("empatados também em deduradas, decide a maior sequência atual", () => {
    const a = { personId: 1, total: 90, upheldReportsCount: 0, currentStreak: 3 };
    const b = { personId: 2, total: 90, upheldReportsCount: 0, currentStreak: 10 };
    expect(rankScores([a, b]).map((s) => s.personId)).toEqual([2, 1]);
  });

  it("empate total em tudo cabe ao sorteio: compareForRanking retorna 0", () => {
    const a = { personId: 1, total: 90, upheldReportsCount: 0, currentStreak: 3 };
    const b = { personId: 2, total: 90, upheldReportsCount: 0, currentStreak: 3 };
    expect(compareForRanking(a, b)).toBe(0);
  });
});
