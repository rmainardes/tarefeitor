"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { selectPerson } from "@/app/actions/session";
import { markDone, markMissed, undoMark } from "@/app/actions/tasks";
import { AgendaStrip } from "@/components/panel/agenda-strip";
import { BirthdayDialog } from "@/components/panel/actions/birthday-dialog";
import { CoverDialog } from "@/components/panel/actions/cover-dialog";
import { ExtraDialog } from "@/components/panel/actions/extra-dialog";
import { NewTaskDialog } from "@/components/panel/actions/new-task-dialog";
import { ReportDialog } from "@/components/panel/actions/report-dialog";
import { BirthdayStrip } from "@/components/panel/birthday-strip";
import { ConfettiBurst } from "@/components/ceremony/confetti-burst";
import { DayTabs, type PanelDay } from "@/components/panel/day-tabs";
import { useIdleKiosk } from "@/components/panel/hooks/use-idle-kiosk";
import { useOfflineCache } from "@/components/panel/hooks/use-offline-cache";
import { usePanelChrome } from "@/components/panel/hooks/use-panel-chrome";
import { usePanelShortcuts } from "@/components/panel/hooks/use-panel-shortcuts";
import { useRealtimeUpdates } from "@/components/panel/hooks/use-realtime-updates";
import { JudgementCard } from "@/components/panel/judgement-card";
import { PanelActions, type PanelActionKey } from "@/components/panel/panel-actions";
import { PanelHeader } from "@/components/panel/panel-header";
import { PeriodSection } from "@/components/panel/period-section";
import { PersonSwitcher } from "@/components/panel/person-switcher";
import { QrCorner } from "@/components/panel/qr-corner";
import { Scoreboard } from "@/components/panel/scoreboard";
import { TaskCard } from "@/components/panel/task-card";
import { periods } from "@/lib/panel/panel-seed";
import type { BoardScore } from "@/lib/panel/panel-scoring";
import type {
  AgendaItemView,
  Birthday,
  JudgementItemView,
  Person,
  PersonSlug,
  ScheduledTask,
} from "@/lib/panel/panel-types";
import type { ActionResult } from "@/lib/validation";

/** Ordem fixa da rotação ociosa (seção 8.3) — igual às teclas 1/2/3. */
const ROTATION_ORDER: PersonSlug[] = ["pedro", "vania", "rodrigo"];

interface FamilyPanelProps {
  people: Person[];
  scores: BoardScore[];
  /** Pessoa do cookie real `selected_person`, resolvida no servidor. */
  initialSelected: PersonSlug;
  today: string;
  yesterday: string;
  tomorrow: string;
  /** "Ontem" só aparece enquanto o prazo retroativo estiver aberto (seção 8.1). */
  yesterdayAllowed: boolean;
  tasksToday: ScheduledTask[];
  tasksYesterday: ScheduledTask[];
  judgements: JudgementItemView[];
  agenda: AgendaItemView[];
  /** `true` quando a leitura de alguma agenda real falhou (seção 7.5). */
  agendaStale: boolean;
  /** Aniversários do mês corrente (seção 7.6). */
  birthdays: Birthday[];
  /** `sound_enabled` e fora de `quiet_hours`, calculado no servidor (seção 8.4). */
  soundAllowed: boolean;
  /** `idle_rotation_seconds` (seção 8.3): ociosidade até a rotação automática. */
  idleRotationSeconds: number;
}

/**
 * Painel (T06, migrado em T2b-T2d): placar, seletor, lista de tarefas e
 * marcação por toque, todos com dados reais.
 */
export const FamilyPanel = ({
  people,
  scores,
  initialSelected,
  today,
  yesterday,
  tomorrow,
  yesterdayAllowed,
  tasksToday,
  tasksYesterday,
  judgements,
  agenda,
  agendaStale,
  birthdays,
  soundAllowed,
  idleRotationSeconds,
}: FamilyPanelProps) => {
  const [selected, setSelected] = useState<PersonSlug>(initialSelected);
  const [openAction, setOpenAction] = useState<PanelActionKey | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tasksSectionRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { pref: themePref, cycleTheme, mode, toggleMode, now } = usePanelChrome();
  const [day, setDay] = useState<PanelDay>("today");
  const activeDay: PanelDay = yesterdayAllowed ? day : "today";

  const selectedPerson = people.find((person) => person.slug === selected) ?? people[0];

  const isOffline = useOfflineCache({
    selected,
    scores,
    tasksToday,
    tasksYesterday,
    judgements,
    agenda,
    birthdays,
  });

  // Pessoa escolhida de propósito (clique/tecla 1-2-3), distinta da exibida
  // durante a rotação ociosa — a interrupção volta sempre para esta (seção 8.3).
  const manualSlugRef = useRef<PersonSlug>(initialSelected);
  const displaySlugRef = useRef<PersonSlug>(initialSelected);
  useEffect(() => {
    displaySlugRef.current = selected;
  }, [selected]);

  // A rotação ociosa pode pedir uma troca de pessoa na mesma tecla que já
  // dispara uma seleção manual (interrupção + atalho no mesmo "keydown").
  // Para o cookie do servidor nunca ficar com um valor mais antigo que o
  // mostrado na tela, as gravações são serializadas aqui: cada rodada grava
  // a pessoa mais recente pedida, e repete se um pedido mais novo chegou
  // durante a espera — a última gravação sempre corresponde à última troca.
  const latestSlugRef = useRef<PersonSlug>(initialSelected);
  const syncingRef = useRef(false);

  useRealtimeUpdates({
    onChange: (event) => {
      if (event.type !== "task_done") return;
      const person = people.find((candidate) => candidate.id === event.personId);
      toast(`${person?.name ?? "Alguém"} concluiu uma tarefa!`);
      setConfettiTrigger((value) => value + 1);
      if (soundAllowed && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    },
  });

  const selectSlug = (slug: PersonSlug, manual: boolean) => {
    if (manual) manualSlugRef.current = slug;
    setSelected(slug);
    latestSlugRef.current = slug;
    if (syncingRef.current) return;
    syncingRef.current = true;

    startTransition(async () => {
      let current = latestSlugRef.current;
      for (;;) {
        const person = people.find((candidate) => candidate.slug === current);
        if (person) {
          try {
            await selectPerson(person.id);
          } catch {
            // Sem rede: mantém a troca só na tela deste aparelho (seção 8.5).
            break;
          }
        }
        if (latestSlugRef.current === current) break;
        current = latestSlugRef.current;
      }
      syncingRef.current = false;
      router.refresh();
    });
  };

  const handleSelect = (slug: PersonSlug) => selectSlug(slug, true);

  const handleActionDone = () => {
    router.refresh();
  };

  const others = people.filter((person) => person.slug !== selected);

  const runTaskAction = (action: () => Promise<ActionResult>) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast(result.message);
          return;
        }
        router.refresh();
      } catch {
        toast("Sem conexão. Tente novamente quando a rede voltar.");
      }
    });
  };

  // Rotação ociosa do modo parede (seção 8.3): alterna sozinho entre as três
  // pessoas; qualquer tecla ou movimento do mouse interrompe e volta à
  // pessoa escolhida de propósito.
  const handleIdleRotate = () => {
    const currentIndex = ROTATION_ORDER.indexOf(displaySlugRef.current);
    const next = ROTATION_ORDER[(currentIndex + 1) % ROTATION_ORDER.length];
    selectSlug(next, false);
  };

  const handleIdleInterrupt = () => {
    if (displaySlugRef.current !== manualSlugRef.current) {
      selectSlug(manualSlugRef.current, false);
    }
  };

  useIdleKiosk({
    enabled: mode === "wall",
    idleSeconds: idleRotationSeconds,
    onRotate: handleIdleRotate,
    onInterrupt: handleIdleInterrupt,
  });

  // Atalhos de teclado (seção 8.2): 1/2/3 trocam a pessoa, ↑/↓ navegam pelas
  // tarefas, E/D/F/N abrem os diálogos de ação. Desativados com um diálogo
  // já aberto.
  usePanelShortcuts({
    enabled: openAction === null,
    tasksContainer: tasksSectionRef,
    onSelectPerson: handleSelect,
    onExtra: () => !isOffline && setOpenAction("extra"),
    onReport: () => !isOffline && setOpenAction("report"),
    onFavor: () => !isOffline && setOpenAction("favor"),
    onNewTask: () => !isOffline && setOpenAction("task"),
  });

  const rows = activeDay === "today" ? tasksToday : tasksYesterday;
  const yesterdayPending = tasksYesterday.filter((row) => row.status === "pending").length;

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
        todayIso={today}
        now={now}
        themePref={themePref}
        onCycleTheme={cycleTheme}
        mode={mode}
        onToggleMode={toggleMode}
        offline={isOffline}
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
          key={`${selected}-${activeDay}`}
          ref={tasksSectionRef}
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
              todayIso={today}
              yesterdayIso={yesterday}
              yesterdayPending={yesterdayPending}
              yesterdayAllowed={yesterdayAllowed}
            />
          </div>

          {groups.length === 0 ? (
            <p className="t-body rounded-lg border-2 border-dashed border-border bg-card p-6 text-center text-muted-foreground">
              Nenhuma tarefa devida {activeDay === "today" ? "hoje" : "ontem"}.
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
                    disabled={isOffline}
                    onMarkDone={() =>
                      runTaskAction(() =>
                        markDone({ taskId: row.task.id, dueDate: row.dueDate, actorId: selectedPerson.id }),
                      )
                    }
                    onUndo={() =>
                      runTaskAction(() =>
                        undoMark({ taskId: row.task.id, dueDate: row.dueDate, actorId: selectedPerson.id }),
                      )
                    }
                    onMarkMissed={() =>
                      runTaskAction(() =>
                        markMissed({
                          taskId: row.task.id,
                          dueDate: row.dueDate,
                          actorId: selectedPerson.id,
                          note: null,
                        }),
                      )
                    }
                  />
                )}
              />
            ))
          )}
        </section>

        <aside className="flex flex-col gap-5 lg:col-span-5">
          <AgendaStrip items={agenda} todayIso={today} tomorrowIso={tomorrow} stale={agendaStale} />
          <BirthdayStrip birthdays={birthdays} todayIso={today} />
          <JudgementCard items={judgements} />
          <PanelActions
            variant="rail"
            onAction={setOpenAction}
            disabled={isOffline}
            className="hidden lg:flex"
          />
        </aside>
      </main>

      <PanelActions
        variant="bar"
        onAction={setOpenAction}
        disabled={isOffline}
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      />

      {mode === "wall" ? <QrCorner /> : null}

      <ExtraDialog
        open={openAction === "extra"}
        onClose={() => setOpenAction(null)}
        author={selectedPerson}
        today={today}
        onDone={handleActionDone}
      />
      <ReportDialog
        open={openAction === "report"}
        onClose={() => setOpenAction(null)}
        author={selectedPerson}
        others={others}
        today={today}
        onDone={handleActionDone}
      />
      <CoverDialog
        open={openAction === "favor"}
        onClose={() => setOpenAction(null)}
        actor={selectedPerson}
        onDone={handleActionDone}
      />
      <NewTaskDialog
        open={openAction === "task"}
        onClose={() => setOpenAction(null)}
        people={people}
        actor={selectedPerson}
        onDone={handleActionDone}
      />
      <BirthdayDialog
        open={openAction === "birthday"}
        onClose={() => setOpenAction(null)}
        actor={selectedPerson}
        onDone={handleActionDone}
      />

      <footer className="mx-auto w-full max-w-[1600px] px-4 pt-4 md:px-8">
        <p className="t-caption text-muted-foreground">
          Placar em % do possível: extras e “fiz para” somam bônus, deduradas
          procedentes descontam. Sem autenticação — combinação de confiança da
          casa.
        </p>
      </footer>

      <ConfettiBurst trigger={confettiTrigger} />
      <audio ref={audioRef} src="/sounds/task-done.mp3" preload="auto" className="hidden" aria-hidden />
    </div>
  );
};
