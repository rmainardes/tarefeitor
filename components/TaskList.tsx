import Image from "next/image";

import { markDoneForm, markMissedForm, undoMarkForm } from "@/app/actions/tasks";
import type { ISODate } from "@/lib/domain/dates";
import type { TaskPeriod } from "@/lib/domain/recurrence";
import type { ResolvedTask } from "@/lib/data/occurrenceResolution";
import type { PersonRecord } from "@/lib/data/people";

const PERIOD_ORDER: TaskPeriod[] = ["morning", "afternoon", "evening", "anytime"];
const PERIOD_LABEL: Record<TaskPeriod, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  anytime: "A qualquer hora",
};

interface TaskListProps {
  tasks: readonly ResolvedTask[];
  actorId: number;
  people: readonly PersonRecord[];
}

export function TaskList({ tasks, actorId, people }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="py-10 text-center text-foreground/60">Nenhuma tarefa por aqui.</p>;
  }

  const byPeriod = new Map<TaskPeriod, ResolvedTask[]>();
  for (const item of tasks) {
    const group = byPeriod.get(item.task.period) ?? [];
    group.push(item);
    byPeriod.set(item.task.period, group);
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));

  return (
    <div className="flex flex-col gap-6">
      {PERIOD_ORDER.filter((period) => byPeriod.has(period)).map((period) => (
        <div key={period} className="flex flex-col gap-2">
          <h2 className="border-b border-foreground/10 pb-1.5 text-sm font-semibold text-foreground/50">
            {PERIOD_LABEL[period]}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {byPeriod.get(period)!.map((item) => (
              <TaskRow
                key={item.task.id}
                item={item}
                actorId={actorId}
                coveredBy={item.doneBy ? peopleById.get(item.doneBy) : undefined}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface TaskRowProps {
  item: ResolvedTask;
  actorId: number;
  coveredBy: PersonRecord | undefined;
}

function TaskRow({ item, actorId, coveredBy }: TaskRowProps) {
  const { task, dueDate, state, hasRecord } = item;
  const canFlagMissed = state.kind !== "missed" && state.kind !== "excused";
  const canUndo = hasRecord;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2.5">
      <Figure icon={task.icon} imagePath={task.imagePath} />

      <div className="flex-1">
        <MainAction state={state} task={task} dueDate={dueDate} actorId={actorId} />
        <StatusTag state={state} coveredBy={coveredBy} />
      </div>

      {(canFlagMissed || canUndo) && (
        <details className="relative">
          <summary
            className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full text-lg text-foreground/50 hover:bg-foreground/5"
            aria-label={`Mais opções para ${task.title}`}
          >
            ⋯
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex flex-col overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-sm">
            {canFlagMissed && (
              <form action={markMissedForm.bind(null, task.id, dueDate, actorId)}>
                <button type="submit" className="w-full whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-foreground/5">
                  Não cumprida
                </button>
              </form>
            )}
            {canUndo && (
              <form action={undoMarkForm.bind(null, task.id, dueDate, actorId)}>
                <button type="submit" className="w-full whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-foreground/5">
                  Desfazer
                </button>
              </form>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

function Figure({ icon, imagePath }: { icon: string; imagePath: string | null }) {
  if (imagePath) {
    return <Image src={imagePath} alt="" width={40} height={40} className="h-10 w-10 shrink-0" />;
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center text-2xl" aria-hidden>
      {icon}
    </span>
  );
}

interface MainActionProps {
  state: ResolvedTask["state"];
  task: ResolvedTask["task"];
  dueDate: ISODate;
  actorId: number;
}

function MainAction({ state, task, dueDate, actorId }: MainActionProps) {
  if (state.kind === "pending") {
    return (
      <form action={markDoneForm.bind(null, task.id, dueDate, actorId)}>
        <button type="submit" className="block w-full text-left font-display text-base">
          {task.title}
        </button>
      </form>
    );
  }

  if (state.kind === "done") {
    return (
      <form action={undoMarkForm.bind(null, task.id, dueDate, actorId)}>
        <button type="submit" className="block w-full text-left font-display text-base">
          {task.title}
        </button>
      </form>
    );
  }

  return <p className="font-display text-base text-foreground/70">{task.title}</p>;
}

function StatusTag({
  state,
  coveredBy,
}: {
  state: ResolvedTask["state"];
  coveredBy: PersonRecord | undefined;
}) {
  switch (state.kind) {
    case "done":
      return <p className="text-sm text-foreground/50">Feita</p>;
    case "missed":
      return <p className="text-sm text-amber-700">Não cumprida</p>;
    case "covered":
      return (
        <p className="text-sm" style={{ color: coveredBy?.color }}>
          Feita por {coveredBy?.name ?? "outra pessoa"}
        </p>
      );
    case "excused":
      return <p className="text-sm text-foreground/50">De folga</p>;
    default:
      return null;
  }
}
