// Fechamento de mês (seção 7.7, T12): materializa as pendências do último
// dia, monta a fotografia completa do mês (placar, sequências e medalhas —
// seções 7.3/7.4) e devolve o que `closeMonth` precisa gravar. Tudo aqui é
// I/O; a matemática em si já existe em `lib/domain`.

import {
  compareISODates,
  daysInMonth,
  enumerateDates,
  parseISODate,
  type ISODate,
} from "../domain/dates";
import { calculatePersonalBadges, findSnitches, type BadgeCode } from "../domain/badges";
import { calculateMonthScore, isReportUpheld, rankScores } from "../domain/scoring";
import { calculateCurrentStreak, classifyDay, type DayOutcome } from "../domain/streaks";
import { resolvePersonOccurrences, type ResolvedTask } from "./occurrenceResolution";
import { isExtraJudged, isReportJudged, listMonthExtras, listMonthReports } from "./judgment";
import { listPeople } from "./people";
import { getNumberSetting } from "./settings";
import { countCoveredBy, upsertOccurrence } from "./taskOccurrences";
import type { PersonMonthScoreInput } from "./months";

const BED_TASK_TITLE = "Arrumar a cama";
const EVEREST_TASK_TITLE = "Guardar Everest";
const PINGO_TASK_TITLE = "Passear com o Pingo";

function monthEndOf(month: ISODate): ISODate {
  const { year, month: monthNum } = parseISODate(month);
  const lastDay = daysInMonth(year, monthNum);
  return `${month.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

export interface MonthReadiness {
  /** Hoje já passou do último dia do mês (disponível "a partir do dia 1" do mês seguinte). */
  monthOver: boolean;
  votesComplete: boolean;
  pendingJudgments: number;
  ready: boolean;
}

/** Pode fechar `month`? Seção 7.7: mês acabado + todos os votos necessários registrados. */
export async function getMonthReadiness(month: ISODate, today: ISODate): Promise<MonthReadiness> {
  const monthEnd = monthEndOf(month);
  const monthOver = compareISODates(today, monthEnd) > 0;

  const [extras, reports] = await Promise.all([
    listMonthExtras(month, monthEnd),
    listMonthReports(month, monthEnd),
  ]);

  const pendingJudgments =
    extras.filter((extra) => !isExtraJudged(extra)).length +
    reports.filter((report) => !isReportJudged(report)).length;

  return {
    monthOver,
    votesComplete: pendingJudgments === 0,
    pendingJudgments,
    ready: monthOver && pendingJudgments === 0,
  };
}

/**
 * "Pendências do último dia são resolvidas como estiverem" (seção 7.7): o
 * prazo retroativo do último dia pode ainda não ter vencido no instante em
 * que o mês é fechado. Materializa como `missed` tudo que ainda aparecer
 * "pendente" nesse dia, para a fotografia do mês não depender do relógio.
 */
export async function resolveLastDayPendencies(month: ISODate, actorId: number): Promise<void> {
  const monthEnd = monthEndOf(month);
  const now = new Date();
  const people = await listPeople();

  for (const person of people) {
    const resolved = await resolvePersonOccurrences(person.id, [monthEnd], now);
    const pending = resolved.filter((item) => item.state.kind === "pending");

    for (const item of pending) {
      await upsertOccurrence({
        taskId: item.task.id,
        dueDate: item.dueDate,
        status: "missed",
        doneBy: null,
        markedBy: actorId,
        note: "mês fechado: pendência resolvida no fechamento",
      });
    }
  }
}

function outcomeForState(kind: ResolvedTask["state"]["kind"]): DayOutcome {
  if (kind === "done") return "perfect";
  if (kind === "missed") return "imperfect";
  return "neutral"; // covered, excused — e "pending", que não deveria sobrar num mês já acabado.
}

export interface MonthSnapshot {
  scores: PersonMonthScoreInput[];
  summary: Record<string, unknown>;
}

/**
 * Fotografia completa do mês (seção 6: `month_results.summary`). Chame depois
 * de `resolveLastDayPendencies` — sem isso, o último dia pode ainda aparecer
 * "pendente" e sair de fora do `task_pct`.
 */
export async function buildMonthSnapshot(month: ISODate): Promise<MonthSnapshot> {
  const monthEnd = monthEndOf(month);
  const allDates = enumerateDates(month, monthEnd);
  const now = new Date();

  const [people, favorBonus, reportPenalty, extras, reports] = await Promise.all([
    listPeople(),
    getNumberSetting("favor_bonus"),
    getNumberSetting("report_penalty"),
    listMonthExtras(month, monthEnd),
    listMonthReports(month, monthEnd),
  ]);

  const judgedExtras = extras.filter(isExtraJudged);
  // Contestações ("não fez direito", com task_id) procedentes não entram na penalidade:
  // a perda do peso da tarefa já é a punição (seção 7.3). Só a dedurada comum desconta.
  const judgedPlainReports = reports.filter((report) => report.taskId === null && isReportJudged(report));

  const upheldAuthoredCount = new Map<number, number>();
  for (const report of judgedPlainReports) {
    if (!isReportUpheld(report.votes.map((vote) => vote.value))) continue;
    upheldAuthoredCount.set(report.authorId, (upheldAuthoredCount.get(report.authorId) ?? 0) + 1);
  }
  const snitchIds = new Set(findSnitches(upheldAuthoredCount));

  const perPerson = await Promise.all(
    people.map(async (person) => {
      const resolved = await resolvePersonOccurrences(person.id, allDates, now);
      const favorsDone = await countCoveredBy(person.id, month, monthEnd);

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

      const byDate = new Map<string, ResolvedTask[]>();
      for (const item of resolved) {
        const list = byDate.get(item.dueDate) ?? [];
        list.push(item);
        byDate.set(item.dueDate, list);
      }

      const bedDayOutcomes: DayOutcome[] = allDates.map((date) => {
        const row = (byDate.get(date) ?? []).find((item) => item.task.title === BED_TASK_TITLE);
        return row ? outcomeForState(row.state.kind) : "neutral";
      });
      const everestDayOutcomes: DayOutcome[] = allDates.map((date) => {
        const row = (byDate.get(date) ?? []).find((item) => item.task.title === EVEREST_TASK_TITLE);
        return row ? outcomeForState(row.state.kind) : "neutral";
      });
      const overallDayOutcomes: DayOutcome[] = allDates.map((date) =>
        classifyDay(
          (byDate.get(date) ?? [])
            .filter((item) => item.state.kind !== "pending")
            .map((item) => ({ status: item.state.kind as "done" | "missed" | "covered" | "excused" })),
        ),
      );
      const walkOccurrences = resolved
        .filter((item) => item.task.title === PINGO_TASK_TITLE && item.state.kind !== "pending")
        .map((item) => ({ status: item.state.kind as "done" | "missed" | "covered" | "excused" }));

      const badges: BadgeCode[] = calculatePersonalBadges({
        bedDayOutcomes,
        everestDayOutcomes,
        walkOccurrences,
        overallDayOutcomes,
        favorsDone,
        upheldReportsAgainstPerson,
      });
      if (snitchIds.has(person.id)) badges.push("snitch");

      return {
        personId: person.id,
        taskPct: score.taskPct,
        bonus: score.bonus,
        penalty: score.penalty,
        total: score.total,
        badges,
        streak: calculateCurrentStreak(overallDayOutcomes),
        upheldReportsCount: upheldReportsAgainstPerson,
      };
    }),
  );

  // Desempate: maior total → menos deduradas procedentes → maior sequência (seção 7.3).
  // Num empate total remanescente (raríssimo, com médias e bônus fracionários),
  // compareForRanking devolve 0 e a ordem original decide — sem sorteio aqui; a
  // "roleta" da seção 7.7 é só para o 3º lugar escolher o castigo.
  const ranked = rankScores(
    perPerson.map((entry) => ({
      personId: entry.personId,
      total: entry.total,
      upheldReportsCount: entry.upheldReportsCount,
      currentStreak: entry.streak,
    })),
  );
  const rankByPersonId = new Map<number, 1 | 2 | 3>(
    ranked.map((entry, index) => [entry.personId, (index + 1) as 1 | 2 | 3]),
  );

  const scores: PersonMonthScoreInput[] = perPerson.map((entry) => ({
    personId: entry.personId,
    taskPct: entry.taskPct,
    bonus: entry.bonus,
    penalty: entry.penalty,
    total: entry.total,
    rank: rankByPersonId.get(entry.personId) ?? 3,
    badges: entry.badges,
  }));

  const summary = {
    favorBonus,
    reportPenalty,
    judgedExtras: judgedExtras.map((extra) => ({
      id: extra.id,
      authorId: extra.authorId,
      votes: extra.votes,
    })),
    judgedReports: reports.filter(isReportJudged).map((report) => ({
      id: report.id,
      authorId: report.authorId,
      accusedId: report.accusedId,
      taskId: report.taskId,
      votes: report.votes,
    })),
  };

  return { scores, summary };
}
