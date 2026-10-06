import { cookies } from "next/headers";

import { DayTabs, type DayTab } from "@/components/DayTabs";
import { PersonScoreboard } from "@/components/PersonScoreboard";
import { TaskList } from "@/components/TaskList";
import { addDays, canMarkRetroactively, toISODate } from "@/lib/domain/dates";
import { resolvePersonOccurrences } from "@/lib/data/occurrenceResolution";
import { getScoreboard } from "@/lib/data/scoreboard";
import { getRetroDeadlineHour } from "@/lib/data/settings";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const now = new Date();

  const [scoreboard, cookieStore, retroDeadlineHour] = await Promise.all([
    getScoreboard(now),
    cookies(),
    getRetroDeadlineHour(),
  ]);

  const people = scoreboard.entries.map((entry) => entry.person);

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const selectedPersonId = people.some((person) => person.id === selectedFromCookie)
    ? selectedFromCookie
    : people[0].id;

  const today = toISODate(now);
  const yesterday = addDays(today, -1);
  const showYesterday = canMarkRetroactively(yesterday, now, retroDeadlineHour);

  const activeDay: DayTab = searchParams.day === "yesterday" && showYesterday ? "yesterday" : "today";
  const activeDate = activeDay === "yesterday" ? yesterday : today;

  const tasks = await resolvePersonOccurrences(selectedPersonId, [activeDate], now);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-center font-display text-lg font-semibold text-foreground/70">
        Tarefêitor
      </h1>

      <PersonScoreboard
        entries={scoreboard.entries}
        selectedPersonId={selectedPersonId}
        pendingJudgments={scoreboard.pendingJudgments}
      />

      <DayTabs active={activeDay} showYesterday={showYesterday} />

      <TaskList tasks={tasks} actorId={selectedPersonId} people={people} />
    </main>
  );
}
