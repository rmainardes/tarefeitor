"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { BirthdaysSection } from "./birthdays-section";
import { CalendarSection } from "./calendar-section";
import { DaysOffSection } from "./days-off-section";
import { ExportSection } from "./export-section";
import { LogSection } from "./log-section";
import { OverridesSection } from "./overrides-section";
import { SettingsSection } from "./settings-section";
import { TasksSection } from "./tasks-section";
import type { AuditLogRecord, BirthdayRecord, ConfigPerson, ConfigTaskRecord, DayOffRecord } from "./config-types";

interface ConfigViewProps {
  actor: { id: number; name: string } | undefined;
  people: ConfigPerson[];
  tasks: ConfigTaskRecord[];
  birthdays: BirthdayRecord[];
  daysOff: DayOffRecord[];
  settings: Record<string, unknown>;
  auditLog: AuditLogRecord[];
}

const TABS = [
  { key: "tasks", label: "Tarefas" },
  { key: "birthdays", label: "Aniversários" },
  { key: "calendar", label: "Agenda" },
  { key: "daysOff", label: "Folgas" },
  { key: "overrides", label: "Edição pontual" },
  { key: "settings", label: "Parâmetros" },
  { key: "export", label: "Exportar" },
  { key: "log", label: "Log" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Configurações (seção 8.6, T13): um ícone discreto, sem bloqueio técnico. */
export function ConfigView({ actor, people, tasks, birthdays, daysOff, settings, auditLog }: ConfigViewProps) {
  const [tab, setTab] = useState<TabKey>("tasks");
  const router = useRouter();

  const actorId = actor?.id ?? people[0]?.id ?? 0;
  const peopleNameById = new Map(people.map((person) => [person.id, person.name]));
  const onChanged = () => router.refresh();

  return (
    <div className="app-canvas flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 md:px-8">
          <Link
            href="/"
            className="focus grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
            aria-label="Voltar ao painel do dia"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>

          <div className="min-w-0">
            <h1 className="t-headline truncate">Configurações</h1>
            <p className="t-caption truncate text-muted-foreground">
              Editando como {actor?.name ?? "—"} · combinado da casa: só adultos
            </p>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1200px] gap-1.5 overflow-x-auto px-4 pb-3 md:px-8" aria-label="Seções">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={tab === item.key}
              className={cn(
                "focus t-caption shrink-0 rounded-full border px-3.5 py-2 transition-colors",
                tab === item.key
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-border-strong",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-8">
        {tab === "tasks" ? (
          <TasksSection people={people} tasks={tasks} actorId={actorId} onChanged={onChanged} />
        ) : null}
        {tab === "birthdays" ? (
          <BirthdaysSection birthdays={birthdays} actorId={actorId} onChanged={onChanged} />
        ) : null}
        {tab === "calendar" ? <CalendarSection people={people} actorId={actorId} onChanged={onChanged} /> : null}
        {tab === "daysOff" ? (
          <DaysOffSection people={people} tasks={tasks} daysOff={daysOff} actorId={actorId} onChanged={onChanged} />
        ) : null}
        {tab === "overrides" ? (
          <OverridesSection people={people} tasks={tasks} actorId={actorId} onChanged={onChanged} />
        ) : null}
        {tab === "settings" ? (
          <SettingsSection settings={settings} actorId={actorId} onChanged={onChanged} />
        ) : null}
        {tab === "export" ? <ExportSection /> : null}
        {tab === "log" ? <LogSection auditLog={auditLog} peopleNameById={peopleNameById} /> : null}
      </main>
    </div>
  );
}
