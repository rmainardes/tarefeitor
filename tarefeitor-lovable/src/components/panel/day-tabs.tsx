import { CalendarClock, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dayMonthLabel,
  retroDeadlineLabel,
  shortDateLabel,
  weekdayLabel,
} from "@/lib/panel-schedule";

export type PanelDay = "today" | "yesterday";

interface DayTabsProps {
  value: PanelDay;
  onChange: (day: PanelDay) => void;
  todayIso: string;
  yesterdayIso: string;
  /** Tarefas de ontem ainda sem marcação (o prazo retroativo segue aberto). */
  yesterdayPending: number;
  className?: string;
}

export const DayTabs = ({
  value,
  onChange,
  todayIso,
  yesterdayIso,
  yesterdayPending,
  className,
}: DayTabsProps) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <div
      role="tablist"
      aria-label="Dia das tarefas"
      className="flex gap-1 rounded-full border border-border bg-surface-2 p-1 shadow-soft"
    >
      <DayTab
        active={value === "today"}
        onClick={() => onChange("today")}
        label="Hoje"
        sub={shortDateLabel(todayIso)}
      />
      <DayTab
        active={value === "yesterday"}
        onClick={() => onChange("yesterday")}
        label="Ontem"
        sub={weekdayLabel(yesterdayIso).slice(0, 3)}
        badge={yesterdayPending > 0 ? yesterdayPending : undefined}
      />
    </div>

    {value === "yesterday" ? (
      <p className="t-caption flex items-center gap-1.5 text-accent-strong">
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        Dá para marcar ontem até 23h de {dayMonthLabel(todayIso)}.
      </p>
    ) : (
      <p className="t-caption flex items-center gap-1.5 text-muted-foreground">
        <Clock className="size-4 shrink-0" aria-hidden />
        {retroDeadlineLabel(todayIso)} para as tarefas de hoje.
      </p>
    )}
  </div>
);

const DayTab = ({
  active,
  onClick,
  label,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  badge?: number;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      "focus flex min-h-[var(--tap-min)] flex-1 items-center justify-center gap-2 rounded-full px-4 transition-all duration-200",
      active
        ? "bg-card text-foreground shadow-soft"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {active ? (
      <span aria-hidden className="size-2 rounded-full bg-person-active" />
    ) : null}
    <span className="t-label">{label}</span>
    <span className="t-caption text-muted-foreground">{sub}</span>
    {badge !== undefined ? (
      <span
        className={cn(
          "t-caption grid size-5 place-items-center rounded-full",
          active
            ? "bg-person-active text-person-foreground"
            : "bg-border text-foreground",
        )}
      >
        {badge}
      </span>
    ) : null}
  </button>
);
