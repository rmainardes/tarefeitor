// Placar do mês corrente (seção 7.3 + 8.1): para cada pessoa, cruza as
// ocorrências do mês até hoje com o domínio puro de pontuação.

import { addDays, compareISODates, toISODate, type ISODate } from "../domain/dates";
import { calculateMonthScore, isReportUpheld } from "../domain/scoring";
import { resolvePersonOccurrences } from "./occurrenceResolution";
import { isExtraJudged, isReportJudged, listMonthExtras, listMonthReports } from "./judgment";
import { listPeople, type PersonRecord } from "./people";
import { getNumberSetting } from "./settings";
import { countCoveredBy } from "./taskOccurrences";

export interface ScoreboardEntry {
  person: PersonRecord;
  pct: number;
  total: number;
  isLeader: boolean;
}

export interface Scoreboard {
  entries: ScoreboardEntry[];
  pendingJudgments: number;
}

function enumerateDates(from: ISODate, to: ISODate): ISODate[] {
  const dates: ISODate[] = [];
  for (let cursor = from; compareISODates(cursor, to) <= 0; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export async function getScoreboard(now: Date): Promise<Scoreboard> {
  const today = toISODate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthToDate = enumerateDates(monthStart, today);

  const [people, favorBonus, reportPenalty, extras, reports] = await Promise.all([
    listPeople(),
    getNumberSetting("favor_bonus"),
    getNumberSetting("report_penalty"),
    listMonthExtras(monthStart, today),
    listMonthReports(monthStart, today),
  ]);

  const judgedExtras = extras.filter(isExtraJudged);
  // Contestações ("não fez direito", com task_id) procedentes não entram aqui: a perda do
  // peso da tarefa já é a punição (seção 7.3). Só a dedurada comum desconta report_penalty.
  const judgedPlainReports = reports.filter((report) => report.taskId === null && isReportJudged(report));

  const pendingJudgments =
    extras.filter((extra) => !isExtraJudged(extra)).length +
    reports.filter((report) => !isReportJudged(report)).length;

  const entries = await Promise.all(
    people.map(async (person): Promise<Omit<ScoreboardEntry, "isLeader">> => {
      const [resolved, favorsDone] = await Promise.all([
        resolvePersonOccurrences(person.id, monthToDate, now),
        countCoveredBy(person.id, monthStart, today),
      ]);

      const occurrences = resolved
        .filter((item) => item.state.kind === "done" || item.state.kind === "missed")
        .map((item) => ({ weight: item.task.weight, status: item.state.kind as "done" | "missed" }));

      const personJudgedExtras = judgedExtras
        .filter((extra) => extra.authorId === person.id)
        .map((extra) => ({ votes: extra.votes.map((vote) => vote.value) }));

      const upheldReportsAgainstPerson = judgedPlainReports.filter(
        (report) =>
          report.accusedId === person.id && isReportUpheld(report.votes.map((vote) => vote.value)),
      ).length;

      const score = calculateMonthScore({
        occurrences,
        judgedExtras: personJudgedExtras,
        favorsDone,
        favorBonus,
        upheldReportsAgainstPerson,
        reportPenalty,
      });

      return { person, pct: score.taskPct, total: score.total };
    }),
  );

  const maxTotal = Math.max(...entries.map((entry) => entry.total));
  const leaderCount = entries.filter((entry) => entry.total === maxTotal).length;

  return {
    entries: entries.map((entry) => ({ ...entry, isLeader: leaderCount === 1 && entry.total === maxTotal })),
    pendingJudgments,
  };
}
