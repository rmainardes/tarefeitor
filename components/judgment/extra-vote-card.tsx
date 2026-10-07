"use client";

import { Check, Hourglass, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ExtraVoteView {
  id: string;
  authorId: number;
  authorName: string;
  description: string;
  whenLabel: string;
  votesNeeded: number;
  votes: { voterId: number; voterName: string; value: number }[];
  judged: boolean;
  /** Média dos votos já registrados; `null` sem nenhum voto ainda. */
  average: number | null;
}

interface ExtraVoteCardProps {
  extra: ExtraVoteView;
  actorId: number;
  extraMax: number;
  disabled: boolean;
  onVote: (value: number) => void;
}

/** Extra: os outros dois dão nota de 0 a `extraMax` (seção 7.7). */
export function ExtraVoteCard({ extra, actorId, extraMax, disabled, onVote }: ExtraVoteCardProps) {
  const isAuthor = actorId === extra.authorId;
  const myVote = extra.votes.find((vote) => vote.voterId === actorId);
  const scale = Array.from({ length: extraMax + 1 }, (_, value) => value);

  return (
    <li className="surface-card flex flex-col gap-2.5 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="t-caption inline-flex items-center gap-1.5 rounded-full border border-state-done/40 bg-state-done/12 px-2.5 py-0.5 text-state-done">
          <Sparkles className="size-3.5" aria-hidden />
          extra
        </span>
        <span className="t-label">{extra.authorName}</span>
        <span className="t-caption ml-auto text-muted-foreground">{extra.whenLabel}</span>
      </header>

      <p className="t-body">{extra.description}</p>

      <div className="flex flex-wrap items-center gap-2">
        {extra.votes.map((vote) => (
          <span
            key={vote.voterId}
            className="t-caption rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted-foreground"
          >
            {vote.voterName}: {vote.value}
          </span>
        ))}
        {extra.judged && extra.average !== null ? (
          <span className="t-caption inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary">
            <Check className="size-3.5" aria-hidden />
            julgado — média {extra.average.toFixed(1)}
          </span>
        ) : (
          <span className="t-caption inline-flex items-center gap-1 text-muted-foreground">
            <Hourglass className="size-3.5" aria-hidden />
            aguardando {extra.votesNeeded - extra.votes.length} de {extra.votesNeeded}
          </span>
        )}
      </div>

      {isAuthor ? (
        <p className="t-caption text-muted-foreground">Quem fez o extra não vota nele.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-label text-muted-foreground">Sua nota:</span>
          {scale.map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onVote(value)}
              aria-pressed={myVote?.value === value}
              className={cn(
                "focus grid size-9 place-items-center rounded-full border-2 font-bold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-55",
                myVote?.value === value
                  ? "border-transparent bg-primary text-primary-foreground shadow-card"
                  : "border-border bg-card text-foreground hover:border-primary",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
