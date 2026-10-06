"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { selectPerson } from "@/app/actions/session";
import { BirthdayStrip } from "@/components/panel/birthday-strip";
import { DayTabs, type PanelDay } from "@/components/panel/day-tabs";
import { usePanelChrome } from "@/components/panel/hooks/use-panel-chrome";
import { useTaskBoard } from "@/components/panel/hooks/use-task-board";
import { JudgementCard } from "@/components/panel/judgement-card";
import { PanelActions } from "@/components/panel/panel-actions";
import { PanelHeader } from "@/components/panel/panel-header";
import { PeriodSection } from "@/components/panel/period-section";
import { PersonSwitcher } from "@/components/panel/person-switcher";
import { Scoreboard } from "@/components/panel/scoreboard";
import { TaskCard } from "@/components/panel/task-card";
import { birthdays, periods, TODAY, YESTERDAY } from "@/lib/panel/panel-seed";
import type { BoardScore } from "@/lib/panel/panel-scoring";
import type { Person, PersonSlug } from "@/lib/panel/panel-types";

interface FamilyPanelProps {
  /** Placar e seletor já vêm do servidor (T2b). A lista de tarefas ainda é mock (T2c). */
  people: Person[];
  scores: BoardScore[];
  /** Pessoa do cookie real `selected_person`, resolvida no servidor. */
  initialSelected: PersonSlug;
}

/**
 * Painel (T06, migrado em T2b): placar e seletor com dados reais; lista de
 * hoje/ontem e marcação por toque seguem mock até a T2c/T2d.
 */
export const FamilyPanel = ({ people, scores, initialSelected }: FamilyPanelProps) => {
  const [selected, setSelected] = useState<PersonSlug>(initialSelected);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { markDone, undo, markMissed, scheduleFor } = useTaskBoard();
  const { pref: themePref, cycleTheme, mode, toggleMode, now } = usePanelChrome();
  const [day, setDay] = useState<PanelDay>("today");

  const selectedPerson = people.find((person) => person.slug === selected) ?? people[0];

  const handleSelect = (slug: PersonSlug) => {
    setSelected(slug);
    const person = people.find((candidate) => candidate.slug === slug);
    if (!person) return;
    startTransition(async () => {
      await selectPerson(person.id);
      router.refresh();
    });
  };

  const isoDate = day === "today" ? TODAY : YESTERDAY;
  const rows = scheduleFor(selected, isoDate);
  const yesterdayPending = scheduleFor(selected, YESTERDAY).filter(
    (row) => row.status === "pending",
  ).length;

  const weightTotal = rows.reduce((sum, row) => sum + row.task.weight, 0);
  const weightDone = rows
    .filter((row) => row.status === "done")
    .reduce((sum, row) => sum + row.task.weight, 0);

  const groups = periods
    .map((meta) => ({
      meta,
      rows: rows.filter((row) => row.task.period === meta.key),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <div
      data-person={selected}
      className="app-canvas flex min-h-screen flex-col bg-background"
    >
      <PanelHeader
        todayIso={TODAY}
        now={now}
        themePref={themePref}
        onCycleTheme={cycleTheme}
        mode={mode}
        onToggleMode={toggleMode}
      />

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-5 px-4 py-5 pb-24 md:px-8 lg:grid-cols-12 lg:gap-6 lg:pb-6">
        <Scoreboard scores={scores} className="lg:col-span-12" />

        <PersonSwitcher
          selected={selected}
          onSelect={handleSelect}
          people={people}
          className="lg:col-span-12"
        />

        <section
          key={`${selected}-${day}`}
          className="flex animate-rise-in flex-col gap-5 lg:col-span-7"
          aria-label={`Tarefas de ${selectedPerson.name}`}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="t-display truncate text-person-active-text">
                {selectedPerson.name}
              </h2>
              <p className="t-label text-muted-foreground">
                {rows.filter((row) => row.status === "done").length} de{" "}
                {rows.length} tarefas feitas · peso {weightDone} de{" "}
                {weightTotal}
              </p>
            </div>

            <DayTabs
              value={day}
              onChange={setDay}
              todayIso={TODAY}
              yesterdayIso={YESTERDAY}
              yesterdayPending={yesterdayPending}
            />
          </div>

          {groups.length === 0 ? (
            <p className="t-body rounded-lg border-2 border-dashed border-border bg-card p-6 text-center text-muted-foreground">
              Nenhuma tarefa devida {day === "today" ? "hoje" : "ontem"}.
            </p>
          ) : (
            groups.map((group) => (
              <PeriodSection
                key={group.meta.key}
                meta={group.meta}
                rows={group.rows}
                renderRow={(row) => (
                  <TaskCard
                    key={row.task.id}
                    row={row}
                    onMarkDone={() => markDone(row.task.id, row.dueDate)}
                    onUndo={() => undo(row.task.id, row.dueDate)}
                    onMarkMissed={() => markMissed(row.task.id, row.dueDate)}
                  />
                )}
              />
            ))
          )}
        </section>

        <aside className="flex flex-col gap-5 lg:col-span-5">
          <BirthdayStrip birthdays={birthdays} todayIso={TODAY} />
          <JudgementCard />
          <PanelActions variant="rail" className="hidden lg:flex" />
        </aside>
      </main>

      <PanelActions
        variant="bar"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      />

      <footer className="mx-auto w-full max-w-[1600px] px-4 pt-4 md:px-8">
        <p className="t-caption text-muted-foreground">
          Placar em % do possível: extras e “fiz para” somam bônus, deduradas
          procedentes descontam. Sem autenticação — combinação de confiança da
          casa.
        </p>
      </footer>
    </div>
  );
};
