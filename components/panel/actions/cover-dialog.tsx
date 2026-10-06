"use client";

import { Handshake } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { coverTask, getCoverableTasks } from "@/app/actions/tasks";
import { Modal } from "@/components/ui/modal";
import type { CoverableTask } from "@/lib/data/occurrenceResolution";
import type { Person } from "@/lib/panel/panel-types";

interface CoverDialogProps {
  open: boolean;
  onClose: () => void;
  actor: Person;
  onDone: () => void;
}

export function CoverDialog({ open, onClose, actor, onDone }: CoverDialogProps) {
  const [tasks, setTasks] = useState<CoverableTask[] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Busca as tarefas cobríveis ao abrir — não dá para fazer isso durante o render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setTasks(null);
      return;
    }
    let cancelled = false;
    getCoverableTasks(actor.id)
      .then((result) => {
        if (!cancelled) setTasks(result);
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          toast("Não deu para carregar as tarefas pendentes.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, actor.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCover = (task: CoverableTask) => {
    startTransition(async () => {
      const result = await coverTask({ taskId: task.taskId, dueDate: task.dueDate, actorId: actor.id });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Feito para ${task.personName}: ${task.title}.`);
      onClose();
      onDone();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Fiz para">
      <p className="t-caption text-muted-foreground">
        Tarefas pendentes de hoje das outras pessoas. Render um ponto extra para {actor.name}.
      </p>

      {tasks === null ? (
        <p className="t-body text-muted-foreground">Carregando…</p>
      ) : tasks.length === 0 ? (
        <p className="t-body rounded-md border-2 border-dashed border-border bg-surface-2/50 p-4 text-center text-muted-foreground">
          Nada pendente agora.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={`${task.taskId}:${task.dueDate}`}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCover(task)}
                className="focus flex w-full items-center gap-3 rounded-md border border-border bg-surface p-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-xl" aria-hidden>
                  {task.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-body block truncate">{task.title}</span>
                  <span className="t-caption text-muted-foreground">{task.personName}</span>
                </span>
                <Handshake className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
