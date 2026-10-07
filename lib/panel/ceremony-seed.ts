/**
 * Cerimônia do mês fechado (seção 7.7 do plano).
 * `month_scores` já congelado: nada aqui muda depois do fechamento.
 *
 * `badgeCatalog`, `punishments` e `prizes` são catálogos fixos (vocabulário
 * visual da seção 9, decisões 16-17 da seção 2) — não mudam de mês a mês, por
 * isso continuam como dados estáticos aqui, usados pelos componentes de
 * `components/ceremony` com dados reais vindos de `/cerimonia/[month]`.
 */
import {
  BedDouble,
  Church,
  Dog,
  Hammer,
  Handshake,
  IceCreamBowl,
  IceCreamCone,
  Mountain,
  ShieldCheck,
  Shirt,
  Siren,
  Star,
  type LucideIcon,
} from "lucide-react";

import type { PersonSlug } from "@/lib/panel/panel-types";

export interface BadgeDefinition {
  code: string;
  name: string;
  icon: LucideIcon;
}

export const badgeCatalog: Record<string, BadgeDefinition> = {
  hotel_bed: { code: "hotel_bed", name: "Cama de hotel", icon: BedDouble },
  sherpa: { code: "sherpa", name: "Sherpa do Everest", icon: Mountain },
  pingo_bff: { code: "pingo_bff", name: "Melhor amigo do Pingo", icon: Dog },
  perfect_week: { code: "perfect_week", name: "Semana perfeita", icon: Star },
  helping_hand: { code: "helping_hand", name: "Mão na roda", icon: Handshake },
  clean_record: {
    code: "clean_record",
    name: "Ficha limpa",
    icon: ShieldCheck,
  },
  snitch: { code: "snitch", name: "X-9 do mês", icon: Siren },
};

export interface RankingEntry {
  slug: PersonSlug;
  rank: 1 | 2 | 3;
  total: number;
  /** % do possível das tarefas. */
  taskPct: number;
  bonus: number;
  penalty: number;
  streak: number;
  badges: string[];
}

export interface Punishment {
  id: string;
  label: string;
  detail: string;
  personName: string;
  image: string;
  photoFocus: string;
  icon: LucideIcon;
}

/**
 * As três opções da roleta. A foto da tia Arlete é pequena (228×791),
 * por isso o quadro dela é menor na interface.
 */
export const punishments: Punishment[] = [
  {
    id: "arlete",
    label: "Rezar o terço com a tia Arlete",
    detail: "um terço inteiro, sem pressa",
    personName: "Tia Arlete",
    image: "/punishments/Arlete.jpeg",
    photoFocus: "50% 10%",
    icon: Church,
  },
  {
    id: "nonna",
    label: "Colocar todos os casacos que a Nonna mandar",
    detail: "todos, sem discussão",
    personName: "Nonna",
    image: "/punishments/Nonna.jpeg",
    photoFocus: "50% 28%",
    icon: Shirt,
  },
  {
    id: "vanderlei",
    label: "Lixar dois armários com o Vanderlei",
    detail: "lixa, pano e paciência",
    personName: "Vanderlei",
    image: "/punishments/Vanderlei.jpeg",
    photoFocus: "50% 24%",
    icon: Hammer,
  },
];

export interface Prize {
  rank: 1 | 2;
  title: string;
  detail: string;
  icon: LucideIcon;
  portion: "grande" | "pequeno";
}

export const prizes: Prize[] = [
  {
    rank: 1,
    title: "Sorvete grande",
    detail: "duas bolas, calda e cobertura",
    icon: IceCreamBowl,
    portion: "grande",
  },
  {
    rank: 2,
    title: "Sorvete pequeno",
    detail: "uma bola, sem protesto",
    icon: IceCreamCone,
    portion: "pequeno",
  },
];
