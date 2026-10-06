"use client";

import { useCallback, useEffect, useState } from "react";

import { people } from "@/lib/panel/panel-seed";
import type { PersonSlug } from "@/lib/panel/panel-types";

const COOKIE_NAME = "selected_person";
const ONE_YEAR = 60 * 60 * 24 * 365;

function isSlug(value: string | undefined): value is PersonSlug {
  return people.some((person) => person.slug === value);
}

/** Lê o cookie do dispositivo; cai no primeiro da casa se não houver escolha. */
export function readSelectedPerson(): PersonSlug | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  return isSlug(raw) ? raw : null;
}

export function writeSelectedPerson(slug: PersonSlug): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${slug}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

/**
 * Pessoa selecionada neste aparelho: define ao mesmo tempo o que se vê e
 * em nome de quem se age (seção 8.1 do plano).
 */
export function useSelectedPerson() {
  const [selected, setSelected] = useState<PersonSlug>(
    () => readSelectedPerson() ?? people[0].slug,
  );

  useEffect(() => {
    writeSelectedPerson(selected);
  }, [selected]);

  const select = useCallback((slug: PersonSlug) => setSelected(slug), []);

  const selectedPerson =
    people.find((person) => person.slug === selected) ?? people[0];

  return { selected, selectedPerson, select };
}
