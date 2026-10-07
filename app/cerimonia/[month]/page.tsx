import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Lock, Trophy, Vote } from "lucide-react";

import { CeremonyView } from "@/components/ceremony/ceremony-view";
import { getMonthResult } from "@/lib/data/months";
import { listPeople } from "@/lib/data/people";
import { monthResultToRanking, monthResultToSummary } from "@/lib/panel/fromMonthResult";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

interface CerimoniaPageProps {
  params: Promise<{ month: string }>;
}

/**
 * Cerimônia de um mês fechado (seção 7.7, T12): revelação, pódio, prêmios e a
 * roleta do castigo — com dados reais de `month_results`/`month_scores`.
 * `month` na URL é `YYYY-MM`; o mês fechado é sempre o dia 1 (`YYYY-MM-01`).
 */
export default async function CerimoniaPage({ params }: CerimoniaPageProps) {
  const { month: monthParam } = await params;
  const month = `${monthParam}-01`;

  const [monthResult, people, cookieStore] = await Promise.all([
    getMonthResult(month),
    listPeople(),
    cookies(),
  ]);
  if (!monthResult) notFound();

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const ranking = monthResultToRanking(monthResult, peopleById);
  const summary = monthResultToSummary(monthResult);

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const actorId = people.some((person) => person.id === selectedFromCookie)
    ? selectedFromCookie
    : people[0].id;

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
            <h1 className="t-headline truncate">Cerimônia do mês</h1>
            <p className="t-caption truncate text-muted-foreground">
              {summary.monthTitle} · {summary.closedAtLabel}
            </p>
          </div>

          <Link
            href="/hall-da-fama"
            className="focus ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
            aria-label="Hall da fama"
          >
            <Trophy className="size-5" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-6 md:px-8">
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-soft">
          <span className="t-caption flex w-fit items-center gap-1.5 rounded-full border border-state-done/40 bg-state-done/12 px-3 py-1 text-state-done">
            <CalendarCheck className="size-4" aria-hidden />
            mês fechado
          </span>

          <h2 className="t-display">O mês acabou. Hora do resultado.</h2>
          <p className="t-body max-w-[62ch] text-muted-foreground">
            Três participantes, um mês inteiro de tarefas, extras e deduradas. O
            1º lugar leva sorvete grande, o 2º leva sorvete pequeno e o 3º
            encara a roleta do castigo.
          </p>

          <ul className="mt-1 flex flex-wrap gap-2">
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <CalendarCheck className="size-4" aria-hidden />
              {summary.closedAtLabel}
            </li>
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <Vote className="size-4" aria-hidden />
              {summary.votesLabel}
            </li>
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <Lock className="size-4" aria-hidden />
              mês fechado é imutável
            </li>
          </ul>
        </section>

        <CeremonyView
          month={month}
          actorId={actorId}
          ranking={ranking}
          initialPunishmentId={monthResult.result.punishment}
        />
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-8 md:px-8">
        <p className="t-caption flex items-center gap-2 text-muted-foreground">
          <Trophy className="size-4 shrink-0" aria-hidden />
          <Link href="/hall-da-fama" className="focus underline-offset-2 hover:underline">
            Hall da fama
          </Link>
          : todos os meses fechados, com pódio, medalhas e castigo sorteado.
        </p>
      </footer>
    </div>
  );
}
