"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createExtra } from "@/app/actions/judgment";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";
import type { Person } from "@/lib/panel/panel-types";

interface ExtraDialogProps {
  open: boolean;
  onClose: () => void;
  author: Person;
  today: string;
  onDone: () => void;
}

const MAX_LENGTH = 280;

export function ExtraDialog({ open, onClose, author, today, onDone }: ExtraDialogProps) {
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setDescription("");
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length === 0) return;

    startTransition(async () => {
      const result = await createExtra({ authorId: author.id, description: trimmed, happenedOn: today });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Extra registrado — vai a voto dos outros dois.");
      setDescription("");
      onClose();
      onDone();
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Fiz um extra">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <p className="t-caption text-muted-foreground">
          Em nome de {author.name}. Os outros dois votam uma nota de 0 a 3.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="t-label">O que você fez?</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            autoFocus
            required
            placeholder="Ex.: lavei o carro sem ninguém pedir"
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
          disabled={isPending || description.trim().length === 0}
        >
          {isPending ? "Registrando…" : "Registrar extra"}
        </ActionButton>
      </form>
    </Modal>
  );
}
