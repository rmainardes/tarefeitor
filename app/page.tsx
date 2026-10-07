import { cookies } from "next/headers";
import { Toaster } from "sonner";

import { FamilyPanel } from "@/components/panel/family-panel";
import { listBirthdaysForMonth } from "@/lib/data/birthdays";
import { loadPersonAgenda } from "@/lib/data/calendar";
import { resolvePersonOccurrences } from "@/lib/data/occurrenceResolution";
import { listPendingJudgments } from "@/lib/data/judgment";
import { getScoreboard } from "@/lib/data/scoreboard";
import { getRetroDeadlineHour } from "@/lib/data/settings";
import { addDays, canMarkRetroactively, parseISODate, toISODate } from "@/lib/domain/dates";
import {
  agendaEventToView,
  birthdayToPanel,
  judgmentToView,
  personToPanel,
  resolvedTaskToScheduled,
  scoreboardToBoardScores,
} from "@/lib/panel/fromDomain";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

export default async function Home() {
  const now = new Date();
  const today = toISODate(now);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [scoreboard, cookieStore, retroDeadlineHour, pendingJudgments, birthdayRecords] = await Promise.all([
    getScoreboard(now),
    cookies(),
    getRetroDeadlineHour(),
    listPendingJudgments(monthStart, today),
    listBirthdaysForMonth(parseISODate(today).month),
  ]);

  const birthdays = birthdayRecords.map(birthdayToPanel);

  const people = scoreboard.entries.map((entry) => personToPanel(entry.person));
  const scores = scoreboardToBoardScores(scoreboard.entries);
  const peopleById = new Map(scoreboard.entries.map((entry) => [entry.person.id, entry.person]));

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const selectedPersonId = scoreboard.entries.some((entry) => entry.person.id === selectedFromCookie)
    ? selectedFromCookie
    : scoreboard.entries[0].person.id;
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0];

  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const yesterdayAllowed = canMarkRetroactively(yesterday, now, retroDeadlineHour);

  const resolved = await resolvePersonOccurrences(selectedPersonId, [today, yesterday], now);
  const scheduled = resolved.map((item) =>
    resolvedTaskToScheduled(item, selectedPerson.slug, peopleById),
  );

  const judgements = pendingJudgments.map((item) => judgmentToView(item, peopleById));

  const peopleWithCalendar = scoreboard.entries
    .map((entry) => entry.person)
    .filter((person) => person.icalUrl !== null);

  const agendaResults = await Promise.all(
    peopleWithCalendar.map(async (person) => ({
      person,
      ...(await loadPersonAgenda(person, today)),
    })),
  );

  const agendaStale = agendaResults.some((result) => result.stale);
  const agenda = agendaResults
    .flatMap((result) =>
      result.events
        .filter((event) => event.dateIso === today || event.dateIso === tomorrow)
        .map((event) => agendaEventToView(event, result.person)),
    )
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso) || (a.timeLabel ?? "").localeCompare(b.timeLabel ?? ""));

  return (
    <>
      <FamilyPanel
        people={people}
        scores={scores}
        initialSelected={selectedPerson.slug}
        today={today}
        yesterday={yesterday}
        tomorrow={tomorrow}
        yesterdayAllowed={yesterdayAllowed}
        tasksToday={scheduled.filter((row) => row.dueDate === today)}
        tasksYesterday={scheduled.filter((row) => row.dueDate === yesterday)}
        judgements={judgements}
        agenda={agenda}
        agendaStale={agendaStale}
        birthdays={birthdays}
      />
      <Toaster />
    </>
  );
}
