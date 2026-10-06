import {
  Clock,
  Home,
  Monitor,
  MoonStar,
  Smartphone,
  Sun,
  SunMoon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  clockLabel,
  dayMonthLabel,
  monthLabel,
  weekdayLabel,
} from "@/lib/panel-schedule";
import type { PanelMode, ThemePref } from "@/hooks/use-panel-chrome";

interface PanelHeaderProps {
  todayIso: string;
  now: Date;
  themePref: ThemePref;
  onCycleTheme: () => void;
  mode: PanelMode;
  onToggleMode: () => void;
}

export const PanelHeader = ({
  todayIso,
  now,
  themePref,
  onCycleTheme,
  mode,
  onToggleMode,
}: PanelHeaderProps) => {
  const ThemeIcon =
    themePref === "auto" ? SunMoon : themePref === "night" ? MoonStar : Sun;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-8">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-soft"
        >
          <Home className="size-5" />
        </span>

        <div className="min-w-0">
          <h1 className="t-headline truncate">Controle de Tarefas Familiar</h1>
          <p className="t-caption truncate text-muted-foreground">
            {capitalize(weekdayLabel(todayIso))}, {dayMonthLabel(todayIso)} ·
            placar de {monthLabel(todayIso)}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="t-label hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-soft sm:flex">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            <span className="t-numeric">{clockLabel(now)}</span>
          </span>

          <button
            type="button"
            onClick={onCycleTheme}
            title={`Tema: ${themePref === "auto" ? "automático (21h–7h)" : themePref === "night" ? "noturno" : "claro"}`}
            aria-label={`Trocar tema (agora: ${themePref === "auto" ? "automático" : themePref === "night" ? "noturno" : "claro"})`}
            className={cn(
              "focus grid size-11 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground",
            )}
          >
            <ThemeIcon className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={onToggleMode}
            title={
              mode === "wall"
                ? "Modo parede (textos grandes para o notebook)"
                : "Modo mão (compacto para o celular)"
            }
            aria-label="Alternar modo de exibição"
            className="focus hidden size-11 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground lg:grid"
          >
            {mode === "wall" ? (
              <Monitor className="size-5" aria-hidden />
            ) : (
              <Smartphone className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
