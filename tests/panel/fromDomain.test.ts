import { describe, expect, it } from "vitest";

import type { ResolvedTask } from "@/lib/data/occurrenceResolution";
import type { PendingJudgmentItem } from "@/lib/data/judgment";
import type { PersonRecord } from "@/lib/data/people";
import type { ScoreboardEntry } from "@/lib/data/scoreboard";
import {
  judgmentToView,
  personToPanel,
  resolvedTaskToScheduled,
  scoreboardToBoardScores,
  taskToPanel,
} from "@/lib/panel/fromDomain";

const pedro: PersonRecord = {
  id: 1,
  slug: "pedro",
  name: "Pedro",
  isAdult: false,
  color: "#2f6bff",
  photoPath: "/people/Pedro.jpeg",
  photoFocus: "50% 25%",
};

const vania: PersonRecord = {
  id: 2,
  slug: "vania",
  name: "Vania",
  isAdult: true,
  color: "#ff4d7e",
  photoPath: "/people/Vania.jpeg",
  photoFocus: "50% 50%",
};

describe("personToPanel", () => {
  it("mapeia o PersonRecord real para o Person do painel", () => {
    expect(personToPanel(pedro)).toEqual({
      id: 1,
      slug: "pedro",
      name: "Pedro",
      isAdult: false,
      photoPath: "/people/Pedro.jpeg",
      photoFocus: "50% 25%",
    });
  });

  it("rejeita um slug que não é pedro/vania/rodrigo", () => {
    expect(() => personToPanel({ ...pedro, slug: "madalena" })).toThrow(/slug desconhecido/);
  });
});

describe("taskToPanel", () => {
  it("usa o emoji gravado em tasks.icon e cai a imagem null para undefined", () => {
    const task = taskToPanel(
      {
        id: "pedro-bed",
        title: "Arrumar a cama",
        icon: "🛏️",
        imagePath: null,
        period: "morning",
        weight: 1,
        sortOrder: 0,
      },
      "pedro",
    );

    expect(task).toEqual({
      id: "pedro-bed",
      personSlug: "pedro",
      title: "Arrumar a cama",
      icon: "🛏️",
      image: undefined,
      period: "morning",
      weight: 1,
    });
  });

  it("rejeita um peso fora do intervalo 1-3", () => {
    expect(() =>
      taskToPanel(
        { id: "x", title: "x", icon: "🧹", imagePath: null, period: "anytime", weight: 4, sortOrder: 0 },
        "pedro",
      ),
    ).toThrow(/fora do intervalo/);
  });
});

describe("resolvedTaskToScheduled", () => {
  const peopleById = new Map([
    [pedro.id, pedro],
    [vania.id, vania],
  ]);

  const base: ResolvedTask = {
    task: {
      id: "pedro-everest",
      title: "Guardar o Everest",
      icon: "⛰️",
      imagePath: null,
      period: "anytime",
      weight: 1,
      sortOrder: 0,
    },
    dueDate: "2026-10-06",
    state: { kind: "pending" },
    doneBy: null,
    hasRecord: false,
  };

  it("mapeia status e data de vencimento sem tocar em upcoming (ainda sem fonte real)", () => {
    const scheduled = resolvedTaskToScheduled(base, "pedro", peopleById);

    expect(scheduled.status).toBe("pending");
    expect(scheduled.dueDate).toBe("2026-10-06");
    expect(scheduled.upcoming).toBe(false);
    expect(scheduled.doneBy).toBeUndefined();
  });

  it("resolve doneBy para o slug de quem cobriu a tarefa", () => {
    const covered: ResolvedTask = {
      ...base,
      state: { kind: "covered" },
      doneBy: vania.id,
    };

    const scheduled = resolvedTaskToScheduled(covered, "pedro", peopleById);

    expect(scheduled.status).toBe("covered");
    expect(scheduled.doneBy).toBe("vania");
  });

  it("deixa doneBy indefinido se o id não estiver no mapa de pessoas", () => {
    const covered: ResolvedTask = { ...base, state: { kind: "covered" }, doneBy: 999 };

    expect(resolvedTaskToScheduled(covered, "pedro", peopleById).doneBy).toBeUndefined();
  });
});

describe("scoreboardToBoardScores", () => {
  it("ordena por total, numera o rank e preserva isLeader do servidor", () => {
    const entries: ScoreboardEntry[] = [
      { person: pedro, pct: 85, total: 87, isLeader: false },
      { person: vania, pct: 94, total: 99.4, isLeader: true },
    ];

    const [first, second] = scoreboardToBoardScores(entries);

    expect(first.person.slug).toBe("vania");
    expect(first.rank).toBe(1);
    expect(first.isLeader).toBe(true);
    expect(first.pct).toBe(94);
    expect(first.total).toBe(99.4);

    expect(second.person.slug).toBe("pedro");
    expect(second.rank).toBe(2);
    expect(second.isLeader).toBe(false);
  });

  it("zera campos que o servidor ainda não calcula por pessoa (streak, julgamento)", () => {
    const entries: ScoreboardEntry[] = [{ person: pedro, pct: 85, total: 87, isLeader: true }];

    const [score] = scoreboardToBoardScores(entries);

    expect(score.streak).toBe(0);
    expect(score.pendingJudgement).toBe(0);
    expect(score.doneWeight).toBe(0);
    expect(score.missedWeight).toBe(0);
    expect(score.bonus).toBe(0);
    expect(score.penalty).toBe(0);
  });
});

describe("judgmentToView", () => {
  const peopleById = new Map([
    [pedro.id, pedro],
    [vania.id, vania],
  ]);

  it("resolve o autor de um extra e marca 2 votos necessários", () => {
    const extra: PendingJudgmentItem = {
      id: "e1",
      kind: "extra",
      authorId: vania.id,
      accusedId: null,
      description: "cozinhou para a semana inteira",
      defense: null,
      happenedOn: "2026-10-04",
    };

    const view = judgmentToView(extra, peopleById);

    expect(view.authorName).toBe("Vania");
    expect(view.accusedName).toBeUndefined();
    expect(view.votesNeeded).toBe(2);
    expect(view.votesIn).toBe(0);
    expect(view.whenLabel).toContain("feito em");
  });

  it("resolve autor e acusado de uma dedurada e marca 3 votos necessários", () => {
    const report: PendingJudgmentItem = {
      id: "r1",
      kind: "report",
      authorId: pedro.id,
      accusedId: vania.id,
      description: "não tirou o lixo direito",
      defense: "eu tirei!",
      happenedOn: "2026-10-05",
    };

    const view = judgmentToView(report, peopleById);

    expect(view.authorName).toBe("Pedro");
    expect(view.accusedName).toBe("Vania");
    expect(view.defense).toBe("eu tirei!");
    expect(view.votesNeeded).toBe(3);
    expect(view.whenLabel).toContain("aconteceu em");
  });

  it("usa um nome de reserva quando a pessoa não está no mapa", () => {
    const extra: PendingJudgmentItem = {
      id: "e2",
      kind: "extra",
      authorId: 999,
      accusedId: null,
      description: "algo",
      defense: null,
      happenedOn: "2026-10-04",
    };

    expect(judgmentToView(extra, peopleById).authorName).toBe("alguém");
  });
});
