"use client";

import { useCallback, useMemo, useState } from "react";

import {
  baselines,
  examEves,
  judgement,
  occurrences,
  people,
  tasks,
  TODAY,
  YESTERDAY,
} from "@/lib/panel/panel-seed";
import { occurrenceKey, resolveDue } from "@/lib/panel/panel-schedule";
import { computeBoardScores, type BoardScore } from "@/lib/panel/panel-scoring";
import type { OccurrenceStatus, PersonSlug, Task } from "@/lib/panel/panel-types";

export interface ScheduledTask {
  task: Task;
  dueDate: string;
  upcoming: boolean;
  status: OccurrenceStatus;
  doneBy?: PersonSlug;
  note?: string;
}

interface OccurrenceMeta {
  doneBy?: PersonSlug;
  note?: string;
}

const seededStates: Record<string, OccurrenceStatus> = {};
const seededMeta: Record<string, OccurrenceMeta> = {};

for (const row of occurrences) {
  const isoDate = row.dayOffset === 0 ? TODAY : YESTERDAY;
  const key = occurrenceKey(row.taskId, isoDate);
  seededStates[key] = row.status;
  if (row.doneBy || row.note)
    seededMeta[key] = { doneBy: row.doneBy, note: row.note };
}

/**
 * Estado do painel. No app real cada toque vira uma Server Action; aqui o
 * mesmo contrato é mantido: marca, desfaz e o placar recalcula na hora.
 */
export function useTaskBoard() {
  const [states, setStates] =
    useState<Record<string, OccurrenceStatus>>(seededStates);
  const meta = useMemo(() => seededMeta, []);

  const setStatus = useCallback(
    (taskId: string, isoDate: string, status: OccurrenceStatus) => {
      setStates((current) => ({
        ...current,
        [occurrenceKey(taskId, isoDate)]: status,
      }));
    },
    [],
  );

  const markDone = useCallback(
    (taskId: string, isoDate: string) => setStatus(taskId, isoDate, "done"),
    [setStatus],
  );

  const undo = useCallback(
    (taskId: string, isoDate: string) => setStatus(taskId, isoDate, "pending"),
    [setStatus],
  );

  const markMissed = useCallback(
    (taskId: string, isoDate: string) => setStatus(taskId, isoDate, "missed"),
    [setStatus],
  );

  /** Tarefas devidas (ou já visíveis) de uma pessoa em um dia. */
  const scheduleFor = useCallback(
    (personSlug: PersonSlug, isoDate: string): ScheduledTask[] =>
      tasks
        .filter((task) => task.personSlug === personSlug)
        .flatMap((task) => {
          const due = resolveDue(task, isoDate, examEves);
          if (!due) return [];
          const key = occurrenceKey(task.id, due.dueDate);
          const meta_ = meta[key];
          return [
            {
              task,
              dueDate: due.dueDate,
              upcoming: due.upcoming,
              status: states[key] ?? "pending",
              doneBy: meta_?.doneBy,
              note: meta_?.note,
            } satisfies ScheduledTask,
          ];
        })
        .sort(
          (a, b) =>
            b.task.weight - a.task.weight ||
            a.task.title.localeCompare(b.task.title, "pt-BR"),
        ),
    [states, meta],
  );

  const pendingJudgementByPerson = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of judgement) {
      const person = item.kind === "extra" ? item.authorSlug : item.accusedSlug;
      if (!person) continue;
      counts[person] = (counts[person] ?? 0) + 1;
    }
    return counts;
  }, []);

  const scores = useMemo<BoardScore[]>(() => {
    const live = Object.entries(states).map(([key, status]) => ({
      taskId: key.split("|")[0],
      status,
    }));
    return computeBoardScores({
      people,
      tasks,
      baselines,
      live,
      pendingJudgement: pendingJudgementByPerson,
    });
  }, [states, pendingJudgementByPerson]);

  return { markDone, undo, markMissed, scheduleFor, scores };
}
