import { people } from "@/lib/panel/panel-seed";
import type { Person, PersonSlug } from "./panel-types";

export const personBySlug = Object.fromEntries(
  people.map((person) => [person.slug, person]),
) as Record<PersonSlug, Person>;

export function personName(slug: PersonSlug | undefined): string {
  return slug ? personBySlug[slug].name : "";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}
