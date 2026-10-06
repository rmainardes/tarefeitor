import {
  CircleHelp,
  Crown,
  Flame,
  Hammer,
  IceCreamBowl,
  IceCreamCone,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";

import { MonthMedals } from "@/components/ceremony/month-medals";
import { PersonAvatar } from "@/components/panel/person-avatar";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import { personBySlug } from "@/lib/panel/panel-people";
import { formatPercent, formatPoints } from "@/lib/panel/panel-schedule";
import type { RankingEntry } from "@/lib/panel/ceremony-seed";

export type Place = 1 | 2 | 3;

/** Ordem de anúncio: 3º → 2º → 1º. */
const REVEAL_ORDER: Place[] = [3, 2, 1];

/** No grid, o pódio aparece como 2º · 1º · 3º. */
const PODIUM_ORDER: Place[] = [2, 1, 3];

const COLUMN_HEIGHT: Record<Place, string> = {
  1: "sm:min-h-[26rem]",
  2: "sm:min-h-[21rem]",
  3: "sm:min-h-[18rem]",
};

/** No celular a lista sai 1º · 2º · 3º. */
const COLUMN_ORDER: Record<Place, string> = {
  1: "order-1 sm:order-2",
  2: "order-2 sm:order-1",
  3: "order-3",
};

interface RevealStageProps {
  entries: RankingEntry[];
  revealed: Place[];
  onReveal: (place: Place) => void;
  onReset: () => void;
  className?: string;
}

export const RevealStage = ({
  entries,
  revealed,
  onReveal,
  onReset,
  className,
}: RevealStageProps) => {
  const nextPlace =
    REVEAL_ORDER.find((place) => !revealed.includes(place)) ?? null;
  const allRevealed = nextPlace === null;

  return (
    <section
      className={cn("flex flex-col gap-5", className)}
      aria-label="Revelação do ranking"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="t-display">Quem levou o mês</h2>
          <p className="t-label text-muted-foreground">
            Do 3º ao 1º lugar, um de cada vez. Toque para revelar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!allRevealed ? (
            <ActionButton
              variant="person"
              size="lg"
              onClick={() => onReveal(nextPlace as Place)}
            >
              <Sparkles className="size-5" aria-hidden />
              Revelar o {nextPlace}º lugar
            </ActionButton>
          ) : (
            <ActionButton variant="ghost" size="md" onClick={onReset}>
              <RotateCcw className="size-4" aria-hidden />
              Revelar de novo
            </ActionButton>
          )}
        </div>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-3">
        {PODIUM_ORDER.map((place) => {
          const entry = entries.find((row) => row.rank === place);
          if (!entry) return null;
          const isRevealed = revealed.includes(place);
          return (
            <PodiumColumn
              key={place}
              entry={entry}
              place={place}
              isRevealed={isRevealed}
              onReveal={() => onReveal(place)}
            />
          );
        })}
      </div>
    </section>
  );
};

const PodiumColumn = ({
  entry,
  place,
  isRevealed,
  onReveal,
}: {
  entry: RankingEntry;
  place: Place;
  isRevealed: boolean;
  onReveal: () => void;
}) => {
  const person = personBySlug[entry.slug];
  const isWinner = place === 1;

  if (!isRevealed) {
    return (
      <button
        type="button"
        onClick={onReveal}
        className={cn(
          "focus flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-strong/60 bg-card/70 p-6 text-muted-foreground transition-all duration-200 hover:border-person-active hover:text-foreground",
          COLUMN_HEIGHT[place],
          COLUMN_ORDER[place],
        )}
      >
        <CircleHelp className="size-12 opacity-70" aria-hidden />
        <span className="t-headline">{place}º lugar</span>
        <span className="t-caption">aguardando a revelação</span>
      </button>
    );
  }

  return (
    <article
      data-person={entry.slug}
      className={cn(
        "relative flex animate-reveal-flip flex-col items-center gap-3 rounded-xl border-2 bg-card p-5 text-center shadow-soft",
        isWinner
          ? "border-accent bg-accent/[0.07] shadow-float"
          : "border-border",
        COLUMN_HEIGHT[place],
        COLUMN_ORDER[place],
      )}
    >
      {isWinner ? (
        <span className="absolute -top-5 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full border-4 border-background bg-accent text-accent-foreground shadow-card">
          <Crown className="size-5" aria-hidden />
          <span className="sr-only">1º lugar</span>
        </span>
      ) : null}

      <span
        className={cn(
          "t-caption mt-2 rounded-full border px-3 py-1",
          isWinner
            ? "border-accent/60 bg-accent/20 text-accent-strong"
            : "border-border bg-surface-2 text-muted-foreground",
        )}
      >
        {place}º lugar
      </span>

      <PersonAvatar
        person={person}
        className={cn("mt-1", isWinner ? "w-28 lg:w-36" : "w-24 lg:w-28")}
      />

      <h3 className="t-headline text-person-active-text">{person.name}</h3>

      <span className="flex items-baseline gap-1.5">
        <span className="t-score">{formatPoints(entry.total)}</span>
        <span className="t-label text-muted-foreground">pts</span>
      </span>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted-foreground">
          <Trophy className="size-3.5" aria-hidden />
          {formatPercent(entry.taskPct)} do possível
        </span>
        <span className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted-foreground">
          <Flame className="size-3.5" aria-hidden />
          {entry.streak} dias
        </span>
        <span className="t-caption rounded-full border border-state-done/40 bg-state-done/12 px-2.5 py-1 text-state-done">
          +{formatPoints(entry.bonus)} bônus
        </span>
        <span
          className={cn(
            "t-caption rounded-full border px-2.5 py-1",
            entry.penalty > 0
              ? "border-state-missed/40 bg-state-missed/12 text-state-missed"
              : "border-border bg-surface-2 text-muted-foreground",
          )}
        >
          −{formatPoints(entry.penalty)} deduradas
        </span>
      </div>

      <MonthMedals badges={entry.badges} className="mt-auto" />

      <span
        className={cn(
          "t-caption flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2",
          isWinner
            ? "border-accent/60 bg-accent/15 text-accent-strong"
            : place === 2
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-state-covered/40 bg-state-covered/10 text-state-covered",
        )}
      >
        {isWinner ? (
          <>
            <IceCreamBowl className="size-4" aria-hidden />
            Sorvete grande
          </>
        ) : place === 2 ? (
          <>
            <IceCreamCone className="size-4" aria-hidden />
            Sorvete pequeno
          </>
        ) : (
          <>
            <Hammer className="size-4" aria-hidden />
            Roleta do castigo
          </>
        )}
      </span>
    </article>
  );
};
