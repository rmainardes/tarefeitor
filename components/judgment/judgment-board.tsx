"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarOff, Gavel, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { castVote, setDefense } from "@/app/actions/judgment";
import { closeMonth } from "@/app/actions/month";
import { selectPerson } from "@/app/actions/session";
import { ActionButton } from "@/components/ui/action-button";
import { ExtraVoteCard, type ExtraVoteView } from "@/components/judgment/extra-vote-card";
import { ReportVoteCard, type ReportVoteView } from "@/components/judgment/report-vote-card";
import { useRealtimeUpdates } from "@/components/panel/hooks/use-realtime-updates";
import { PersonSwitcher } from "@/components/panel/person-switcher";
import type { Person, PersonSlug } from "@/lib/panel/panel-types";

export interface CloseMonthTarget {
  /** `YYYY-MM-01`. */
  month: string;
  ready: boolean;
  pendingJudgments: number;
}

interface JudgmentBoardProps {
  people: Person[];
  /** Pessoa do cookie `selected_person` deste aparelho (seção 8.1). */
  initialSelected: PersonSlug;
  extraMax: number;
  extras: ExtraVoteView[];
  reports: ReportVoteView[];
  /** Mês anterior ainda não fechado, se for o caso (seção 7.7, T12). */
  closeMonthTarget: CloseMonthTarget | null;
}

/** Painel de julgamento (T11/T12): defesa, votos e "Fechar mês", agindo como a pessoa selecionada. */
export function JudgmentBoard({
  people,
  initialSelected,
  extraMax,
  extras,
  reports,
  closeMonthTarget,
}: JudgmentBoardProps) {
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

  const runCloseMonth = () => {
    if (!closeMonthTarget) return;
    startTransition(async () => {
      const result = await closeMonth({ month: closeMonthTarget.month, actorId: actor.id });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      router.push(`/cerimonia/${result.data.month.slice(0, 7)}`);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {closeMonthTarget ? (
        <section
          aria-label="Fechar mês"
          className={
            closeMonthTarget.ready
              ? "flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-state-done/50 bg-state-done/[0.08] p-4"
              : "flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-border bg-card/70 p-4"
          }
        >
          <p className="t-body flex items-center gap-2 text-muted-foreground">
            {closeMonthTarget.ready ? (
              <>
                <Lock className="size-5 shrink-0 text-state-done" aria-hidden />
                Todos os votos do mês anterior estão completos. Pode fechar o
                mês e seguir para a cerimônia.
              </>
            ) : (
              <>
                <CalendarOff className="size-5 shrink-0" aria-hidden />
                Faltam {closeMonthTarget.pendingJudgments} item(ns) sem voto
                completo para poder fechar o mês anterior.
              </>
            )}
          </p>
          <ActionButton
            variant="primary"
            size="md"
            disabled={!closeMonthTarget.ready || isPending}
            onClick={runCloseMonth}
          >
            Fechar mês
          </ActionButton>
        </section>
      ) : null}

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
