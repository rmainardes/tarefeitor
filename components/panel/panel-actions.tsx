"use client";

import {
  Handshake,
  Plus,
  Scale,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PanelActionKey = "extra" | "report" | "favor" | "task";

interface PanelActionsProps {
  /** `rail`: pilha no painel largo · `bar`: barra fixa no celular. */
  variant: "rail" | "bar";
  onAction: (key: PanelActionKey) => void;
  className?: string;
}

interface PanelAction {
  key: PanelActionKey;
  label: string;
  short: string;
  hint: string;
  icon: LucideIcon;
}

const ACTIONS: PanelAction[] = [
  {
    key: "extra",
    label: "Fiz um extra",
    short: "Extra",
    hint: "votado pelos outros dois",
    icon: Sparkles,
  },
  {
    key: "report",
    label: "Dedurando",
    short: "Dedurar",
    hint: "com defesa do acusado",
    icon: Scale,
  },
  {
    key: "favor",
    label: "Fiz para alguém",
    short: "Fiz para",
    hint: "rende ponto extra",
    icon: Handshake,
  },
  {
    key: "task",
    label: "Nova tarefa",
    short: "Nova",
    hint: "recorrência e peso",
    icon: Plus,
  },
];

/** Ações sempre visíveis do painel: os quatro fluxos da seção 8.1/10 (T07). */
export const PanelActions = ({ variant, onAction, className }: PanelActionsProps) => {
  return (
    <section
      aria-label="Ações do painel"
      className={cn(
        variant === "rail"
          ? "surface-card flex flex-col gap-2 p-4"
          : "safe-bottom border-t border-border bg-background/95 px-3 pt-2 backdrop-blur-md",
        className,
      )}
    >
      {variant === "rail" ? (
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="t-title">Lançar</h2>
        </header>
      ) : null}

      {variant === "rail" ? (
        <div className="flex flex-col gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => onAction(action.key)}
              className="focus group flex items-center gap-3 rounded-md border-2 border-dashed border-border-strong/70 px-3 py-2.5 text-left transition-all duration-200 hover:border-solid hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                <action.icon className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="t-label truncate">{action.label}</span>
                <span className="t-caption truncate text-muted-foreground">
                  {action.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => onAction(action.key)}
              className="focus flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground">
                <action.icon className="size-4" aria-hidden />
              </span>
              <span className="t-caption w-full truncate text-center">
                {action.short}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
