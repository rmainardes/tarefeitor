"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface ConfettiBurstProps {
  /** Muda a cada disparo: 0 (ou falsy) não desenha nada. */
  trigger: number;
  className?: string;
}

const COLORS = [
  "hsl(var(--person-pedro))",
  "hsl(var(--person-vania))",
  "hsl(var(--person-rodrigo))",
  "hsl(var(--accent))",
];

interface ConfettiPiece {
  id: string;
  left: number;
  size: number;
  drift: number;
  delay: number;
  duration: number;
  color: string;
  round: boolean;
}

/** Usa `Math.random` — por isso fica fora do render (`useMemo` precisa ser puro). */
function generatePieces(trigger: number): ConfettiPiece[] {
  return Array.from({ length: 80 }, (_, index) => ({
    id: `${trigger}-${index}`,
    left: Math.random() * 100,
    size: 6 + Math.random() * 9,
    drift: (Math.random() - 0.5) * 220,
    delay: Math.random() * 0.7,
    duration: 2.6 + Math.random() * 1.8,
    color: COLORS[index % COLORS.length],
    round: index % 3 === 0,
  }));
}

/**
 * Confete em CSS puro — sem dependência externa. Respeita
 * `prefers-reduced-motion` (as animações são neutralizadas no CSS global).
 */
export const ConfettiBurst = ({ trigger, className }: ConfettiBurstProps) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  // Sorteio (Math.random) não pode rodar durante o render; por isso fica no efeito.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!trigger) return;
    setPieces(generatePieces(trigger));
  }, [trigger]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!trigger) return null;

  return (
    <div
      key={trigger}
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-50 overflow-hidden",
        className,
      )}
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-[-6vh] block animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 1.8,
            backgroundColor: piece.color,
            borderRadius: piece.round ? "999px" : "2px",
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--drift" as string]: `${piece.drift}px`,
          }}
        />
      ))}
    </div>
  );
};
