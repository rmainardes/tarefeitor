import { Cake, Gift } from "lucide-react";

import { cn } from "@/lib/utils";
import { monthLabel } from "@/lib/panel/panel-schedule";
import type { Birthday } from "@/lib/panel/panel-types";

interface BirthdayStripProps {
  birthdays: Birthday[];
  todayIso: string;
  className?: string;
}

/** Aniversários do mês, com contagem regressiva e destaque no dia. */
export const BirthdayStrip = ({
  birthdays,
  todayIso,
  className,
}: BirthdayStripProps) => {
  const todayDay = Number(todayIso.slice(8, 10));
  const list = [...birthdays]
    .filter((birthday) => birthday.month === Number(todayIso.slice(5, 7)))
    .sort((a, b) => a.day - b.day);

  if (list.length === 0) return null;

  return (
    <section
      className={cn("surface-card p-4", className)}
      aria-label="Aniversários do mês"
    >
      <header className="flex items-center gap-2">
        <Cake className="size-5 shrink-0 text-accent-strong" aria-hidden />
        <h2 className="t-title flex-1 truncate">
          Aniversários de {monthLabel(todayIso).split(" ")[0]}
        </h2>
        <span className="t-caption shrink-0 text-muted-foreground">
          {list.length} no mês
        </span>
      </header>

      <ul className="mt-3 flex flex-col gap-2">
        {list.map((birthday) => {
          const days = birthday.day - todayDay;
          const isToday = days === 0;
          return (
            <li
              key={birthday.id}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full border px-3.5 py-2",
                isToday
                  ? "animate-breathe border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px_hsl(var(--accent)/0.25)]"
                  : "border-border bg-surface",
              )}
            >
              {isToday ? (
                <Gift className="size-4 shrink-0" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className="t-caption grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted-foreground"
                >
                  {birthday.day}
                </span>
              )}

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="t-label truncate">{birthday.name}</span>
                <span
                  className={cn(
                    "t-caption",
                    isToday
                      ? "text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {String(birthday.day).padStart(2, "0")}/
                  {String(birthday.month).padStart(2, "0")}
                  {birthday.birthYear
                    ? ` · ${new Date().getFullYear() - birthday.birthYear} anos`
                    : ""}
                </span>
              </span>

              <span
                className={cn(
                  "t-caption shrink-0 rounded-full px-2.5 py-1",
                  isToday
                    ? "bg-accent-foreground/15 font-extrabold"
                    : days <= 3
                      ? "bg-accent/20 text-accent-strong"
                      : "text-muted-foreground",
                )}
              >
                {isToday
                  ? "HOJE"
                  : days === 1
                    ? "amanhã"
                    : `faltam ${days} dias`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
