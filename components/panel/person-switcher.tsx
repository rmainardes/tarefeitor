import { Check } from "lucide-react";

import { PersonAvatar } from "@/components/panel/person-avatar";
import { cn } from "@/lib/utils";
import type { Person, PersonSlug } from "@/lib/panel/panel-types";

interface PersonSwitcherProps {
  selected: PersonSlug;
  onSelect: (slug: PersonSlug) => void;
  people: Person[];
  className?: string;
}

/**
 * Seletor de pessoa: define o que se vê e em nome de quem se age.
 * A escolha fica no cookie `selected_person` deste aparelho.
 */
export const PersonSwitcher = ({
  selected,
  onSelect,
  people,
  className,
}: PersonSwitcherProps) => (
  <section aria-label="Quem está usando agora" className={className}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="t-label uppercase tracking-wider text-muted-foreground">
        Quem está usando agora
      </h2>
      <p className="t-caption text-muted-foreground">
        Fica salvo neste aparelho até alguém trocar
      </p>
    </div>

    <div role="group" className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
      {people.map((person) => {
        const isActive = person.slug === selected;
        return (
          <button
            key={person.slug}
            type="button"
            data-person={person.slug}
            aria-pressed={isActive}
            onClick={() => onSelect(person.slug)}
            className={cn(
              "focus tap group relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-3 transition-all duration-200 active:scale-[0.98] sm:flex-row sm:gap-3 sm:px-4 sm:py-3",
              isActive
                ? "border-transparent bg-person-active text-person-foreground shadow-card"
                : "border-border bg-card text-foreground hover:border-border-strong hover:shadow-soft",
            )}
          >
            <PersonAvatar
              person={person}
              className={cn(
                "w-11 sm:w-12",
                isActive &&
                  "ring-2 ring-person-foreground/70 ring-offset-2 ring-offset-person-active",
              )}
            />
            <span className="flex min-w-0 flex-col items-center sm:items-start">
              <span className="t-title truncate">{person.name}</span>
              <span
                className={cn(
                  "t-caption truncate",
                  isActive
                    ? "text-person-foreground/85"
                    : "text-muted-foreground",
                )}
              >
                {isActive ? "VOCÊ" : person.isAdult ? "adulto" : "criança"}
              </span>
            </span>

            {isActive ? (
              <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-person-foreground text-person-active">
                <Check className="size-3.5" aria-hidden />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  </section>
);
