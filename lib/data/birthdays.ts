// Aniversários (seção 7.6/8.1/8.6): leitura dos aniversários do mês, cadastro
// pelo Painel e edição/exclusão pela tela de Configurações (T13).

import { getSupabaseAdmin } from "./supabaseAdmin";

export interface BirthdayRecord {
  id: string;
  name: string;
  day: number;
  month: number;
  birthYear: number | null;
}

/** Todos os aniversários, ordenados por mês e dia (tela de Configurações). */
export async function listAllBirthdays(): Promise<BirthdayRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("birthdays")
    .select("id, name, day, month, birth_year")
    .order("month")
    .order("day");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    day: row.day,
    month: row.month,
    birthYear: row.birth_year,
  }));
}

/** Aniversários de `month` (1-12), ordenados por dia (seção 7.6). */
export async function listBirthdaysForMonth(month: number): Promise<BirthdayRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("birthdays")
    .select("id, name, day, month, birth_year")
    .eq("month", month)
    .order("day");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    day: row.day,
    month: row.month,
    birthYear: row.birth_year,
  }));
}

export interface NewBirthdayInput {
  name: string;
  day: number;
  month: number;
  birthYear: number | null;
}

/** Cadastra um aniversário (seção 8.1: nome, dia, mês, ano opcional). */
export async function insertBirthday(input: NewBirthdayInput): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("birthdays")
    .insert({ name: input.name, day: input.day, month: input.month, birth_year: input.birthYear })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export interface UpdateBirthdayInput extends NewBirthdayInput {
  id: string;
}

/** Edita um aniversário (seção 8.6: `upsertBirthday`). */
export async function updateBirthday(input: UpdateBirthdayInput): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("birthdays")
    .update({ name: input.name, day: input.day, month: input.month, birth_year: input.birthYear })
    .eq("id", input.id);

  if (error) throw new Error(error.message);
}

/** Remove um aniversário (seção 8.6/10: `deleteBirthday`). */
export async function deleteBirthday(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("birthdays").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function findBirthday(id: string): Promise<BirthdayRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("birthdays")
    .select("id, name, day, month, birth_year")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, name: data.name, day: data.day, month: data.month, birthYear: data.birth_year };
}
