/**
 * Adaptadores puros: convertem os tipos reais (`lib/data`, `lib/domain`) para
 * os tipos do painel portado do Lovable (`lib/panel/panel-types`). Sem I/O —
 * quem busca os dados é o chamador (T2b/T2c do porte).
 *
 * Campos que a camada real ainda não calcula ficam com um valor neutro e um
 * comentário apontando a lacuna, em vez de um palpite:
 *   - `ScheduledTask.upcoming`: `resolvePersonOccurrences` já resolve a data de
 *     vencimento; o aviso "vence dia X" de mensais futuras não tem fonte ainda.
 *   - `BoardScore.streak`: pede `lib/domain/streaks` sobre o mês inteiro.
 *   - `BoardScore.pendingJudgement` (por pessoa): julgamento ainda não atribui
 *     item a pessoa (seção 7.3, entra na T11); só existe a contagem geral.
 */
import type { ResolvedTask, TaskListItem } from "@/lib/data/occurrenceResolution";
import type { PersonRecord } from "@/lib/data/people";
import type { ScoreboardEntry } from "@/lib/data/scoreboard";
import type { PendingJudgmentItem } from "@/lib/data/judgment";
import { dayMonthLabel } from "@/lib/panel/panel-schedule";
import type { BoardScore } from "@/lib/panel/panel-scoring";
import type { JudgementItemView, Person, PersonSlug, ScheduledTask, Task } from "@/lib/panel/panel-types";

const PERSON_SLUGS: readonly PersonSlug[] = ["pedro", "vania", "rodrigo"];

export function isPersonSlug(slug: string): slug is PersonSlug {
  return (PERSON_SLUGS as readonly string[]).includes(slug);
}

function toPersonSlug(slug: string): PersonSlug {
  if (isPersonSlug(slug)) return slug;
  throw new Error(`pessoa com slug desconhecido: "${slug}"`);
}

function toTaskWeight(weight: number): 1 | 2 | 3 {
  if (weight === 1 || weight === 2 || weight === 3) return weight;
  throw new Error(`peso de tarefa fora do intervalo esperado (1-3): ${weight}`);
}

export function personToPanel(record: PersonRecord): Person {
  return {
    id: record.id,
    slug: toPersonSlug(record.slug),
    name: record.name,
    isAdult: record.isAdult,
    photoPath: record.photoPath,
    photoFocus: record.photoFocus,
  };
}

export function taskToPanel(task: TaskListItem, personSlug: PersonSlug): Task {
  return {
    id: task.id,
    personSlug,
    title: task.title,
    icon: task.icon,
    image: task.imagePath ?? undefined,
    period: task.period,
    weight: toTaskWeight(task.weight),
  };
}

/** `peopleById` resolve quem cobriu a tarefa (`doneBy`) para o slug exibido. */
export function resolvedTaskToScheduled(
  resolved: ResolvedTask,
  personSlug: PersonSlug,
  peopleById: ReadonlyMap<number, PersonRecord>,
): ScheduledTask {
  const coveredBy = resolved.doneBy !== null ? peopleById.get(resolved.doneBy) : undefined;

  return {
    task: taskToPanel(resolved.task, personSlug),
    dueDate: resolved.dueDate,
    upcoming: false,
    status: resolved.state.kind,
    doneBy: coveredBy ? toPersonSlug(coveredBy.slug) : undefined,
  };
}

/** Já ordena por `total` e numera o `rank`; `isLeader` vem pronto do servidor. */
export function scoreboardToBoardScores(entries: readonly ScoreboardEntry[]): BoardScore[] {
  return [...entries]
    .sort((a, b) => b.total - a.total)
    .map((entry, index) => ({
      person: personToPanel(entry.person),
      doneWeight: 0,
      missedWeight: 0,
      pct: entry.pct,
      bonus: 0,
      penalty: 0,
      total: entry.total,
      streak: 0,
      rank: index + 1,
      isLeader: entry.isLeader,
      pendingJudgement: 0,
    }));
}

const VOTES_NEEDED: Record<PendingJudgmentItem["kind"], number> = {
  extra: 2,
  report: 3,
};

/**
 * `peopleById` resolve autor/acusado para nome. `votesIn` fica em 0 — votar
 * ainda não existe (T11); por isso tudo que está aqui conta como pendente.
 */
export function judgmentToView(
  item: PendingJudgmentItem,
  peopleById: ReadonlyMap<number, PersonRecord>,
): JudgementItemView {
  const author = peopleById.get(item.authorId);
  const accused = item.accusedId !== null ? peopleById.get(item.accusedId) : undefined;

  return {
    id: item.id,
    kind: item.kind,
    authorName: author?.name ?? "alguém",
    accusedName: accused?.name,
    description: item.description,
    defense: item.defense ?? undefined,
    whenLabel:
      item.kind === "extra"
        ? `feito em ${dayMonthLabel(item.happenedOn)}`
        : `aconteceu em ${dayMonthLabel(item.happenedOn)}`,
    votesIn: 0,
    votesNeeded: VOTES_NEEDED[item.kind],
  };
}
