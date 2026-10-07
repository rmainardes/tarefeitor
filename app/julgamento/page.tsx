import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { JudgmentBoard } from "@/components/judgment/judgment-board";
import type { ExtraVoteView } from "@/components/judgment/extra-vote-card";
import type { ReportVoteView } from "@/components/judgment/report-vote-card";
import {
  EXTRA_VOTES_NEEDED,
  REPORT_VOTES_NEEDED,
  isExtraJudged,
  isReportJudged,
  listMonthExtras,
  listMonthReports,
} from "@/lib/data/judgment";
import { listPeople, type PersonRecord } from "@/lib/data/people";
import { getNumberSetting } from "@/lib/data/settings";
import { isLastDayOfMonth, toISODate } from "@/lib/domain/dates";
import { isReportUpheld } from "@/lib/domain/scoring";
import { personToPanel } from "@/lib/panel/fromDomain";
import { dayMonthLabel, monthLabel } from "@/lib/panel/panel-schedule";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

/**
 * Julgamento (seção 7.7 do plano, T11): lista extras e deduradas do mês
 * corrente com defesa e votos reais. Abre oficialmente no último dia do mês,
 * mas defesa e votos já podem ser registrados antes — só informamos.
 */
export default async function JulgamentoPage() {
  const now = new Date();
  const today = toISODate(now);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [people, extras, reports, extraMax, cookieStore] = await Promise.all([
    listPeople(),
    listMonthExtras(monthStart, today),
    listMonthReports(monthStart, today),
    getNumberSetting("extra_max"),
    cookies(),
  ]);

  const peopleById = new Map<number, PersonRecord>(people.map((person) => [person.id, person]));
  const nameOf = (id: number) => peopleById.get(id)?.name ?? "alguém";

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const initialSelected = people.find((person) => person.id === selectedFromCookie) ?? people[0];

  const extraViews: ExtraVoteView[] = extras.map((extra) => ({
    id: extra.id,
    authorId: extra.authorId,
    authorName: nameOf(extra.authorId),
    description: extra.description,
    whenLabel: `feito em ${dayMonthLabel(extra.happenedOn)}`,
    votesNeeded: EXTRA_VOTES_NEEDED,
    votes: extra.votes.map((vote) => ({
      voterId: vote.voterId,
      voterName: nameOf(vote.voterId),
      value: vote.value,
    })),
    judged: isExtraJudged(extra),
    average:
      extra.votes.length > 0
        ? extra.votes.reduce((sum, vote) => sum + vote.value, 0) / extra.votes.length
        : null,
  }));

  const reportViews: ReportVoteView[] = reports.map((report) => ({
    id: report.id,
    authorId: report.authorId,
    authorName: nameOf(report.authorId),
    accusedId: report.accusedId,
    accusedName: nameOf(report.accusedId),
    description: report.description,
    defense: report.defense,
    isContestation: report.taskId !== null,
    whenLabel: `aconteceu em ${dayMonthLabel(report.happenedOn)}`,
    votesNeeded: REPORT_VOTES_NEEDED,
    votes: report.votes.map((vote) => ({
      voterId: vote.voterId,
      voterName: nameOf(vote.voterId),
      value: vote.value,
    })),
    judged: isReportJudged(report),
    upheld: isReportJudged(report) ? isReportUpheld(report.votes.map((vote) => vote.value)) : null,
  }));

  const judgmentOpen = isLastDayOfMonth(today);

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
            <h1 className="t-headline truncate">Julgamento</h1>
            <p className="t-caption truncate text-muted-foreground">
              Extras e deduradas de {monthLabel(today)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        {!judgmentOpen ? (
          <p className="t-body flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/70 p-4 text-muted-foreground">
            <CalendarClock className="size-5 shrink-0" aria-hidden />
            O julgamento abre oficialmente no último dia do mês — mas já dá para
            escrever defesa e votar antes disso.
          </p>
        ) : null}

        <JudgmentBoard
          people={people.map(personToPanel)}
          initialSelected={personToPanel(initialSelected).slug}
          extraMax={extraMax}
          extras={extraViews}
          reports={reportViews}
        />
      </main>
    </div>
  );
}
