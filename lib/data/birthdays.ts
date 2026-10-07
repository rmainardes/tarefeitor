// Aniversários (seção 7.6/8.1): leitura dos aniversários do mês e cadastro.

import { getSupabaseAdmin } from "./supabaseAdmin";

export interface BirthdayRecord {
  id: string;
  name: string;
  day: number;
  month: number;
  birthYear: number | null;
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
