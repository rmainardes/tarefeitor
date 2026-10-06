import type { LucideIcon } from "lucide-react";

export type PersonSlug = "pedro" | "vania" | "rodrigo";

export type TaskPeriod = "morning" | "afternoon" | "evening" | "anytime";

export type RecurrenceKind = "daily" | "weekly" | "monthly" | "exam_eve";

/** `pending` = sem linha no banco (pendente dentro do prazo). */
export type OccurrenceStatus =
  | "pending"
  | "done"
  | "missed"
  | "covered"
  | "excused";

export interface Person {
  id: number;
  slug: PersonSlug;
  name: string;
  isAdult: boolean;
  /** Espaço reservado para a foto real (`/people/<slug>.jpg`). */
  photoPath: string | null;
  /** `object-position` da foto — as fotos têm proporções muito diferentes. */
  photoFocus: string;
}

export interface Task {
  id: string;
  personSlug: PersonSlug;
  title: string;
  /** Mock: ícone do lucide-react. Dados reais: emoji gravado em `tasks.icon`. */
  icon: LucideIcon | string;
  /** Ilustração própria para tarefas peculiares (Everest, Pingo). */
  image?: string;
  period: TaskPeriod;
  weight: 1 | 2 | 3;
  /**
   * Só a seed mock preenche (orienta `panel-schedule.resolveDue`). Dados reais já
   * chegam com a data resolvida pelo servidor, então essa recorrência não é exposta.
   */
  kind?: RecurrenceKind;
  /** ISO 1 = segunda … 7 = domingo. */
  weekdays?: number[];
  monthDay?: number;
  /** Dias de antecedência para as tarefas mensais. */
  leadDays?: number;
}

export interface ScheduledTask {
  task: Task;
  dueDate: string;
  /** Mensal mostrada com antecedência mas ainda não vencida. Dados reais sempre `false` (sem fonte ainda). */
  upcoming: boolean;
  status: OccurrenceStatus;
  doneBy?: PersonSlug;
  note?: string;
}

/** Acumulado do mês até ontem: o painel soma por cima os dias em tela. */
export interface MonthBaseline {
  doneWeight: number;
  missedWeight: number;
  bonus: number;
  penalty: number;
  /** Dias consecutivos com 100% das próprias tarefas devidas. */
  streak: number;
}

export interface OccSeed {
  taskId: string;
  /** 0 = hoje, -1 = ontem. */
  dayOffset: number;
  status: OccurrenceStatus;
  doneBy?: PersonSlug;
  note?: string;
}

export interface JudgementItem {
  id: string;
  kind: "extra" | "report";
  /** Extras: quem fez. Deduradas: quem dedurou. */
  authorSlug: PersonSlug;
  /** Só nas deduradas. */
  accusedSlug?: PersonSlug;
  description: string;
  defense?: string;
  whenLabel: string;
  votesIn: number;
  votesNeeded: number;
}

/** Extra/dedurada reais ainda sem voto (seção 7.3). Nomes já resolvidos pelo servidor. */
export interface JudgementItemView {
  id: string;
  kind: "extra" | "report";
  /** Extras: quem fez. Deduradas: quem dedurou. */
  authorName: string;
  /** Só nas deduradas. */
  accusedName?: string;
  description: string;
  defense?: string;
  whenLabel: string;
  votesIn: number;
  votesNeeded: number;
}

export interface Birthday {
  id: string;
  name: string;
  day: number;
  month: number;
  birthYear?: number;
}

export interface PeriodMeta {
  key: TaskPeriod;
  label: string;
  window: string;
}
