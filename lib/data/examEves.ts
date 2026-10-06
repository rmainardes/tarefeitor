// Sincronização de `exam_eves` (seção 7.5): guarda no banco as vésperas de
// prova calculadas a partir da agenda iCal, para que `resolvePersonOccurrences`
// (occurrenceResolution.ts) encontre a tarefa "estudar" no dia certo.

import { diffExamEves, type ExamEveRow } from "../domain/calendar";
import type { ISODate } from "../domain/dates";
import { getSupabaseAdmin } from "./supabaseAdmin";

interface ExamEveDbRow {
  eve_date: ISODate;
  exam_date: ISODate;
  event_uid: string;
  event_title: string;
}

function toExamEveRow(row: ExamEveDbRow): ExamEveRow {
  return { eveDate: row.eve_date, examDate: row.exam_date, eventUid: row.event_uid, eventTitle: row.event_title };
}

async function listFutureExamEves(personId: number, today: ISODate): Promise<ExamEveRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("exam_eves")
    .select("eve_date, exam_date, event_uid, event_title")
    .eq("person_id", personId)
    .gte("eve_date", today);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toExamEveRow);
}

/**
 * Insere vésperas futuras novas e remove vésperas futuras cujo evento sumiu
 * da agenda; nunca altera `eve_date` passadas (seção 7.5).
 */
export async function syncExamEves(
  personId: number,
  currentEves: readonly ExamEveRow[],
  today: ISODate,
): Promise<void> {
  const existingFuture = await listFutureExamEves(personId, today);
  const { toInsert, toDeleteEventUids } = diffExamEves(existingFuture, currentEves, today);

  const supabase = getSupabaseAdmin();

  if (toDeleteEventUids.length > 0) {
    const { error } = await supabase
      .from("exam_eves")
      .delete()
      .eq("person_id", personId)
      .gte("eve_date", today)
      .in("event_uid", toDeleteEventUids);

    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("exam_eves").insert(
      toInsert.map((row) => ({
        person_id: personId,
        eve_date: row.eveDate,
        exam_date: row.examDate,
        event_uid: row.eventUid,
        event_title: row.eventTitle,
      })),
    );

    if (error) throw new Error(error.message);
  }
}
