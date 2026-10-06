import Image from "next/image";

import { selectPerson } from "@/app/actions/session";
import type { ScoreboardEntry } from "@/lib/data/scoreboard";

import { ProgressRing } from "./ProgressRing";

interface PersonScoreboardProps {
  entries: readonly ScoreboardEntry[];
  selectedPersonId: number;
  pendingJudgments: number;
}

/**
 * Os três avatares são, ao mesmo tempo, o placar do mês e o seletor de
 * pessoa (seção 8.1): tocar em um deles mostra o progresso de todos e passa
 * a agir em nome daquela pessoa.
 */
export function PersonScoreboard({ entries, selectedPersonId, pendingJudgments }: PersonScoreboardProps) {
  return (
    <section aria-label="Placar do mês e seleção de pessoa" className="flex flex-col items-center gap-3">
      <div role="group" aria-label="Selecionar pessoa" className="flex gap-6 sm:gap-10">
        {entries.map(({ person, pct, isLeader }) => {
          const isSelected = person.id === selectedPersonId;
          return (
            <form key={person.id} action={selectPerson.bind(null, person.id)}>
              <button
                type="submit"
                aria-pressed={isSelected}
                className="group flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ opacity: isSelected ? 1 : 0.6, outlineColor: person.color }}
              >
                <div className="relative grid h-[72px] w-[72px] place-items-center">
                  <div className="absolute inset-0">
                    <ProgressRing percent={pct} color={person.color} />
                  </div>
                  <Image
                    src={person.photoPath}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                    style={{ objectPosition: person.photoFocus }}
                  />
                  {isLeader && (
                    <span
                      className="absolute -right-1 -top-1 text-xl leading-none drop-shadow-sm"
                      aria-hidden
                    >
                      👑
                    </span>
                  )}
                </div>
                <span
                  className="font-display text-base font-semibold"
                  style={{ color: isSelected ? person.color : "hsl(var(--foreground))" }}
                >
                  {person.name}
                  {isLeader && <span className="sr-only"> (líder do mês)</span>}
                </span>
                <span className="font-display text-sm tabular-nums text-foreground/60">
                  {Math.round(pct)}%
                </span>
              </button>
            </form>
          );
        })}
      </div>

      {pendingJudgments > 0 && (
        <p className="rounded-full bg-stone-900/5 px-3 py-1 text-sm text-foreground/70">
          {pendingJudgments === 1 ? "1 em julgamento" : `${pendingJudgments} em julgamento`}
        </p>
      )}
    </section>
  );
}
