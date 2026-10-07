"use client";

import { useCallback, useRef, useState } from "react";
import { Lock } from "lucide-react";

import { spinPunishment } from "@/app/actions/month";
import { ConfettiBurst } from "@/components/ceremony/confetti-burst";
import { PrizeSection } from "@/components/ceremony/prize-section";
import { PunishmentRoulette } from "@/components/ceremony/punishment-roulette";
import { RevealStage, type Place } from "@/components/ceremony/reveal-stage";
import type { RankingEntry } from "@/lib/panel/ceremony-seed";

interface CeremonyViewProps {
  /** `YYYY-MM-01`. */
  month: string;
  actorId: number;
  ranking: RankingEntry[];
  initialPunishmentId: string | null;
}

/** Revelação do pódio e roleta do castigo de um mês fechado (T12). */
export function CeremonyView({ month, actorId, ranking, initialPunishmentId }: CeremonyViewProps) {
  const [revealed, setRevealed] = useState<Place[]>([]);
  const [confetti, setConfetti] = useState(0);
  const rouletteRef = useRef<HTMLDivElement | null>(null);

  const allRevealed = revealed.length === ranking.length;

  const reveal = useCallback((place: Place) => {
    setRevealed((current) => (current.includes(place) ? current : [...current, place]));
    if (place === 1) setConfetti((count) => count + 1);
  }, []);

  const goToRoulette = useCallback(() => {
    rouletteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleSpin = useCallback(async () => {
    const result = await spinPunishment({ month, actorId });
    if (!result.ok) throw new Error(result.message);
    return result.data.punishmentId;
  }, [month, actorId]);

  const thirdPlace = ranking.find((entry) => entry.rank === 3);

  return (
    <>
      <ConfettiBurst trigger={confetti} />

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
              <PunishmentRoulette
                thirdPlace={thirdPlace}
                initialPunishmentId={initialPunishmentId}
                onSpin={handleSpin}
              />
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
    </>
  );
}
