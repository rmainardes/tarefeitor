"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateSettings } from "@/app/actions/settings";
import { ActionButton } from "@/components/ui/action-button";

interface SettingsSectionProps {
  settings: Record<string, unknown>;
  actorId: number;
  onChanged: () => void;
}

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

function numberSetting(settings: Record<string, unknown>, key: string, fallback: number): number {
  const value = settings[key];
  return typeof value === "number" ? value : fallback;
}

function quietHours(settings: Record<string, unknown>): { from: number; to: number } {
  const value = settings.quiet_hours;
  if (typeof value === "object" && value !== null) {
    const { from, to } = value as Record<string, unknown>;
    if (typeof from === "number" && typeof to === "number") return { from, to };
  }
  return { from: 22, to: 7 };
}

/** "Parâmetros" (seção 8.6): pontuação, som e horário de silêncio. */
export function SettingsSection({ settings, actorId, onChanged }: SettingsSectionProps) {
  const initialQuietHours = quietHours(settings);
  const [favorBonus, setFavorBonus] = useState(numberSetting(settings, "favor_bonus", 1));
  const [reportPenalty, setReportPenalty] = useState(numberSetting(settings, "report_penalty", 2));
  const [extraMax, setExtraMax] = useState(numberSetting(settings, "extra_max", 3));
  const [retroDeadlineHour, setRetroDeadlineHour] = useState(numberSetting(settings, "retro_deadline_hour", 23));
  const [monthlyLeadDays, setMonthlyLeadDays] = useState(numberSetting(settings, "monthly_lead_days", 3));
  const [soundEnabled, setSoundEnabled] = useState(settings.sound_enabled !== false);
  const [quietFrom, setQuietFrom] = useState(initialQuietHours.from);
  const [quietTo, setQuietTo] = useState(initialQuietHours.to);
  const [idleRotationSeconds, setIdleRotationSeconds] = useState(
    numberSetting(settings, "idle_rotation_seconds", 120),
  );
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsPending(true);
    void (async () => {
      const result = await updateSettings({
        favorBonus,
        reportPenalty,
        extraMax,
        retroDeadlineHour,
        monthlyLeadDays,
        soundEnabled,
        quietHoursFrom: quietFrom,
        quietHoursTo: quietTo,
        idleRotationSeconds,
        actorId,
      });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast("Parâmetros atualizados.");
      onChanged();
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Parâmetros</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="t-label">Pontuação</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Bônus &quot;fiz para&quot;</span>
              <input
                type="number"
                step="0.1"
                min={0}
                value={favorBonus}
                onChange={(event) => setFavorBonus(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Penalidade dedurada</span>
              <input
                type="number"
                step="0.1"
                min={0}
                value={reportPenalty}
                onChange={(event) => setReportPenalty(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Nota máxima do extra</span>
              <input
                type="number"
                step="1"
                min={0}
                value={extraMax}
                onChange={(event) => setExtraMax(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Antecedência mensal padrão</span>
              <input
                type="number"
                step="1"
                min={0}
                max={7}
                value={monthlyLeadDays}
                onChange={(event) => setMonthlyLeadDays(Number(event.target.value))}
                className={inputClass}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="t-label">Prazo</legend>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-muted-foreground">Prazo retroativo (hora de D+1)</span>
            <input
              type="number"
              step="1"
              min={0}
              max={23}
              value={retroDeadlineHour}
              onChange={(event) => setRetroDeadlineHour(Number(event.target.value))}
              className={`${inputClass} max-w-32`}
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="t-label">Som e silêncio</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            <span className="t-body">Som ativado</span>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Silêncio a partir de</span>
              <input
                type="number"
                step="1"
                min={0}
                max={23}
                value={quietFrom}
                onChange={(event) => setQuietFrom(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-muted-foreground">Até</span>
              <input
                type="number"
                step="1"
                min={0}
                max={23}
                value={quietTo}
                onChange={(event) => setQuietTo(Number(event.target.value))}
                className={inputClass}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="t-label">Modo painel (kiosk)</legend>
          <p className="t-caption text-muted-foreground">
            O modo deste dispositivo (parede × mão) e o tema fica no ícone do cabeçalho do Painel — é por
            dispositivo, não um parâmetro global.
          </p>
          <label className="flex flex-col gap-1.5 sm:max-w-xs">
            <span className="t-caption text-muted-foreground">Rotação ociosa (segundos)</span>
            <input
              type="number"
              step="1"
              min={10}
              value={idleRotationSeconds}
              onChange={(event) => setIdleRotationSeconds(Number(event.target.value))}
              className={inputClass}
            />
          </label>
        </fieldset>

        <ActionButton type="submit" variant="accent" size="wide" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar parâmetros"}
        </ActionButton>
      </form>
    </section>
  );
}
