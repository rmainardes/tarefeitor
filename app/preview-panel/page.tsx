import { cookies } from "next/headers";
import { Toaster } from "sonner";

import { FamilyPanel } from "@/components/panel/family-panel";
import { getScoreboard } from "@/lib/data/scoreboard";
import { personToPanel, scoreboardToBoardScores } from "@/lib/panel/fromDomain";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

export default async function PreviewPanelPage() {
  const now = new Date();
  const [scoreboard, cookieStore] = await Promise.all([getScoreboard(now), cookies()]);

  const people = scoreboard.entries.map((entry) => personToPanel(entry.person));
  const scores = scoreboardToBoardScores(scoreboard.entries);

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const selectedPersonId = scoreboard.entries.some((entry) => entry.person.id === selectedFromCookie)
    ? selectedFromCookie
    : scoreboard.entries[0].person.id;
  const initialSelected = people.find((person) => person.id === selectedPersonId)?.slug ?? people[0].slug;

  return (
    <>
      <FamilyPanel people={people} scores={scores} initialSelected={initialSelected} />
      <Toaster />
    </>
  );
}
