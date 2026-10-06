"use client";

import { useState } from "react";
import {
  Ellipsis,
  CircleCheckBig,
  CircleDashed,
  Handshake,
  MoonStar,
  RotateCcw,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { personName } from "@/lib/panel/panel-people";
import { dayOfMonth } from "@/lib/panel/panel-schedule";
import type { OccurrenceStatus, Task } from "@/lib/panel/panel-types";
import type { ScheduledTask } from "@/components/panel/hooks/use-task-board";

interface TaskCardProps {
  row: ScheduledTask;
  onMarkDone: () => void;
  onUndo: () => void;
  onMarkMissed: () => void;
  className?: string;
}

const CARD_STYLE: Record<OccurrenceStatus, string> = {
  pending: "border-border bg-card hover:border-border-strong hover:shadow-soft",
  done: "border-state-done bg-state-done/10",
  missed: "border-dashed border-state-missed bg-card hatch-missed",
  covered: "border-border bg-card",
  excused: "border-dotted border-state-excused bg-surface-2 opacity-80",
};

const RAIL_STYLE: Record<OccurrenceStatus, string> = {
  pending: "bg-border-strong/50",
  done: "bg-state-done",
  missed: "rail-missed",
  covered: "bg-state-covered",
  excused: "rail-excused",
};

const CHIP_STYLE: Record<OccurrenceStatus, string> = {
  pending: "border-border bg-surface-2 text-muted-foreground",
  done: "border-state-done/40 bg-state-done/12 text-state-done",
  missed: "border-state-missed/40 bg-state-missed/12 text-state-missed",
  covered: "border-state-covered/40 bg-state-covered/12 text-state-covered",
  excused: "border-state-excused/40 bg-surface-2 text-state-excused",
};

const CHIP_ICON: Record<OccurrenceStatus, LucideIcon> = {
  pending: CircleDashed,
  done: CircleCheckBig,
  missed: X,
  covered: Handshake,
  excused: MoonStar,
};

/**
 * Cartão de tarefa: um toque marca como feita, o segundo desfaz.
 * O estado é sempre legível por forma + ícone + rótulo (nunca só cor).
 */
export const TaskCard = ({
  row,
  onMarkDone,
  onUndo,
  onMarkMissed,
  className,
}: TaskCardProps) => {
  const { task, status, dueDate, upcoming, doneBy, note } = row;
  const ChipIcon = CHIP_ICON[status];
  const isDone = status === "done";
  const interactive = status === "pending" || isDone || status === "missed";

  const handlePrimary = () => {
    if (!interactive) return;
    if (isDone) onUndo();
    else onMarkDone();
  };

  const primaryLabel = isDone
    ? `Desfazer “${task.title}”`
    : status === "missed"
      ? `Marcar “${task.title}” como feita`
      : `Marcar “${task.title}” como feita (+${task.weight} ponto${task.weight > 1 ? "s" : ""})`;

  return (
    <article
      data-status={status}
      className={cn(
        "relative flex items-center gap-3 rounded-lg border-2 px-3 py-3 transition-all duration-200 sm:gap-4 sm:px-4",
        CARD_STYLE[status],
        className,
      )}
    >
      <TaskRail status={status} />

      <button
        type="button"
        onClick={handlePrimary}
        disabled={!interactive}
        aria-pressed={isDone}
        aria-label={primaryLabel}
        title={interactive ? primaryLabel : undefined}
        className={cn(
          "focus flex min-w-0 flex-1 items-center gap-3 rounded-md text-left sm:gap-4",
          isDone && "opacity-90",
          !interactive && "cursor-default",
        )}
      >
        <TaskGlyph task={task} status={status} />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={cn(
              "t-title line-clamp-2",
              status === "missed" &&
                "line-through decoration-state-missed/70 decoration-2",
              status === "excused" && "text-muted-foreground",
            )}
          >
            {task.title}
          </span>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {upcoming ? (
              <span className="t-caption text-accent-strong">
                vence dia {dayOfMonth(dueDate)}
              </span>
            ) : null}
            {note && status !== "covered" ? (
              <span className="t-caption max-w-[26ch] truncate text-muted-foreground/90">
                {note}
              </span>
            ) : null}
          </span>

          <span
            className={cn(
              "t-caption mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5",
              CHIP_STYLE[status],
              status === "covered" && "stamp",
            )}
          >
            <ChipIcon className="size-3.5" aria-hidden />
            {status === "pending"
              ? "pendente"
              : status === "done"
                ? `feita · +${task.weight}`
                : status === "missed"
                  ? "não cumprida"
                  : status === "covered"
                    ? `feita por ${personName(doneBy)}`
                    : "dispensada"}
          </span>
        </span>
      </button>

      <span
        aria-label={`peso ${task.weight}`}
        className={cn(
          "t-caption grid size-8 shrink-0 place-items-center rounded-full border text-muted-foreground",
          task.weight === 3
            ? "border-border-strong bg-surface-2 font-extrabold text-foreground"
            : "border-transparent bg-surface-2",
        )}
      >
        {task.weight}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Mais ações para “${task.title}”`}
            className="focus grid size-11 shrink-0 place-items-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface-2 hover:text-foreground data-[state=open]:border-border data-[state=open]:bg-surface-2"
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[16rem] rounded-md border-border p-1.5 shadow-float"
        >
          <DropdownMenuLabel className="t-caption px-3 py-2 text-muted-foreground">
            {task.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {status !== "done" ? (
            <DropdownMenuItem
              onSelect={onMarkDone}
              className="t-body gap-2.5 rounded-sm px-3 py-2.5"
            >
              <CircleCheckBig className="size-4 text-state-done" aria-hidden />
              Marcar como feita
              <span className="t-caption ml-auto text-muted-foreground">
                +{task.weight}
              </span>
            </DropdownMenuItem>
          ) : null}
          {status !== "missed" ? (
            <DropdownMenuItem
              onSelect={onMarkMissed}
              className="t-body gap-2.5 rounded-sm px-3 py-2.5 text-state-missed focus:text-state-missed"
            >
              <X className="size-4" aria-hidden />
              Não cumprida
              <span className="t-caption ml-auto text-muted-foreground">
                0 pontos
              </span>
            </DropdownMenuItem>
          ) : null}
          {status !== "pending" ? (
            <DropdownMenuItem
              onSelect={onUndo}
              className="t-body gap-2.5 rounded-sm px-3 py-2.5"
            >
              <RotateCcw className="size-4" aria-hidden />
              Desfazer
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
};

const TaskRail = ({ status }: { status: OccurrenceStatus }) =>
  status === "covered" ? (
    <span aria-hidden className="flex self-stretch gap-1">
      <span className="rail w-1 rounded-full bg-state-covered" />
      <span className="rail w-1 rounded-full bg-state-covered/60" />
    </span>
  ) : (
    <span
      aria-hidden
      className={cn("rail w-1.5 shrink-0", RAIL_STYLE[status])}
    />
  );

/** Ilustração própria quando existe; a figura da tarefa como reserva. */
const TaskGlyph = ({
  task,
  status,
}: {
  task: Task;
  status: OccurrenceStatus;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = task.icon;
  const showImage = Boolean(task.image) && !imageFailed;

  return (
    <span
      className={cn(
        "grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border/70 bg-surface-2 sm:size-14",
        status === "done" && "border-state-done/40 bg-state-done/12",
      )}
    >
      {showImage ? (
        <img
          src={task.image}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="size-full object-cover"
        />
      ) : typeof Icon === "string" ? (
        <span className="text-2xl" aria-hidden>
          {Icon}
        </span>
      ) : (
        <Icon
          className={cn(
            "size-6 sm:size-7",
            status === "done"
              ? "text-state-done"
              : status === "missed"
                ? "text-state-missed"
                : "text-muted-foreground",
          )}
          aria-hidden
        />
      )}
    </span>
  );
};
