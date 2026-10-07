"use client";

import { useState } from "react";
import { toast } from "sonner";

import { deleteBirthday } from "@/app/actions/birthdays";
import { ActionButton } from "@/components/ui/action-button";
import { BirthdayEditDialog } from "./birthday-dialog";
import type { BirthdayRecord } from "./config-types";

interface BirthdaysSectionProps {
  birthdays: BirthdayRecord[];
  actorId: number;
  onChanged: () => void;
}

const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

export function BirthdaysSection({ birthdays, actorId, onChanged }: BirthdaysSectionProps) {
  const [editing, setEditing] = useState<BirthdayRecord | null>(null);

  const handleDelete = (birthday: BirthdayRecord) => {
    if (!window.confirm(`Excluir o aniversário de ${birthday.name}?`)) return;
    void (async () => {
      const result = await deleteBirthday({ id: birthday.id, actorId });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Aniversário de ${birthday.name} excluído.`);
      onChanged();
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Aniversários</h2>
      <p className="t-caption text-muted-foreground">
        Cadastro novo pelo botão &quot;Aniversário&quot; do Painel. Aqui dá para editar ou excluir.
      </p>

      {birthdays.length === 0 ? (
        <p className="t-body text-muted-foreground">Nenhum aniversário cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {birthdays.map((birthday) => (
            <li
              key={birthday.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="t-body font-semibold">{birthday.name}</p>
                <p className="t-caption text-muted-foreground">
                  {birthday.day} de {MONTH_NAMES[birthday.month - 1]}
                  {birthday.birthYear ? ` · ${birthday.birthYear}` : ""}
                </p>
              </div>
              <ActionButton variant="ghost" size="sm" onClick={() => setEditing(birthday)}>
                Editar
              </ActionButton>
              <ActionButton variant="ghost" size="sm" onClick={() => handleDelete(birthday)}>
                Excluir
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <BirthdayEditDialog
          key={editing.id}
          onClose={() => setEditing(null)}
          actorId={actorId}
          birthday={editing}
          onDone={onChanged}
        />
      ) : null}
    </section>
  );
}
