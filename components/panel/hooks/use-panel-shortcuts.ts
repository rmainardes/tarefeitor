"use client";

import { useEffect, useRef } from "react";

import type { PersonSlug } from "@/lib/panel/panel-types";

/** Ordem fixa das teclas 1/2/3 (seção 8.2) — não depende da ordem do placar. */
const SLUG_BY_KEY: Record<string, PersonSlug> = {
  "1": "pedro",
  "2": "vania",
  "3": "rodrigo",
};

interface UsePanelShortcutsOptions {
  /** Desativado enquanto um diálogo estiver aberto (seção 8.2). */
  enabled: boolean;
  tasksContainer: React.RefObject<HTMLElement | null>;
  onSelectPerson: (slug: PersonSlug) => void;
  onExtra: () => void;
  onReport: () => void;
  onFavor: () => void;
  onNewTask: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Atalhos de teclado do painel (seção 8.2), para que toda ação seja possível
 * sem toque: 1/2/3 trocam a pessoa, ↑/↓ navegam pelas tarefas (marcar/desfazer
 * usa o Espaço/Enter nativo do botão focado), E/D/F/N abrem os diálogos de
 * ação. Desativados com um campo de texto em foco ou um diálogo aberto.
 */
export function usePanelShortcuts({
  enabled,
  tasksContainer,
  onSelectPerson,
  onExtra,
  onReport,
  onFavor,
  onNewTask,
}: UsePanelShortcutsOptions) {
  const handlersRef = useRef({ onSelectPerson, onExtra, onReport, onFavor, onNewTask });

  useEffect(() => {
    handlersRef.current = { onSelectPerson, onExtra, onReport, onFavor, onNewTask };
  }, [onSelectPerson, onExtra, onReport, onFavor, onNewTask]);

  useEffect(() => {
    if (!enabled) return;

    const moveFocus = (direction: 1 | -1) => {
      const container = tasksContainer.current;
      if (!container) return;
      const items = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button[data-task-nav="true"]:not([disabled])'),
      );
      if (items.length === 0) return;

      const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        activeIndex === -1
          ? direction === 1
            ? 0
            : items.length - 1
          : (activeIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key;
      const slug = SLUG_BY_KEY[key];
      if (slug) {
        event.preventDefault();
        handlersRef.current.onSelectPerson(slug);
        return;
      }

      switch (key) {
        case "ArrowUp":
          event.preventDefault();
          moveFocus(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocus(1);
          break;
        case "e":
        case "E":
          event.preventDefault();
          handlersRef.current.onExtra();
          break;
        case "d":
        case "D":
          event.preventDefault();
          handlersRef.current.onReport();
          break;
        case "f":
        case "F":
          event.preventDefault();
          handlersRef.current.onFavor();
          break;
        case "n":
        case "N":
          event.preventDefault();
          handlersRef.current.onNewTask();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, tasksContainer]);
}
