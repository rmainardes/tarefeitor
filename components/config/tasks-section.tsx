"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { endTask } from "@/app/actions/tasks";
import { ActionButton } from "@/components/ui/action-button";
import { TaskDialog } from "./task-dialog";
import type { ConfigPerson, ConfigTaskRecord } from "./config-types";

interface TasksSectionProps {
  people: ConfigPerson[];
  tasks: ConfigTaskRecord[];
  actorId: number;
  onChanged: () => void;
}

const PERIOD_LABELS: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  anytime: "Qualquer hora",
};

const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function recurrenceLabel(task: ConfigTaskRecord): string {
  switch (task.kind) {
    case "daily":
      return "Todo dia";
    case "weekly":
      return (task.weekdays ?? []).map((day) => WEEKDAY_SHORT[day - 1]).join(", ");
    case "monthly":
      return `Dia ${task.monthDay} do mês (${task.leadDays}d de antecedência)`;
    case "once":
      return `Em ${task.onceDate}`;
    case "exam_eve":
      return "Véspera de prova";
    default:
      return task.kind;
  }
}

export function TasksSection({ people, tasks, actorId, onChanged }: TasksSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigTaskRecord | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (task: ConfigTaskRecord) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const handleEnd = (task: ConfigTaskRecord) => {
    if (!window.confirm(`Encerrar "${task.title}"? A tarefa deixa de aparecer a partir de hoje.`)) return;
    void (async () => {
      const result = await endTask({ taskId: task.id, actorId });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Tarefa "${task.title}" encerrada.`);
      onChanged();
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-title">Tarefas</h2>
        <ActionButton variant="accent" size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden /> Nova tarefa
        </ActionButton>
      </div>

      <div className="flex flex-col gap-5">
        {people.map((person) => {
          const personTasks = tasks.filter((task) => task.personId === person.id);
          if (personTasks.length === 0) return null;

          return (
            <div key={person.id} className="flex flex-col gap-2">
              <h3 className="t-label" style={{ color: person.color }}>
                {person.name}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {personTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="text-xl" aria-hidden>
                      {task.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="t-body truncate font-semibold">{task.title}</p>
                      <p className="t-caption text-muted-foreground">
                        {PERIOD_LABELS[task.period]} · peso {task.weight} · {recurrenceLabel(task)}
                      </p>
                    </div>
                    <ActionButton variant="ghost" size="sm" onClick={() => openEdit(task)}>
                      Editar
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => handleEnd(task)}>
                      Encerrar
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {dialogOpen ? (
        <TaskDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          people={people}
          actorId={actorId}
          task={editing}
          onDone={onChanged}
        />
      ) : null}
    </section>
  );
}
