"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { deleteDayOff, upsertDayOff } from "@/app/actions/daysOff";
import { ActionButton } from "@/components/ui/action-button";
import { Modal } from "@/components/ui/modal";
import type { ConfigPerson, ConfigTaskRecord, DayOffRecord } from "./config-types";

interface DaysOffSectionProps {
  people: ConfigPerson[];
  tasks: ConfigTaskRecord[];
  daysOff: DayOffRecord[];
  actorId: number;
  onChanged: () => void;
}

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

function DayOffDialog({
  open,
  onClose,
  people,
  tasks,
  actorId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  people: ConfigPerson[];
  tasks: ConfigTaskRecord[];
  actorId: number;
  onDone: () => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? 0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [taskId, setTaskId] = useState<string | "all">("all");
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const tasksForPerson = tasks.filter((task) => task.personId === personId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (dateFrom.length === 0 || dateTo.length === 0) return;

    setIsPending(true);
    void (async () => {
      const result = await upsertDayOff({
        personId,
        dateFrom,
        dateTo,
        taskId: taskId === "all" ? null : taskId,
        reason: reason.trim().length > 0 ? reason.trim() : null,
        actorId,
      });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Folga cadastrada.");
      setDateFrom("");
      setDateTo("");
      setReason("");
      onClose();
      onDone();
    })();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova folga">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="t-label">Pessoa</span>
          <select
            value={personId}
            onChange={(event) => {
              setPersonId(Number(event.target.value));
              setTaskId("all");
            }}
            className={inputClass}
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">De</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">Tarefa</span>
          <select value={taskId} onChange={(event) => setTaskId(event.target.value)} className={inputClass}>
            <option value="all">Todas as tarefas</option>
            {tasksForPerson.map((task) => (
              <option key={task.id} value={task.id}>
                {task.icon} {task.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">Motivo (opcional)</span>
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 120))}
            placeholder="Ex.: viagem da família"
            className={inputClass}
          />
        </label>

        <ActionButton type="submit" variant="accent" size="wide" disabled={isPending}>
          {isPending ? "Salvando…" : "Cadastrar folga"}
        </ActionButton>
      </form>
    </Modal>
  );
}

export function DaysOffSection({ people, tasks, daysOff, actorId, onChanged }: DaysOffSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  const handleDelete = (dayOff: DayOffRecord) => {
    if (!window.confirm("Excluir essa folga?")) return;
    void (async () => {
      const result = await deleteDayOff({ id: dayOff.id, actorId });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Folga excluída.");
      onChanged();
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-title">Folgas</h2>
        <ActionButton variant="accent" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden /> Nova folga
        </ActionButton>
      </div>

      {daysOff.length === 0 ? (
        <p className="t-body text-muted-foreground">Nenhuma folga cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {daysOff.map((dayOff) => (
            <li
              key={dayOff.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="t-body font-semibold">{peopleById.get(dayOff.personId)?.name ?? "—"}</p>
                <p className="t-caption text-muted-foreground">
                  {dayOff.dateFrom} a {dayOff.dateTo} ·{" "}
                  {dayOff.taskId ? tasksById.get(dayOff.taskId)?.title ?? "tarefa removida" : "todas as tarefas"}
                  {dayOff.reason ? ` · ${dayOff.reason}` : ""}
                </p>
              </div>
              <ActionButton variant="ghost" size="sm" onClick={() => handleDelete(dayOff)}>
                Excluir
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      <DayOffDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        people={people}
        tasks={tasks}
        actorId={actorId}
        onDone={onChanged}
      />
    </section>
  );
}
