"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Gavel, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { castVote, setDefense } from "@/app/actions/judgment";
import { selectPerson } from "@/app/actions/session";
import { ExtraVoteCard, type ExtraVoteView } from "@/components/judgment/extra-vote-card";
import { ReportVoteCard, type ReportVoteView } from "@/components/judgment/report-vote-card";
import { useRealtimeUpdates } from "@/components/panel/hooks/use-realtime-updates";
import { PersonSwitcher } from "@/components/panel/person-switcher";
import type { Person, PersonSlug } from "@/lib/panel/panel-types";

interface JudgmentBoardProps {
  people: Person[];
  /** Pessoa do cookie `selected_person` deste aparelho (seção 8.1). */
  initialSelected: PersonSlug;
  extraMax: number;
  extras: ExtraVoteView[];
  reports: ReportVoteView[];
}

/** Painel de julgamento (T11): defesa e votos, com a identidade de quem age vindo do seletor. */
export function JudgmentBoard({ people, initialSelected, extraMax, extras, reports }: JudgmentBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PersonSlug>(initialSelected);
  const [isPending, startTransition] = useTransition();

  useRealtimeUpdates({});

  const actor = people.find((person) => person.slug === selected) ?? people[0];

  const handleSelect = (slug: PersonSlug) => {
    setSelected(slug);
    const person = people.find((candidate) => candidate.slug === slug);
    if (!person) return;
    startTransition(async () => {
      await selectPerson(person.id);
      router.refresh();
    });
  };

  const runVote = (targetKind: "extra" | "report", targetId: string, value: number) => {
    startTransition(async () => {
      const result = await castVote({ targetKind, targetId, voterId: actor.id, value });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      router.refresh();
    });
  };

  const runDefense = (reportId: string, defense: string) => {
    startTransition(async () => {
      const result = await setDefense({ reportId, actorId: actor.id, defense });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Defesa salva.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PersonSwitcher selected={selected} onSelect={handleSelect} people={people} />

      <section aria-label="Extras em julgamento" className="flex flex-col gap-3">
        <h2 className="t-title flex items-center gap-2">
          <Sparkles className="size-5 text-state-done" aria-hidden />
          Extras ({extras.length})
        </h2>
        {extras.length === 0 ? (
          <p className="t-body rounded-lg border-2 border-dashed border-border bg-card p-5 text-center text-muted-foreground">
            Nenhum extra registrado este mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {extras.map((extra) => (
              <ExtraVoteCard
                key={extra.id}
                extra={extra}
                actorId={actor.id}
                extraMax={extraMax}
                disabled={isPending}
                onVote={(value) => runVote("extra", extra.id, value)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Deduradas em julgamento" className="flex flex-col gap-3">
        <h2 className="t-title flex items-center gap-2">
          <Gavel className="size-5 text-state-missed" aria-hidden />
          Deduradas ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="t-body rounded-lg border-2 border-dashed border-border bg-card p-5 text-center text-muted-foreground">
            Nenhuma dedurada registrada este mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportVoteCard
                key={report.id}
                report={report}
                actorId={actor.id}
                disabled={isPending}
                onVote={(value) => runVote("report", report.id, value)}
                onSaveDefense={(defense) => runDefense(report.id, defense)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
