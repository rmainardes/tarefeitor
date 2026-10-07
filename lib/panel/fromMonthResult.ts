/**
 * Adapta `MonthResult` (lib/data/months) — já congelado no fechamento — para
 * os tipos de `lib/panel/ceremony-seed` que os componentes de
 * `components/ceremony` (portados do Lovable) esperam. Sem I/O.
 */
import type { MonthResult } from "@/lib/data/months";
import type { PersonRecord } from "@/lib/data/people";
import { closedAtLabel, monthLabel } from "@/lib/panel/panel-schedule";
import type { RankingEntry } from "@/lib/panel/ceremony-seed";
import { isPersonSlug } from "@/lib/panel/fromDomain";
import type { PersonSlug } from "@/lib/panel/panel-types";

export interface ClosedMonthSummary {
  monthIso: string;
  monthTitle: string;
  closedAtLabel: string;
  votesLabel: string;
}

function toPersonSlug(slug: string): PersonSlug {
  if (isPersonSlug(slug)) return slug;
  throw new Error(`pessoa com slug desconhecido: "${slug}"`);
}

/**
 * `streak` sempre 0: `month_scores` (seção 6) não guarda a sequência — ela só
 * entra no desempate do fechamento (`lib/data/monthScoring`) e não é
 * persistida. Mostrar a sequência congelada na cerimônia pede recalculá-la
 * das ocorrências do mês fechado; mesma lacuna de `BoardScore.streak` no
 * Painel (`lib/panel/fromDomain`).
 */
export function monthResultToRanking(
  monthResult: MonthResult,
  peopleById: ReadonlyMap<number, PersonRecord>,
): RankingEntry[] {
  return monthResult.scores
    .map((score) => {
      const person = peopleById.get(score.personId);
      if (!person) return null;
      const rank = score.rank === 1 || score.rank === 2 || score.rank === 3 ? score.rank : 3;
      return {
        slug: toPersonSlug(person.slug),
        rank,
        total: score.total,
        taskPct: score.taskPct,
        bonus: score.bonus,
        penalty: score.penalty,
        streak: 0,
        badges: score.badges,
      } satisfies RankingEntry;
    })
    .filter((entry): entry is RankingEntry => entry !== null)
    .sort((a, b) => a.rank - b.rank);
}

function countJudged(summary: unknown): { extras: number; reports: number } {
  if (typeof summary !== "object" || summary === null) return { extras: 0, reports: 0 };
  const { judgedExtras, judgedReports } = summary as Record<string, unknown>;
  return {
    extras: Array.isArray(judgedExtras) ? judgedExtras.length : 0,
    reports: Array.isArray(judgedReports) ? judgedReports.length : 0,
  };
}

export function monthResultToSummary(monthResult: MonthResult): ClosedMonthSummary {
  const { extras, reports } = countJudged(monthResult.result.summary);
  return {
    monthIso: monthResult.result.month,
    monthTitle: monthLabel(monthResult.result.month),
    closedAtLabel: closedAtLabel(monthResult.result.closedAt),
    votesLabel: `${extras} extra(s) e ${reports} dedurada(s) julgados`,
  };
}
