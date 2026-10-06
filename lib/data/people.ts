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
  color: string;
  photoPath: string;
  photoFocus: string;
}

/** As três pessoas, ordenadas por id (seção 5: Pedro, Vania, Rodrigo). */
export async function listPeople(): Promise<PersonRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("people")
    .select("id, slug, name, color, photo_path, photo_focus")
    .order("id");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color,
    photoPath: row.photo_path,
    photoFocus: row.photo_focus,
  }));
}
