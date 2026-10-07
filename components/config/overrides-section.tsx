"use client";

import { useState } from "react";
import { toast } from "sonner";

import { overrideOccurrence } from "@/app/actions/tasks";
import { ActionButton } from "@/components/ui/action-button";
import type { ConfigPerson, ConfigTaskRecord } from "./config-types";

interface OverridesSectionProps {
  people: ConfigPerson[];
  tasks: ConfigTaskRecord[];
  actorId: number;
  onChanged: () => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente (remove a marcação)" },
  { value: "done", label: "Feita" },
  { value: "missed", label: "Não cumprida" },
  { value: "covered", label: "Coberta ('fiz para')" },
  { value: "excused", label: "Dispensada" },
] as const;

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

/** "Edição pontual" (seção 8.6): altera o estado de qualquer ocorrência de um mês aberto. */
export function OverridesSection({ people, tasks, actorId, onChanged }: OverridesSectionProps) {
  const [personId, setPersonId] = useState(people[0]?.id ?? 0);
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("done");
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const tasksForPerson = tasks.filter((task) => task.personId === personId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (dueDate.length === 0 || taskId.length === 0 || trimmedReason.length === 0) {
      toast("Preencha a data e o motivo.");
      return;
    }

    setIsPending(true);
    void (async () => {
      const result = await overrideOccurrence({ taskId, dueDate, status, reason: trimmedReason, actorId });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Ocorrência atualizada.");
      setReason("");
      onChanged();
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Edição pontual</h2>
      <p className="t-caption text-muted-foreground">
        Altera o estado de uma ocorrência específica de um mês aberto. O motivo é obrigatório e vai para o log
        (seção 8.6).
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Pessoa</span>
            <select
              value={personId}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPersonId(next);
                setTaskId(tasks.find((task) => task.personId === next)?.id ?? "");
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

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Tarefa</span>
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)} className={inputClass}>
              {tasksForPerson.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.icon} {task.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Data</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Novo estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">Motivo (obrigatório)</span>
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 280))}
            placeholder="Ex.: esqueceu de marcar, corrigido a pedido"
            required
            className={inputClass}
          />
        </label>

        <ActionButton type="submit" variant="accent" size="wide" disabled={isPending || tasksForPerson.length === 0}>
          {isPending ? "Salvando…" : "Aplicar edição"}
        </ActionButton>
      </form>
    </section>
  );
}
