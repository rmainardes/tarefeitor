"use client";

import { useState } from "react";
import { toast } from "sonner";

import { createTaskConfig, updateTask } from "@/app/actions/tasks";
import { ActionButton } from "@/components/ui/action-button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { ConfigPerson, ConfigTaskRecord } from "./config-types";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  people: ConfigPerson[];
  actorId: number;
  /** `null` = criação de uma tarefa nova. */
  task: ConfigTaskRecord | null;
  onDone: () => void;
}

type Kind = "daily" | "weekly" | "monthly" | "once" | "exam_eve";

const PERIOD_OPTIONS = [
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noite" },
  { value: "anytime", label: "A qualquer hora" },
] as const;

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Dias da semana" },
  { value: "monthly", label: "Mensal" },
  { value: "once", label: "Data única" },
  { value: "exam_eve", label: "Véspera de prova" },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "seg" },
  { value: 2, label: "ter" },
  { value: 3, label: "qua" },
  { value: 4, label: "qui" },
  { value: 5, label: "sex" },
  { value: 6, label: "sáb" },
  { value: 7, label: "dom" },
];

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

function emptyState(people: ConfigPerson[]) {
  return {
    personId: people[0]?.id ?? 0,
    title: "",
    icon: "✅",
    imagePath: "",
    period: "anytime" as (typeof PERIOD_OPTIONS)[number]["value"],
    weight: 1 as 1 | 2 | 3,
    kind: "daily" as Kind,
    weekdays: [1, 2, 3, 4, 5],
    monthDay: 1,
    onceDate: "",
    leadDays: 0,
    sortOrder: 0,
  };
}

function stateFromTask(task: ConfigTaskRecord) {
  return {
    personId: task.personId,
    title: task.title,
    icon: task.icon,
    imagePath: task.imagePath ?? "",
    period: task.period,
    weight: task.weight as 1 | 2 | 3,
    kind: task.kind as Kind,
    weekdays: task.weekdays ?? [1, 2, 3, 4, 5],
    monthDay: task.monthDay ?? 1,
    onceDate: task.onceDate ?? "",
    leadDays: task.leadDays,
    sortOrder: task.sortOrder,
  };
}

/**
 * Criação e edição de tarefas (seção 8.6): todos os tipos de recorrência.
 * O estado inicial vem de `task` na montagem — quem chama precisa montar
 * uma instância nova (ex.: `key={task?.id ?? "new"}`) a cada alvo diferente.
 */
export function TaskDialog({ open, onClose, people, actorId, task, onDone }: TaskDialogProps) {
  const [form, setForm] = useState(() => (task ? stateFromTask(task) : emptyState(people)));
  const [isPending, setIsPending] = useState(false);

  const toggleWeekday = (day: number) => {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day].sort(),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = form.title.trim();
    if (trimmedTitle.length === 0 || form.personId === 0) return;
    if (form.kind === "weekly" && form.weekdays.length === 0) {
      toast("Escolha pelo menos um dia da semana.");
      return;
    }
    if (form.kind === "once" && form.onceDate.length === 0) {
      toast("Escolha a data única.");
      return;
    }

    const payload = {
      personId: form.personId,
      title: trimmedTitle,
      icon: form.icon.trim().length > 0 ? form.icon.trim() : "✅",
      imagePath: form.imagePath.trim().length > 0 ? form.imagePath.trim() : null,
      period: form.period,
      weight: form.weight,
      kind: form.kind,
      weekdays: form.kind === "weekly" ? form.weekdays : null,
      monthDay: form.kind === "monthly" ? form.monthDay : null,
      onceDate: form.kind === "once" ? form.onceDate : null,
      leadDays: form.kind === "monthly" ? form.leadDays : 0,
      sortOrder: form.sortOrder,
    };

    setIsPending(true);
    void (async () => {
      const result = task
        ? await updateTask({ ...payload, taskId: task.id, actorId })
        : await createTaskConfig({ ...payload, actorId });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(task ? `Tarefa "${trimmedTitle}" atualizada.` : `Tarefa "${trimmedTitle}" criada.`);
      onClose();
      onDone();
    })();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "Editar tarefa" : "Nova tarefa"} className="max-w-lg">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Título</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value.slice(0, 80) }))}
              required
              autoFocus
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Ícone</span>
            <input
              type="text"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value.slice(0, 8) }))}
              className={cn(inputClass, "text-center")}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">De quem?</span>
          <select
            value={form.personId}
            onChange={(event) => setForm((current) => ({ ...current, personId: Number(event.target.value) }))}
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
          <span className="t-label">Figura (imagem em /public, opcional)</span>
          <input
            type="text"
            value={form.imagePath}
            placeholder="/pingo.jpeg"
            onChange={(event) => setForm((current) => ({ ...current, imagePath: event.target.value }))}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Período</span>
            <select
              value={form.period}
              onChange={(event) =>
                setForm((current) => ({ ...current, period: event.target.value as typeof current.period }))
              }
              className={inputClass}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Peso</span>
            <select
              value={form.weight}
              onChange={(event) =>
                setForm((current) => ({ ...current, weight: Number(event.target.value) as 1 | 2 | 3 }))
              }
              className={inputClass}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Ordem</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={32767}
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              className={inputClass}
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="t-label">Recorrência</legend>
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, kind: option.value }))}
                aria-pressed={form.kind === option.value}
                className={cn(
                  "focus t-caption rounded-md border px-3 py-2",
                  form.kind === option.value
                    ? "border-transparent bg-accent text-accent-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-border-strong",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {form.kind === "weekly" ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
            {WEEKDAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleWeekday(option.value)}
                aria-pressed={form.weekdays.includes(option.value)}
                className={cn(
                  "focus t-caption rounded-full border px-3 py-1.5",
                  form.weekdays.includes(option.value)
                    ? "border-transparent bg-accent text-accent-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-border-strong",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {form.kind === "monthly" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="t-label">Dia do mês</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={form.monthDay}
                onChange={(event) => setForm((current) => ({ ...current, monthDay: Number(event.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="t-label">Antecedência (dias)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                value={form.leadDays}
                onChange={(event) => setForm((current) => ({ ...current, leadDays: Number(event.target.value) }))}
                className={inputClass}
              />
            </label>
          </div>
        ) : null}

        {form.kind === "once" ? (
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Data</span>
            <input
              type="date"
              value={form.onceDate}
              onChange={(event) => setForm((current) => ({ ...current, onceDate: event.target.value }))}
              className={inputClass}
            />
          </label>
        ) : null}

        <ActionButton
          type="submit"
          variant="accent"
          size="wide"
          disabled={isPending || form.title.trim().length === 0}
        >
          {isPending ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
        </ActionButton>
      </form>
    </Modal>
  );
}
