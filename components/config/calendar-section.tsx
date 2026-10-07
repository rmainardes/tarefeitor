"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateCalendar } from "@/app/actions/calendar";
import { ActionButton } from "@/components/ui/action-button";
import type { ConfigPerson } from "./config-types";

interface CalendarSectionProps {
  people: ConfigPerson[];
  actorId: number;
  onChanged: () => void;
}

const inputClass =
  "focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground";

function PersonCalendarForm({
  person,
  actorId,
  onChanged,
}: {
  person: ConfigPerson;
  actorId: number;
  onChanged: () => void;
}) {
  const [icalUrl, setIcalUrl] = useState("");
  const [examKeywords, setExamKeywords] = useState(person.examKeywords.join(", "));
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const keywords = examKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    setIsPending(true);
    void (async () => {
      const result = await updateCalendar({
        personId: person.id,
        icalUrl: icalUrl.trim().length > 0 ? icalUrl.trim() : person.hasIcalUrl ? undefined : null,
        examKeywords: keywords,
        actorId,
      });
      setIsPending(false);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Agenda de ${person.name} atualizada.`);
      setIcalUrl("");
      onChanged();
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="t-label" style={{ color: person.color }}>
        {person.name}
      </h3>
      <p className="t-caption text-muted-foreground">
        {person.hasIcalUrl ? "✓ link iCal configurado." : "Sem link iCal configurado."} O link nunca é mostrado de
        volta aqui — ele fica só no servidor (seção 11).
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="t-label">
          {person.hasIcalUrl ? "Substituir o link iCal secreto" : "Link iCal secreto"}
        </span>
        <input
          type="url"
          value={icalUrl}
          onChange={(event) => setIcalUrl(event.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/…"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="t-label">Palavras-chave de prova (separadas por vírgula)</span>
        <input
          type="text"
          value={examKeywords}
          onChange={(event) => setExamKeywords(event.target.value)}
          placeholder="prova, avaliação"
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" variant="accent" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </ActionButton>
        {person.hasIcalUrl ? (
          <ActionButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (!window.confirm(`Remover o link iCal de ${person.name}?`)) return;
              setIsPending(true);
              void (async () => {
                const result = await updateCalendar({
                  personId: person.id,
                  icalUrl: null,
                  examKeywords: person.examKeywords,
                  actorId,
                });
                setIsPending(false);
                if (!result.ok) {
                  toast(result.message);
                  return;
                }
                toast(`Link iCal de ${person.name} removido.`);
                onChanged();
              })();
            }}
          >
            Remover link
          </ActionButton>
        ) : null}
      </div>
    </form>
  );
}

export function CalendarSection({ people, actorId, onChanged }: CalendarSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Agenda</h2>
      <p className="t-caption text-muted-foreground">
        Por decisão da casa, só Pedro e Rodrigo integram agenda (seção 2). O link é escrito aqui, mas nunca lido de
        volta ao navegador.
      </p>
      <div className="flex flex-col gap-3">
        {people.map((person) => (
          <PersonCalendarForm key={person.id} person={person} actorId={actorId} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
