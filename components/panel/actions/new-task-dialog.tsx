"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTask } from "@/app/actions/tasks";
import { ActionButton } from "@/components/ui/action-button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { Person, PersonSlug, TaskPeriod } from "@/lib/panel/panel-types";

interface NewTaskDialogProps {
  open: boolean;
  onClose: () => void;
  people: Person[];
  actor: Person;
  onDone: () => void;
}

const PERIOD_OPTIONS: { value: TaskPeriod; label: string }[] = [
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noite" },
  { value: "anytime", label: "A qualquer hora" },
];

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
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

export function NewTaskDialog({ open, onClose, people, actor, onDone }: NewTaskDialogProps) {
  const [personSlug, setPersonSlug] = useState<PersonSlug>(actor.slug);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState<TaskPeriod>("anytime");
  const [weight, setWeight] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<"daily" | "weekly">("daily");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setPersonSlug(actor.slug);
    setTitle("");
    setPeriod("anytime");
    setWeight(1);
    setKind("daily");
    setWeekdays([1, 2, 3, 4, 5]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const person = people.find((candidate) => candidate.slug === personSlug);
    const trimmedTitle = title.trim();
    if (!person || trimmedTitle.length === 0) return;
    if (kind === "weekly" && weekdays.length === 0) {
      toast("Escolha pelo menos um dia da semana.");
      return;
    }

    startTransition(async () => {
      const result = await createTask({
        personId: person.id,
        title: trimmedTitle,
        period,
        weight,
        kind,
        weekdays: kind === "weekly" ? weekdays : null,
        createdBy: actor.id,
      });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Tarefa "${trimmedTitle}" criada para ${person.name}.`);
      reset();
      onClose();
      onDone();
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nova tarefa">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="t-label">Título</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 80))}
            required
            autoFocus
            placeholder="Ex.: Regar as plantas"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">De quem?</span>
          <select
            value={personSlug}
            onChange={(event) => setPersonSlug(event.target.value as PersonSlug)}
            className={inputClass}
          >
            {people.map((person) => (
              <option key={person.slug} value={person.slug}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Período</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as TaskPeriod)}
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
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value) as 1 | 2 | 3)}
              className={inputClass}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="t-label">Recorrência</legend>
          <div className="flex gap-2">
            <RecurrenceOption active={kind === "daily"} onClick={() => setKind("daily")} label="Todo dia" />
            <RecurrenceOption active={kind === "weekly"} onClick={() => setKind("weekly")} label="Dias da semana" />
          </div>
        </fieldset>

        {kind === "weekly" ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
            {WEEKDAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleWeekday(option.value)}
                aria-pressed={weekdays.includes(option.value)}
                className={cn(
                  "focus t-caption rounded-full border px-3 py-1.5",
                  weekdays.includes(option.value)
                    ? "border-transparent bg-person-active text-person-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-border-strong",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <ActionButton type="submit" variant="person" size="wide" disabled={isPending || title.trim().length === 0}>
          {isPending ? "Criando…" : "Criar tarefa"}
        </ActionButton>
      </form>
    </Modal>
  );
}

function RecurrenceOption({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus t-caption flex-1 rounded-md border px-3 py-2",
        active
          ? "border-transparent bg-person-active text-person-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong",
      )}
    >
      {label}
    </button>
  );
}
