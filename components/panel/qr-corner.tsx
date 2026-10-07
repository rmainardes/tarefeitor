"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface QrCornerProps {
  className?: string;
}

/**
 * QR code discreto do modo painel (seção 8.3), para abrir no celular. O SVG
 * é estático em `/public/qr.svg` (seção 3: a URL é fixa) — só existe depois
 * do deploy (T16), quando a URL real é conhecida. Até lá, some sozinho.
 */
export const QrCorner = ({ className }: QrCornerProps) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <a
      href="/qr.svg"
      target="_blank"
      rel="noreferrer"
      title="Abrir o painel no celular"
      aria-label="Abrir o painel no celular"
      className={cn(
        "focus fixed bottom-3 left-3 z-20 grid size-14 place-items-center rounded-md border border-border/60 bg-card/80 p-1.5 opacity-35 shadow-soft backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <img
        src="/qr.svg"
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        className="size-full object-contain"
      />
    </a>
  );
};
