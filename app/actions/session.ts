"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { personExists } from "@/lib/data/people";
import { SELECTED_PERSON_COOKIE, SELECTED_PERSON_COOKIE_MAX_AGE } from "@/lib/session";
import { isPersonId } from "@/lib/validation";

/** Troca a pessoa selecionada neste dispositivo (seção 8.1). */
export async function selectPerson(personId: number): Promise<void> {
  if (!isPersonId(personId) || !(await personExists(personId))) return;

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PERSON_COOKIE, String(personId), {
    maxAge: SELECTED_PERSON_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/");
}
