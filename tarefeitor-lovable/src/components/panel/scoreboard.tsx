import { Crown, Flame, Hourglass, Trophy } from "lucide-react";

import { PersonAvatar } from "@/components/panel/person-avatar";
import { cn } from "@/lib/utils";
import { formatPercent, formatPoints } from "@/lib/panel-schedule";
import type { BoardScore } from "@/lib/panel-scoring";

interface ScoreboardProps {
  scores: BoardScore[];
  className?: string;
}

/** Placar do mês: três avatares com anel de progresso (% do possível). */
export const Scoreboard = ({ scores, className }: ScoreboardProps) => (
  <section
    aria-label="Placar do mês"
    className={cn("grid gap-3 sm:grid-cols-3 sm:gap-4", className)}
  >
    {scores.map((score) => (
      <ScoreCard key={score.person.slug} score={score} />
    ))}
  </section>
);

const ScoreCard = ({ score }: { score: BoardScore }) => {
  const { person, isLeader, rank, pct, total, streak, pendingJudgement } =
    score;

  return (
    <article
      data-person={person.slug}
      className={cn(
        "relative flex items-center gap-4 rounded-lg border bg-card p-4 shadow-soft transition-all duration-300",
        isLeader
          ? "-translate-y-0.5 border-accent/70 ring-2 ring-accent/40"
          : "border-border",
      )}
    >
      {isLeader ? (
        <span className="absolute right-3 top-3 flex items-center gap-1.5">
          <Crown className="size-6 text-accent-strong" aria-hidden />
          <span className="sr-only">Líder do mês</span>
        </span>
      ) : null}

      <PersonAvatar
        person={person}
        pct={pct}
        className="size-20 sm:size-24 lg:size-20"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="t-headline truncate text-person-active-text">
            {person.name}
          </h3>
          <span
            className={cn(
              "t-caption shrink-0 rounded-full border px-2 py-0.5",
              isLeader
                ? "border-accent/60 bg-accent/15 text-accent-strong"
                : "border-border bg-surface-2 text-muted-foreground",
            )}
          >
            {rank}º lugar
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="t-score text-foreground">{formatPoints(total)}</span>
          <span className="t-label text-muted-foreground">pts</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted-foreground">
            <Trophy className="size-3.5" aria-hidden />
            {formatPercent(pct)} do possível
          </span>

          <span
            className={cn(
              "t-caption flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              streak > 0
                ? "border-accent/50 bg-accent/15 text-accent-strong"
                : "border-border bg-surface-2 text-muted-foreground",
            )}
          >
            <Flame className="size-3.5" aria-hidden />
            {streak} dias
          </span>

          {pendingJudgement > 0 ? (
            <span className="t-caption flex items-center gap-1.5 rounded-full border border-state-covered/40 bg-state-covered/10 px-2.5 py-1 text-state-covered">
              <Hourglass className="size-3.5" aria-hidden />
              {pendingJudgement} em julgamento
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
};
