"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createBirthday } from "@/app/actions/birthdays";
import { ActionButton } from "@/components/ui/action-button";
import { Modal } from "@/components/ui/modal";
import type { Person } from "@/lib/panel/panel-types";

interface BirthdayDialogProps {
  open: boolean;
  onClose: () => void;
  actor: Person;
  onDone: () => void;
}

const MONTH_OPTIONS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
].map((label, index) => ({ value: index + 1, label }));

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

/** "Aniversário": nome, dia, mês e ano opcional (seção 8.1). */
export function BirthdayDialog({ open, onClose, actor, onDone }: BirthdayDialogProps) {
  const [name, setName] = useState("");
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [birthYear, setBirthYear] = useState("");
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setDay(1);
    setMonth(1);
    setBirthYear("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return;

    startTransition(async () => {
      const result = await createBirthday({
        name: trimmedName,
        day,
        month,
        birthYear: birthYear.trim().length > 0 ? Number(birthYear) : null,
        createdBy: actor.id,
      });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Aniversário de ${trimmedName} cadastrado.`);
      reset();
      onClose();
      onDone();
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Aniversário">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="t-label">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 60))}
            required
            autoFocus
            placeholder="Ex.: Tia Arlete"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Dia</span>
            <select
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
              className={inputClass}
            >
              {Array.from({ length: 31 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Mês</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={inputClass}
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">Ano de nascimento (opcional)</span>
          <input
            type="number"
            inputMode="numeric"
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="Ex.: 2016"
            className={inputClass}
          />
        </label>

        <ActionButton type="submit" variant="person" size="wide" disabled={isPending || name.trim().length === 0}>
          {isPending ? "Cadastrando…" : "Cadastrar aniversário"}
        </ActionButton>
      </form>
    </Modal>
  );
}
