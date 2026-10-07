import Link from "next/link";
import { ArrowLeft, Dices, Lock, Trophy } from "lucide-react";

import { PersonAvatar } from "@/components/panel/person-avatar";
import { listClosedMonths } from "@/lib/data/months";
import { listPeople } from "@/lib/data/people";
import { punishments } from "@/lib/panel/ceremony-seed";
import { personToPanel } from "@/lib/panel/fromDomain";
import { monthResultToRanking, monthResultToSummary } from "@/lib/panel/fromMonthResult";
import { formatPoints } from "@/lib/panel/panel-schedule";

// Sem cookies() para forçar renderização dinâmica (como "/" e "/julgamento"):
// sem isso, o Next prerenderia esta lista estaticamente e só a atualizaria
// quando um closeMonth/spinPunishment chamasse revalidatePath.
export const dynamic = "force-dynamic";

/** Hall da fama (seção 7.7, T12): todos os meses fechados, com pódio e castigo. */
export default async function HallDaFamaPage() {
  const [closedMonths, people] = await Promise.all([listClosedMonths(), listPeople()]);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return (
    <div className="app-canvas flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 md:px-8">
          <Link
            href="/"
            className="focus grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
            aria-label="Voltar ao painel do dia"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>

          <div className="min-w-0">
            <h1 className="t-headline truncate">Hall da fama</h1>
            <p className="t-caption truncate text-muted-foreground">
              Meses fechados, pódio e castigo sorteado
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 py-6 md:px-8">
        {closedMonths.length === 0 ? (
          <p className="t-body flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/70 p-6 text-muted-foreground">
            <Trophy className="size-5 shrink-0" aria-hidden />
            Nenhum mês fechado ainda. O primeiro fechamento aparece aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {closedMonths.map((monthResult) => {
              const ranking = monthResultToRanking(monthResult, peopleById);
              const summary = monthResultToSummary(monthResult);
              const punishment = punishments.find((item) => item.id === monthResult.result.punishment);

              return (
                <li key={monthResult.result.month}>
                  <Link
                    href={`/cerimonia/${monthResult.result.month.slice(0, 7)}`}
                    className="focus flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary hover:shadow-card sm:flex-row sm:items-center sm:gap-5"
                  >
                    <div className="min-w-0 sm:w-40 sm:shrink-0">
                      <h2 className="t-title truncate">{summary.monthTitle}</h2>
                      <p className="t-caption truncate text-muted-foreground">{summary.closedAtLabel}</p>
                    </div>

                    <ul className="flex flex-wrap items-center gap-2 sm:flex-1">
                      {ranking.map((entry) => {
                        const person = people.find((candidate) => candidate.slug === entry.slug);
                        if (!person) return null;
                        return (
                          <li
                            key={entry.slug}
                            data-person={entry.slug}
                            className={
                              entry.rank === 1
                                ? "flex items-center gap-2 rounded-full border border-accent/60 bg-accent/12 px-3 py-1.5"
                                : "flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5"
                            }
                          >
                            <PersonAvatar person={personToPanel(person)} className="w-7" />
                            <span className="t-caption">{entry.rank}º</span>
                            <span className="t-label">{formatPoints(entry.total)}</span>
                            {entry.badges.length > 0 ? (
                              <span className="t-caption text-muted-foreground">
                                {entry.badges.length} medalha(s)
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>

                    <span className="t-caption flex items-center gap-1.5 rounded-full border border-state-covered/40 bg-state-covered/10 px-3 py-1.5 text-state-covered sm:shrink-0">
                      <Dices className="size-3.5" aria-hidden />
                      {punishment ? punishment.label : "castigo ainda não sorteado"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-8 md:px-8">
        <p className="t-caption flex items-center gap-2 text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          Meses fechados são imutáveis. Toque em um mês para rever a cerimônia.
        </p>
      </footer>
    </div>
  );
}
