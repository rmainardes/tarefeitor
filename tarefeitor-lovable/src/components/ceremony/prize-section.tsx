import { Flame, Sparkles, type LucideIcon } from "lucide-react";

import { PersonAvatar } from "@/components/panel/person-avatar";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import { personBySlug } from "@/lib/panel-people";
import { prizes, type RankingEntry } from "@/data/ceremony-seed";

interface PrizeSectionProps {
  entries: RankingEntry[];
  onGoToRoulette: () => void;
  className?: string;
}

/** Prêmios: 1º sorvete grande, 2º sorvete pequeno, 3º roleta do castigo. */
export const PrizeSection = ({
  entries,
  onGoToRoulette,
  className,
}: PrizeSectionProps) => {
  const third = entries.find((row) => row.rank === 3);

  return (
    <section
      className={cn("flex flex-col gap-4", className)}
      aria-label="Prêmios do mês"
    >
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="t-display">Prêmios</h2>
        <p className="t-label text-muted-foreground">
          Combinado da casa, sem choro
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {prizes.map((prize) => {
          const entry = entries.find((row) => row.rank === prize.rank);
          if (!entry) return null;
          const person = personBySlug[entry.slug];
          return (
            <article
              key={prize.rank}
              data-person={entry.slug}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-soft"
            >
              <span
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-md",
                  prize.rank === 1
                    ? "bg-accent/20 text-accent-strong"
                    : "bg-person-active/15 text-person-active-text",
                )}
              >
                <prize.icon className="size-7" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <span className="t-caption text-muted-foreground">
                  {prize.rank}º lugar · {person.name}
                </span>
                <h3 className="t-title truncate">{prize.title}</h3>
                <p className="t-caption text-muted-foreground">
                  {prize.detail}
                </p>
              </div>

              <PersonAvatar person={person} className="w-11" />
            </article>
          );
        })}

        {third ? (
          <article className="flex flex-col gap-3 rounded-lg border-2 border-state-covered/40 bg-state-covered/[0.07] p-4">
            <span className="flex items-center gap-3">
              <RouletteIcon />
              <span className="min-w-0">
                <span className="t-caption text-state-covered">
                  3º lugar · {personBySlug[third.slug].name}
                </span>
                <h3 className="t-title">Roleta do castigo</h3>
              </span>
            </span>
            <p className="t-caption text-muted-foreground">
              Três opções, um sorteio. O resultado fica no histórico do mês
              fechado.
            </p>
            <ActionButton
              variant="primary"
              size="md"
              onClick={onGoToRoulette}
              className="mt-auto"
            >
              <Flame className="size-4" aria-hidden />
              Girar a roleta
            </ActionButton>
          </article>
        ) : null}
      </div>
    </section>
  );
};

const RouletteIcon = ({ icon: Icon = Sparkles }: { icon?: LucideIcon }) => (
  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-state-covered/15 text-state-covered">
    <Icon className="size-6" aria-hidden />
  </span>
);
