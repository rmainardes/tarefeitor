"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createReport } from "@/app/actions/judgment";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";
import type { Person, PersonSlug } from "@/lib/panel/panel-types";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  author: Person;
  others: Person[];
  today: string;
  onDone: () => void;
}

const MAX_LENGTH = 280;

export function ReportDialog({ open, onClose, author, others, today, onDone }: ReportDialogProps) {
  const [accusedSlug, setAccusedSlug] = useState<PersonSlug | "">(others[0]?.slug ?? "");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setDescription("");
    setAccusedSlug(others[0]?.slug ?? "");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const accused = others.find((person) => person.slug === accusedSlug);
    const trimmed = description.trim();
    if (!accused || trimmed.length === 0) return;

    startTransition(async () => {
      const result = await createReport({
        authorId: author.id,
        accusedId: accused.id,
        description: trimmed,
        happenedOn: today,
      });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Dedurada registrada contra ${accused.name} — vai a voto dos três.`);
      reset();
      onClose();
      onDone();
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Dedurando">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <p className="t-caption text-muted-foreground">
          {author.name} está dedurando. O acusado pode escrever uma defesa; os três votam.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">Quem?</span>
          <select
            value={accusedSlug}
            onChange={(event) => setAccusedSlug(event.target.value as PersonSlug)}
            required
            className="focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground"
          >
            {others.map((person) => (
              <option key={person.slug} value={person.slug}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">O que aconteceu?</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            required
            placeholder="Ex.: não tirou o lixo direito"
            className="focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground"
          />
          <span className="t-caption self-end text-muted-foreground">
            {description.length}/{MAX_LENGTH}
          </span>
        </label>

        <ActionButton
          type="submit"
          variant="person"
          size="wide"
          disabled={isPending || description.trim().length === 0 || !accusedSlug}
        >
          {isPending ? "Registrando…" : "Dedurar"}
        </ActionButton>
      </form>
    </Modal>
  );
}
