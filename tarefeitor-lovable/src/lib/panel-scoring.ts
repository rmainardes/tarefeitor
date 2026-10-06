/**
 * Placar (puro) — espelha `lib/domain/scoring.ts` do plano.
 *
 *   task_pct = 100 × Σ peso(done) ÷ Σ peso(done + missed)
 *   bonus    = média dos dois votos de cada extra + favor_bonus × "fiz para"
 *   penalty  = report_penalty × deduradas procedentes
 *   total    = task_pct + bonus − penalty
 *
 * `covered`, `excused` e `pending` ficam fora do cálculo.
 */
import type {
  MonthBaseline,
  OccurrenceStatus,
  Person,
  Task,
} from "./panel-types";

export interface LiveOccurrence {
  taskId: string;
  status: OccurrenceStatus;
}

export interface BoardScore {
  person: Person;
  doneWeight: number;
  missedWeight: number;
  /** % do possível. */
  pct: number;
  bonus: number;
  penalty: number;
  total: number;
  streak: number;
  /** 1 = líder. */
  rank: number;
  isLeader: boolean;
  pendingJudgement: number;
}

export function computeBoardScores(options: {
  people: Person[];
  tasks: Task[];
  baselines: Record<string, MonthBaseline>;
  live: LiveOccurrence[];
  pendingJudgement: Record<string, number>;
}): BoardScore[] {
  const { people, tasks, baselines, live, pendingJudgement } = options;
  const statusByTask = new Map(live.map((row) => [row.taskId, row.status]));

  const scored = people.map((person) => {
    const baseline = baselines[person.slug] ?? {
      doneWeight: 0,
      missedWeight: 0,
      bonus: 0,
      penalty: 0,
      streak: 0,
    };

    let doneWeight = baseline.doneWeight;
    let missedWeight = baseline.missedWeight;

    for (const task of tasks) {
      if (task.personSlug !== person.slug) continue;
      const status = statusByTask.get(task.id);
      if (status === "done") doneWeight += task.weight;
      if (status === "missed") missedWeight += task.weight;
    }

    const resolved = doneWeight + missedWeight;
    const pct = resolved === 0 ? 0 : (100 * doneWeight) / resolved;

    return {
      person,
      doneWeight,
      missedWeight,
      pct,
      bonus: baseline.bonus,
      penalty: baseline.penalty,
      total: pct + baseline.bonus - baseline.penalty,
      streak: baseline.streak,
      rank: 0,
      isLeader: false,
      pendingJudgement: pendingJudgement[person.slug] ?? 0,
    } satisfies BoardScore;
  });

  const ordered = [...scored].sort((a, b) => b.total - a.total);
  const ranked = ordered.map((score, index) => ({
    ...score,
    rank: index + 1,
    isLeader: index === 0,
  }));

  return ranked;
}
