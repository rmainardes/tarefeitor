"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Diálogo simples em CSS puro — sem dependência de Radix. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full max-w-md animate-pop-in flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-float",
          className,
        )}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="t-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="focus grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
