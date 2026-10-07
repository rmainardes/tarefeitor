"use client";

import { useState } from "react";
import { toast } from "sonner";

import { upsertBirthday } from "@/app/actions/birthdays";
import { ActionButton } from "@/components/ui/action-button";
import { Modal } from "@/components/ui/modal";
import type { BirthdayRecord } from "./config-types";

interface BirthdayEditDialogProps {
  onClose: () => void;
  actorId: number;
  birthday: BirthdayRecord;
  onDone: () => void;
}

const MONTH_OPTIONS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
].map((label, index) => ({ value: index + 1, label }));

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

/**
 * Edição de um aniversário já cadastrado (seção 8.6). Criação fica no
 * Painel. Quem chama precisa montar uma instância nova por aniversário
 * (ex.: `key={birthday.id}`) para o formulário iniciar com os dados certos.
 */
export function BirthdayEditDialog({ onClose, actorId, birthday, onDone }: BirthdayEditDialogProps) {
  const [name, setName] = useState(birthday.name);
  const [day, setDay] = useState(birthday.day);
  const [month, setMonth] = useState(birthday.month);
  const [birthYear, setBirthYear] = useState(birthday.birthYear ? String(birthday.birthYear) : "");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return;

    setIsPending(true);
    void (async () => {
      const result = await upsertBirthday({
        id: birthday.id,
        name: trimmedName,
        day,
        month,
        birthYear: birthYear.trim().length > 0 ? Number(birthYear) : null,
        actorId,
      });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Aniversário de ${trimmedName} atualizado.`);
      onClose();
      onDone();
    })();
  };

  return (
    <Modal open onClose={onClose} title="Editar aniversário">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="t-label">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 60))}
            required
            autoFocus
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Dia</span>
            <select value={day} onChange={(event) => setDay(Number(event.target.value))} className={inputClass}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-label">Mês</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={inputClass}>
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
            className={inputClass}
          />
        </label>

        <ActionButton type="submit" variant="accent" size="wide" disabled={isPending || name.trim().length === 0}>
          {isPending ? "Salvando…" : "Salvar alterações"}
        </ActionButton>
      </form>
    </Modal>
  );
}
