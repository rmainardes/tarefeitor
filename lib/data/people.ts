import { getSupabaseAdmin } from "./supabaseAdmin";

export async function personExists(personId: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("people")
    .select("id")
    .eq("id", personId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}

export interface PersonRecord {
  id: number;
  slug: string;
  name: string;
  isAdult: boolean;
  color: string;
  photoPath: string;
  photoFocus: string;
  /** `null` quando a pessoa não tem agenda ligada (seção 7.5: só Pedro e Rodrigo). */
  icalUrl: string | null;
  examKeywords: string[];
}

/** As três pessoas, ordenadas por id (seção 5: Pedro, Vania, Rodrigo). */
export async function listPeople(): Promise<PersonRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("people")
    .select("id, slug, name, is_adult, color, photo_path, photo_focus, ical_url, exam_keywords")
    .order("id");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isAdult: row.is_adult,
    color: row.color,
    photoPath: row.photo_path,
    photoFocus: row.photo_focus,
    icalUrl: row.ical_url,
    examKeywords: row.exam_keywords ?? [],
  }));
}
