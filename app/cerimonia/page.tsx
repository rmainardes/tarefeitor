"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  Lock,
  MoonStar,
  PartyPopper,
  Sun,
  SunMoon,
  Trophy,
  Vote,
} from "lucide-react";

import { ConfettiBurst } from "@/components/ceremony/confetti-burst";
import { PrizeSection } from "@/components/ceremony/prize-section";
import { PunishmentRoulette } from "@/components/ceremony/punishment-roulette";
import { RevealStage, type Place } from "@/components/ceremony/reveal-stage";
import { usePanelChrome } from "@/components/panel/hooks/use-panel-chrome";
import { monthSummary, ranking } from "@/lib/panel/ceremony-seed";

/**
 * Cerimônia do mês fechado (seção 7.7 do plano): revelação do 3º ao 1º,
 * pódio com medalhas, prêmios e a roleta do castigo do 3º lugar.
 *
 * Dados mock (T3 do porte): fechamento de mês e o sorteio da roleta ainda
 * não existem no servidor (T12 do plano). Julgamento (T11) já é real.
 */
export default function CerimoniaPage() {
  const { pref: themePref, cycleTheme } = usePanelChrome();
  const [revealed, setRevealed] = useState<Place[]>([]);
  const [confetti, setConfetti] = useState(0);
  const rouletteRef = useRef<HTMLDivElement | null>(null);

  const allRevealed = revealed.length === ranking.length;

  const reveal = useCallback((place: Place) => {
    setRevealed((current) =>
      current.includes(place) ? current : [...current, place],
    );
    if (place === 1) setConfetti((count) => count + 1);
  }, []);

  const goToRoulette = useCallback(() => {
    rouletteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const thirdPlace = ranking.find((entry) => entry.rank === 3);
  const ThemeIcon =
    themePref === "auto" ? SunMoon : themePref === "night" ? MoonStar : Sun;

  return (
    <div className="app-canvas flex min-h-screen flex-col bg-background">
      <ConfettiBurst trigger={confetti} />

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
            <h1 className="t-headline truncate">Cerimônia do mês</h1>
            <p className="t-caption truncate text-muted-foreground">
              {monthSummary.monthTitle} · {monthSummary.closedAtLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={cycleTheme}
            aria-label="Trocar tema"
            className="focus ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
          >
            <ThemeIcon className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-6 md:px-8">
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-soft">
          <span className="t-caption flex w-fit items-center gap-1.5 rounded-full border border-state-done/40 bg-state-done/12 px-3 py-1 text-state-done">
            <PartyPopper className="size-4" aria-hidden />
            mês fechado
          </span>

          <h2 className="t-display">O mês acabou. Hora do resultado.</h2>
          <p className="t-body max-w-[62ch] text-muted-foreground">
            Três participantes, um mês inteiro de tarefas, extras e deduradas. O
            1º lugar leva sorvete grande, o 2º leva sorvete pequeno e o 3º
            encara a roleta do castigo.
          </p>

          <ul className="mt-1 flex flex-wrap gap-2">
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <CalendarCheck className="size-4" aria-hidden />
              {monthSummary.closedAtLabel}
            </li>
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <Vote className="size-4" aria-hidden />
              {monthSummary.votesLabel}
            </li>
            <li className="t-caption flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted-foreground">
              <Lock className="size-4" aria-hidden />
              mês fechado é imutável
            </li>
          </ul>
        </section>

        <RevealStage
          entries={ranking}
          revealed={revealed}
          onReveal={reveal}
          onReset={() => setRevealed([])}
        />

        {allRevealed ? (
          <>
            <PrizeSection entries={ranking} onGoToRoulette={goToRoulette} />
            {thirdPlace ? (
              <div ref={rouletteRef} className="scroll-mt-24">
                <PunishmentRoulette thirdPlace={thirdPlace} />
              </div>
            ) : null}
          </>
        ) : (
          <p className="t-body flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/70 p-5 text-muted-foreground">
            <Lock className="size-5 shrink-0" aria-hidden />
            Os prêmios e a roleta do castigo aparecem depois da revelação do 1º
            lugar.
          </p>
        )}
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-8 md:px-8">
        <p className="t-caption flex items-center gap-2 text-muted-foreground">
          <Trophy className="size-4 shrink-0" aria-hidden />
          Hall da fama (próxima etapa): os meses anteriores com pódio, medalhas
          e castigo sorteado, para rever a cerimônia quando quiser.
        </p>
      </footer>
    </div>
  );
}
