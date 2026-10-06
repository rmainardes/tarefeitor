import { cookies } from "next/headers";
import { Toaster } from "sonner";

import { FamilyPanel } from "@/components/panel/family-panel";
import { resolvePersonOccurrences } from "@/lib/data/occurrenceResolution";
import { listPendingJudgments } from "@/lib/data/judgment";
import { getScoreboard } from "@/lib/data/scoreboard";
import { getRetroDeadlineHour } from "@/lib/data/settings";
import { addDays, canMarkRetroactively, toISODate } from "@/lib/domain/dates";
import {
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

  const [scoreboard, cookieStore, retroDeadlineHour, pendingJudgments] = await Promise.all([
    getScoreboard(now),
    cookies(),
    getRetroDeadlineHour(),
    listPendingJudgments(monthStart, today),
  ]);

  const people = scoreboard.entries.map((entry) => personToPanel(entry.person));
  const scores = scoreboardToBoardScores(scoreboard.entries);
  const peopleById = new Map(scoreboard.entries.map((entry) => [entry.person.id, entry.person]));

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const selectedPersonId = scoreboard.entries.some((entry) => entry.person.id === selectedFromCookie)
    ? selectedFromCookie
    : scoreboard.entries[0].person.id;
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0];

  const yesterday = addDays(today, -1);
  const yesterdayAllowed = canMarkRetroactively(yesterday, now, retroDeadlineHour);

  const resolved = await resolvePersonOccurrences(selectedPersonId, [today, yesterday], now);
  const scheduled = resolved.map((item) =>
    resolvedTaskToScheduled(item, selectedPerson.slug, peopleById),
  );

  const judgements = pendingJudgments.map((item) => judgmentToView(item, peopleById));

  return (
    <>
      <FamilyPanel
        people={people}
        scores={scores}
        initialSelected={selectedPerson.slug}
        today={today}
        yesterday={yesterday}
        yesterdayAllowed={yesterdayAllowed}
        tasksToday={scheduled.filter((row) => row.dueDate === today)}
        tasksYesterday={scheduled.filter((row) => row.dueDate === yesterday)}
        judgements={judgements}
      />
      <Toaster />
    </>
  );
}
