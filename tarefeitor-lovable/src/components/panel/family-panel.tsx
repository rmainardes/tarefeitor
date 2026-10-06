import { useState } from "react";

import { BirthdayStrip } from "@/components/panel/birthday-strip";
import { DayTabs, type PanelDay } from "@/components/panel/day-tabs";
import { JudgementCard } from "@/components/panel/judgement-card";
import { PanelActions } from "@/components/panel/panel-actions";
import { PanelHeader } from "@/components/panel/panel-header";
import { PeriodSection } from "@/components/panel/period-section";
import { PersonSwitcher } from "@/components/panel/person-switcher";
import { Scoreboard } from "@/components/panel/scoreboard";
import { TaskCard } from "@/components/panel/task-card";
import {
  birthdays,
  people,
  periods,
  TODAY,
  YESTERDAY,
} from "@/data/panel-seed";
import { usePanelChrome } from "@/hooks/use-panel-chrome";
import { useSelectedPerson } from "@/hooks/use-selected-person";
import { useTaskBoard } from "@/hooks/use-task-board";

/**
 * Painel (T06): placar, seletor de pessoa com cookie, lista de hoje e de
 * ontem e marcação por toque. Regras nas seções 8.1 e 9 do plano.
 */
export const FamilyPanel = () => {
  const { selected, select, selectedPerson } = useSelectedPerson();
  const { markDone, undo, markMissed, scheduleFor, scores } = useTaskBoard();
  const { themePref, cycleTheme, mode, toggleMode, now } = usePanelChrome();
  const [day, setDay] = useState<PanelDay>("today");

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
          onSelect={select}
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
