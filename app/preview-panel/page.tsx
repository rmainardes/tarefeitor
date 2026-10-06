import { cookies } from "next/headers";
import { Toaster } from "sonner";

import { FamilyPanel } from "@/components/panel/family-panel";
import { addDays, toISODate } from "@/lib/domain/dates";
import { resolvePersonOccurrences } from "@/lib/data/occurrenceResolution";
import { getScoreboard } from "@/lib/data/scoreboard";
import { personToPanel, resolvedTaskToScheduled, scoreboardToBoardScores } from "@/lib/panel/fromDomain";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

export default async function PreviewPanelPage() {
  const now = new Date();
  const [scoreboard, cookieStore] = await Promise.all([getScoreboard(now), cookies()]);

  const people = scoreboard.entries.map((entry) => personToPanel(entry.person));
  const scores = scoreboardToBoardScores(scoreboard.entries);
  const peopleById = new Map(scoreboard.entries.map((entry) => [entry.person.id, entry.person]));

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const selectedPersonId = scoreboard.entries.some((entry) => entry.person.id === selectedFromCookie)
    ? selectedFromCookie
    : scoreboard.entries[0].person.id;
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0];

  const today = toISODate(now);
  const yesterday = addDays(today, -1);

  const resolved = await resolvePersonOccurrences(selectedPersonId, [today, yesterday], now);
  const scheduled = resolved.map((item) =>
    resolvedTaskToScheduled(item, selectedPerson.slug, peopleById),
  );

  return (
    <>
      <FamilyPanel
        people={people}
        scores={scores}
        initialSelected={selectedPerson.slug}
        today={today}
        yesterday={yesterday}
        tasksToday={scheduled.filter((row) => row.dueDate === today)}
        tasksYesterday={scheduled.filter((row) => row.dueDate === yesterday)}
      />
      <Toaster />
    </>
  );
}
