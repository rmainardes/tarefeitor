// Versionamento de tarefas (seção 6, nota "Versionamento de tarefas", T13).
// Função pura: decide se uma edição pode ser feita no lugar ou precisa
// encerrar a versão atual e abrir uma nova, para nunca reescrever o passado.

import type { ISODate } from "./dates";
import type { RecurrenceKind } from "./recurrence";

export interface TaskVersionFields {
  personId: number;
  weight: number;
  kind: RecurrenceKind;
  weekdays: number[] | null;
  monthDay: number | null;
  onceDate: ISODate | null;
  leadDays: number;
}

function sameWeekdays(a: number[] | null, b: number[] | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/**
 * `true` quando `next` muda peso, recorrência (tipo, dias, dia do mês, data
 * única, antecedência) ou responsável em relação a `current` — qualquer uma
 * dessas edições encerra a versão atual (`valid_to = ontem`) e cria uma nova
 * (`valid_from = hoje`). Título, figura e ordem nunca chegam aqui: são
 * sempre edição no lugar.
 */
export function needsNewTaskVersion(current: TaskVersionFields, next: TaskVersionFields): boolean {
  if (current.personId !== next.personId) return true;
  if (current.weight !== next.weight) return true;
  if (current.kind !== next.kind) return true;
  if (current.monthDay !== next.monthDay) return true;
  if (current.onceDate !== next.onceDate) return true;
  if (current.leadDays !== next.leadDays) return true;
  if (!sameWeekdays(current.weekdays, next.weekdays)) return true;
  return false;
}
