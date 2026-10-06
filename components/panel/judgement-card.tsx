import { Gavel, Hourglass, Sparkles, Swords } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JudgementItemView } from "@/lib/panel/panel-types";

interface JudgementCardProps {
  items: JudgementItemView[];
  className?: string;
}

/**
 * Extras e deduradas aguardando votos. Enquanto não são julgados, ficam
 * fora do total do placar (seção 7.3). Votos entram na T11.
 */
export const JudgementCard = ({ items, className }: JudgementCardProps) => {
  const total = items.length;

  return (
    <section
      className={cn("surface-card p-4", className)}
      aria-label="Itens em julgamento"
    >
      <header className="flex items-center gap-2">
        <Swords className="size-5 shrink-0 text-state-covered" aria-hidden />
        <h2 className="t-title flex-1">Em julgamento</h2>
        <span className="t-caption rounded-full border border-state-covered/40 bg-state-covered/10 px-2.5 py-1 text-state-covered">
          {total} {total === 1 ? "item" : "itens"}
        </span>
      </header>

      <p className="t-caption mt-2 text-muted-foreground">
        Fora do total até a votação. O julgamento abre no último dia do mês.
      </p>

      {total === 0 ? (
        <p className="t-body mt-3 text-muted-foreground">Nada em julgamento este mês.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-2/70 p-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "t-caption inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                    item.kind === "extra"
                      ? "border-state-done/40 bg-state-done/12 text-state-done"
                      : "border-state-missed/40 bg-state-missed/12 text-state-missed",
                  )}
                >
                  {item.kind === "extra" ? (
                    <Sparkles className="size-3.5" aria-hidden />
                  ) : (
                    <Gavel className="size-3.5" aria-hidden />
                  )}
                  {item.kind === "extra" ? "extra" : "dedurada"}
                </span>
                <span className="t-label">
                  {item.kind === "extra" ? item.authorName : item.accusedName}
                </span>
                <span className="t-caption ml-auto text-muted-foreground">
                  {item.whenLabel}
                </span>
              </span>

              <p className="t-body">{item.description}</p>

              {item.defense ? (
                <p className="t-caption rounded-md border-l-4 border-primary/50 bg-surface px-3 py-2 italic text-muted-foreground">
                  “{item.defense}”
                </p>
              ) : null}

              <span className="t-caption mt-0.5 flex items-center gap-2 text-muted-foreground">
                <Hourglass className="size-3.5" aria-hidden />
                aguardando {item.votesNeeded - item.votesIn} de{" "}
                {item.votesNeeded} votos
                <span aria-hidden className="flex items-center gap-1">
                  {Array.from({ length: item.votesNeeded }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "size-2 rounded-full",
                        index < item.votesIn ? "bg-primary" : "bg-border",
                      )}
                    />
                  ))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
