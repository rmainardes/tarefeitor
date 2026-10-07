"use client";

import { useState } from "react";
import { Check, Gavel, Hourglass, ShieldAlert } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";

export interface ReportVoteView {
  id: string;
  authorId: number;
  authorName: string;
  accusedId: number;
  accusedName: string;
  description: string;
  defense: string | null;
  /** Contestação ("não fez direito"): se procedente, a ocorrência vira "não cumprida" (seção 7.3). */
  isContestation: boolean;
  whenLabel: string;
  votesNeeded: number;
  votes: { voterId: number; voterName: string; value: number }[];
  judged: boolean;
  upheld: boolean | null;
}

interface ReportVoteCardProps {
  report: ReportVoteView;
  actorId: number;
  disabled: boolean;
  onVote: (value: number) => void;
  onSaveDefense: (defense: string) => void;
}

const MAX_DEFENSE = 280;

/** Dedurada: o acusado pode escrever defesa; os três votam procede (1) ou improcedente (0) — seção 7.7. */
export function ReportVoteCard({ report, actorId, disabled, onVote, onSaveDefense }: ReportVoteCardProps) {
  const [draftDefense, setDraftDefense] = useState(report.defense ?? "");
  const isAccused = actorId === report.accusedId;
  const myVote = report.votes.find((vote) => vote.voterId === actorId);
  const defenseChanged = draftDefense.trim() !== (report.defense ?? "").trim();

  return (
    <li className="surface-card flex flex-col gap-2.5 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="t-caption inline-flex items-center gap-1.5 rounded-full border border-state-missed/40 bg-state-missed/12 px-2.5 py-0.5 text-state-missed">
          <Gavel className="size-3.5" aria-hidden />
          dedurada
        </span>
        <span className="t-label">{report.accusedName}</span>
        <span className="t-caption text-muted-foreground">dedurado(a) por {report.authorName}</span>
        <span className="t-caption ml-auto text-muted-foreground">{report.whenLabel}</span>
      </header>

      <p className="t-body">{report.description}</p>

      {report.isContestation ? (
        <p className="t-caption flex items-center gap-1.5 text-muted-foreground">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          Contestação de tarefa concluída: se procedente, a tarefa vira &ldquo;não cumprida&rdquo;.
        </p>
      ) : null}

      {report.defense ? (
        <p className="t-caption rounded-md border-l-4 border-primary/50 bg-surface px-3 py-2 italic text-muted-foreground">
          “{report.defense}”
        </p>
      ) : null}

      {isAccused ? (
        <label className="flex flex-col gap-1.5">
          <span className="t-label">Sua defesa (opcional)</span>
          <textarea
            value={draftDefense}
            onChange={(event) => setDraftDefense(event.target.value.slice(0, MAX_DEFENSE))}
            rows={2}
            placeholder="O que você tem a dizer?"
            className="focus t-body rounded-md border border-border bg-surface p-2.5 text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="t-caption text-muted-foreground">
              {draftDefense.length}/{MAX_DEFENSE}
            </span>
            <ActionButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || !defenseChanged}
              onClick={() => onSaveDefense(draftDefense.trim())}
            >
              Salvar defesa
            </ActionButton>
          </div>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {report.votes.map((vote) => (
          <span
            key={vote.voterId}
            className="t-caption rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted-foreground"
          >
            {vote.voterName}: {vote.value === 1 ? "procede" : "improcedente"}
          </span>
        ))}
        {report.judged ? (
          <span
            className={cn(
              "t-caption inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
              report.upheld
                ? "border-state-missed/40 bg-state-missed/12 text-state-missed"
                : "border-state-done/40 bg-state-done/12 text-state-done",
            )}
          >
            <Check className="size-3.5" aria-hidden />
            julgado — {report.upheld ? "procedente" : "improcedente"}
          </span>
        ) : (
          <span className="t-caption inline-flex items-center gap-1 text-muted-foreground">
            <Hourglass className="size-3.5" aria-hidden />
            aguardando {report.votesNeeded - report.votes.length} de {report.votesNeeded}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="t-label text-muted-foreground">Seu voto:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onVote(1)}
          aria-pressed={myVote?.value === 1}
          className={cn(
            "focus rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-55",
            myVote?.value === 1
              ? "border-transparent bg-state-missed text-white shadow-card"
              : "border-border bg-card text-foreground hover:border-state-missed",
          )}
        >
          Procede
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onVote(0)}
          aria-pressed={myVote?.value === 0}
          className={cn(
            "focus rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-55",
            myVote?.value === 0
              ? "border-transparent bg-state-done text-white shadow-card"
              : "border-border bg-card text-foreground hover:border-state-done",
          )}
        >
          Improcedente
        </button>
      </div>
    </li>
  );
}
