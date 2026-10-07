"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, Hourglass, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ConfettiBurst } from "@/components/ceremony/confetti-burst";
import { PersonAvatar } from "@/components/panel/person-avatar";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import { personBySlug } from "@/lib/panel/panel-people";
import {
  punishments,
  type Punishment,
  type RankingEntry,
} from "@/lib/panel/ceremony-seed";

const SPIN_MS = 4200;
const SPIN_EASING = "cubic-bezier(0.12, 0.82, 0.06, 1)";
const SECTOR = 360 / punishments.length;
/** Raio dos ícones, em % do diâmetro da roleta. */
const ICON_RADIUS = 33;

interface PunishmentRouletteProps {
  thirdPlace: RankingEntry;
  /** Já sorteado (revisita no Hall da fama): pula a roleta e mostra o resultado direto. */
  initialPunishmentId: string | null;
  /** Sorteio real, no servidor (seção 7.7: "só uma vez"). A animação só decora. */
  onSpin: () => Promise<string>;
  className?: string;
}

/**
 * "Escolha o seu castigo": roleta de três opções com as fotos de cada
 * personagem. O sorteio é sempre do servidor (`onSpin`); a roleta gira até o
 * resultado que ele devolveu, sem decidir nada no cliente.
 */
export const PunishmentRoulette = ({
  thirdPlace,
  initialPunishmentId,
  onSpin,
  className,
}: PunishmentRouletteProps) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Punishment | null>(
    () => punishments.find((punishment) => punishment.id === initialPunishmentId) ?? null,
  );
  const [confetti, setConfetti] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    let punishmentId: string;
    try {
      punishmentId = await onSpin();
    } catch {
      setSpinning(false);
      toast("Não foi possível sortear o castigo. Tente de novo.");
      return;
    }

    const index = Math.max(0, punishments.findIndex((punishment) => punishment.id === punishmentId));
    const sectorCenter = index * SECTOR + SECTOR / 2;
    const base = Math.ceil(rotation / 360) * 360;
    const target = base + 360 * 5 + (360 - sectorCenter);
    setRotation(target);

    timer.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(punishments[index]);
      setConfetti((count) => count + 1);
    }, SPIN_MS);
  };

  const thirdPerson = personBySlug[thirdPlace.slug];
  const wheelBackground = `conic-gradient(from 0deg,
    hsl(var(--primary)) 0deg ${SECTOR}deg,
    hsl(var(--accent)) ${SECTOR}deg ${SECTOR * 2}deg,
    hsl(var(--state-covered)) ${SECTOR * 2}deg 360deg)`;

  return (
    <section
      id="roleta-do-castigo"
      className={cn("flex flex-col gap-4", className)}
      aria-label="Roleta do castigo"
    >
      <ConfettiBurst trigger={confetti} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-display">Escolha o seu castigo</h2>
          <p className="t-label text-muted-foreground">
            {thirdPerson.name} ficou em 3º lugar e gira a roleta.
          </p>
        </div>
        <span
          data-person={thirdPlace.slug}
          className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-4 shadow-soft"
        >
          <PersonAvatar person={thirdPerson} className="w-9" />
          <span className="t-label text-person-active-text">3º lugar</span>
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-5 rounded-lg border border-border bg-card p-6 shadow-soft">
          <div className="relative aspect-square w-64 sm:w-72 lg:w-full lg:max-w-[20rem]">
            <span
              aria-hidden
              className="absolute left-1/2 top-[-10px] z-20 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-foreground drop-shadow"
            />

            <div
              className="absolute inset-0 rounded-full border-4 border-card shadow-float"
              style={{
                transform: `rotate(${rotation}deg)`,
                background: wheelBackground,
                transition: `transform ${SPIN_MS}ms ${SPIN_EASING}`,
              }}
            >
              {punishments.map((punishment, index) => {
                const angle = index * SECTOR + SECTOR / 2;
                const radians = (angle * Math.PI) / 180;
                const left = 50 + ICON_RADIUS * Math.sin(radians);
                const top = 50 - ICON_RADIUS * Math.cos(radians);
                const Icon = punishment.icon;
                return (
                  <span
                    key={punishment.id}
                    className="absolute"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: `translate(-50%, -50%) rotate(${-angle - rotation}deg)`,
                      transition: `transform ${SPIN_MS}ms ${SPIN_EASING}`,
                    }}
                  >
                    <span
                      className={cn(
                        "grid size-11 place-items-center rounded-full bg-card text-foreground shadow-card",
                        result?.id === punishment.id && "ring-4 ring-accent",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                  </span>
                );
              })}
            </div>

            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-card bg-surface-2 text-foreground shadow-card">
              {spinning ? (
                <Hourglass className="size-6 animate-breathe" aria-hidden />
              ) : (
                <Sparkles className="size-6" aria-hidden />
              )}
            </span>
          </div>

          <ActionButton
            variant="person"
            size="wide"
            onClick={spin}
            disabled={spinning}
            aria-live="polite"
          >
            {spinning ? (
              <>
                <Hourglass className="size-5" aria-hidden />
                Sorteando…
              </>
            ) : (
              <>
                <RotateCcw className="size-5" aria-hidden />
                {result ? "Girar de novo" : "Girar a roleta"}
              </>
            )}
          </ActionButton>
        </div>

        <div className="flex flex-col gap-4">
          {result ? (
            <ResultCard punishment={result} />
          ) : (
            <p className="t-body flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/70 p-5 text-muted-foreground">
              <CircleHelp className="size-5 shrink-0" aria-hidden />
              Gire a roleta para sortear o castigo do mês.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {punishments.map((punishment) => {
              const isResult = result?.id === punishment.id;
              return (
                <li
                  key={punishment.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-2.5 transition-colors",
                    isResult
                      ? "animate-reveal-flip border-accent bg-accent/10"
                      : "border-border bg-card",
                  )}
                >
                  <PunishmentPhoto
                    punishment={punishment}
                    className="h-14 w-14"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="t-label">{punishment.label}</span>
                    <span className="t-caption text-muted-foreground">
                      com {punishment.personName} · {punishment.detail}
                    </span>
                  </span>
                  {isResult ? (
                    <span className="t-caption stamp shrink-0 rounded-full border border-accent bg-accent px-3 py-1 text-accent-foreground">
                      sorteado
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

const PunishmentPhoto = ({
  punishment,
  className,
}: {
  punishment: Punishment;
  className?: string;
}) => (
  <span
    className={cn(
      "grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2",
      className,
    )}
  >
    <img
      src={punishment.image}
      alt={`Foto: ${punishment.personName}`}
      crossOrigin="anonymous"
      loading="lazy"
      className="size-full object-cover"
      style={{ objectPosition: punishment.photoFocus }}
    />
  </span>
);

const ResultCard = ({ punishment }: { punishment: Punishment }) => {
  const Icon = punishment.icon;
  return (
    <article className="flex animate-reveal-flip items-stretch gap-4 rounded-lg border-2 border-accent bg-accent/[0.08] p-4 shadow-card">
      <PunishmentPhoto punishment={punishment} className="h-36 w-28" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5" data-person="pedro">
        <span className="t-caption flex items-center gap-1.5 text-accent-strong">
          <Icon className="size-4" aria-hidden />
          castigo do mês · com {punishment.personName}
        </span>
        <h3 className="t-headline">{punishment.label}</h3>
        <p className="t-body text-muted-foreground">{punishment.detail}</p>
        <span className="t-caption mt-auto w-fit rounded-full border border-accent/60 bg-accent/15 px-3 py-1 text-accent-strong">
          sorteio registrado no mês fechado
        </span>
      </div>
    </article>
  );
};
