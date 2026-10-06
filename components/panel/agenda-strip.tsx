import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgendaItemView } from "@/lib/panel/panel-types";

interface AgendaStripProps {
  items: AgendaItemView[];
  todayIso: string;
  tomorrowIso: string;
  /** `true` quando alguma agenda não pôde ser atualizada (seção 7.5). */
  stale: boolean;
  className?: string;
}

/** Agenda de hoje e amanhã (Pedro e Rodrigo), seção 7.5. */
export const AgendaStrip = ({
  items,
  todayIso,
  tomorrowIso,
  stale,
  className,
}: AgendaStripProps) => {
  if (items.length === 0 && !stale) return null;

  const today = items.filter((item) => item.dateIso === todayIso);
  const tomorrow = items.filter((item) => item.dateIso === tomorrowIso);

  return (
    <section className={cn("surface-card p-4", className)} aria-label="Agenda de hoje e amanhã">
      <header className="flex items-center gap-2">
        <CalendarDays className="size-5 shrink-0 text-accent-strong" aria-hidden />
        <h2 className="t-title flex-1 truncate">Agenda</h2>
        {stale ? (
          <span className="t-caption shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-muted-foreground">
            agenda desatualizada
          </span>
        ) : null}
      </header>

      <div className="mt-3 flex flex-col gap-3">
        <AgendaGroup label="Hoje" items={today} />
        <AgendaGroup label="Amanhã" items={tomorrow} />
      </div>
    </section>
  );
};

const AgendaGroup = ({ label, items }: { label: string; items: AgendaItemView[] }) => (
  <div>
    <p className="t-caption text-muted-foreground">{label}</p>

    {items.length === 0 ? (
      <p className="t-caption mt-1 text-muted-foreground">Nada marcado.</p>
    ) : (
      <ul className="mt-1 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-full border border-border bg-surface px-3.5 py-2"
          >
            <span
              data-person={item.personSlug}
              aria-hidden
              className="size-2.5 shrink-0 rounded-full bg-person-active"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="t-label truncate">{item.title}</span>
              <span className="t-caption text-muted-foreground">{item.personName}</span>
            </span>
            <span className="t-caption shrink-0 text-muted-foreground">
              {item.allDay ? "dia inteiro" : item.timeLabel}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
