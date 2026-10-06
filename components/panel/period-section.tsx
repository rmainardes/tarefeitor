import type { ReactNode } from "react";
import { MoonStar } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PeriodMeta } from "@/lib/panel/panel-types";
import type { ScheduledTask } from "@/components/panel/hooks/use-task-board";

interface PeriodSectionProps {
  meta: PeriodMeta;
  rows: ScheduledTask[];
  renderRow: (row: ScheduledTask) => ReactNode;
  className?: string;
}

/** Bloco de período: manhã, tarde, noite, livre. */
export const PeriodSection = ({
  meta,
  rows,
  renderRow,
  className,
}: PeriodSectionProps) => {
  const total = rows.length;
  const done = rows.filter((row) => row.status === "done").length;
  const weightTotal = rows.reduce((sum, row) => sum + row.task.weight, 0);
  const weightDone = rows
    .filter((row) => row.status === "done")
    .reduce((sum, row) => sum + row.task.weight, 0);
  const pct = weightTotal === 0 ? 0 : (100 * weightDone) / weightTotal;

  return (
    <section
      className={cn("flex flex-col gap-2", className)}
      aria-label={meta.label}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="t-title">{meta.label}</h3>
        <span className="t-caption text-muted-foreground">{meta.window}</span>

        <span className="ml-auto flex items-center gap-3">
          <span className="t-caption text-muted-foreground">
            {done} de {total} feitas · peso {weightDone} de {weightTotal}
          </span>
          <span
            className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2 sm:w-36"
            role="presentation"
          >
            <span
              className="block h-full rounded-full bg-person-active transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </span>
        </span>
      </header>

      <div className="flex flex-col gap-2">
        {rows.map((row) => renderRow(row))}

        {rows.every((row) => row.status === "excused") ? (
          <p className="t-caption flex items-center gap-1.5 text-muted-foreground">
            <MoonStar className="size-4" aria-hidden />
            Tudo dispensado neste período.
          </p>
        ) : null}
      </div>
    </section>
  );
};
