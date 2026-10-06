"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/panel/panel-people";
import type { Person } from "@/lib/panel/panel-types";

interface PersonAvatarProps {
  person: Person;
  /** Quando informado, desenha o anel de progresso (% do possível). */
  pct?: number | null;
  /** Espessura do anel, em unidades do viewBox (0–100). */
  ringWidth?: number;
  className?: string;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Avatar com foto (espaço reservado em `/people/<slug>.jpg`) e anel de
 * progresso. Sem foto, mostra o monograma na cor da pessoa.
 */
export const PersonAvatar = ({
  person,
  pct = null,
  ringWidth = 6,
  className,
}: PersonAvatarProps) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasRing = pct !== null;
  const showPhoto = Boolean(person.photoPath) && !photoFailed;

  return (
    <div
      data-person={person.slug}
      className={cn("relative aspect-square shrink-0", className)}
      role={hasRing ? "img" : undefined}
      aria-label={
        hasRing
          ? `${person.name}: ${Math.round(pct ?? 0)}% do possível`
          : undefined
      }
    >
      {hasRing ? (
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={ringWidth}
            className="text-border"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={ringWidth}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={
              CIRCUMFERENCE * (1 - Math.min(Math.max(pct ?? 0, 0), 100) / 100)
            }
            className="text-person-active transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
      ) : null}

      <div
        className={cn(
          "absolute overflow-hidden rounded-full bg-person-active text-person-foreground shadow-soft",
          hasRing ? "inset-[11%]" : "inset-0",
        )}
      >
        {showPhoto ? (
          <img
            src={person.photoPath ?? undefined}
            alt={person.name}
            crossOrigin="anonymous"
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="size-full object-cover"
            style={{ objectPosition: person.photoFocus }}
          />
        ) : (
          <svg viewBox="0 0 100 100" aria-hidden className="size-full">
            <text
              x="50"
              y="52"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="42"
              fontWeight="700"
              letterSpacing="-2"
              fill="currentColor"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {initialsOf(person.name)}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
};
