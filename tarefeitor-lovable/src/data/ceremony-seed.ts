/**
 * Cerimônia do mês fechado (seção 7.7 do plano).
 * `month_scores` já congelado: nada aqui muda depois do fechamento.
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
  Star,
  type LucideIcon,
} from "lucide-react";

import type { PersonSlug } from "@/lib/panel-types";

export interface MonthSummary {
  monthIso: string;
  monthTitle: string;
  closedAtLabel: string;
  votesLabel: string;
}

export const monthSummary: MonthSummary = {
  monthIso: "2026-10-01",
  monthTitle: "outubro de 2026",
  closedAtLabel: "fechado em 31 de outubro, às 22h12",
  votesLabel: "todos os votos registrados",
};

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

export const ranking: RankingEntry[] = [
  {
    slug: "vania",
    rank: 1,
    total: 99.4,
    taskPct: 94.4,
    bonus: 5,
    penalty: 0,
    streak: 12,
    badges: ["hotel_bed", "helping_hand", "clean_record"],
  },
  {
    slug: "rodrigo",
    rank: 2,
    total: 88.9,
    taskPct: 89.9,
    bonus: 3,
    penalty: 4,
    streak: 3,
    badges: ["sherpa"],
  },
  {
    slug: "pedro",
    rank: 3,
    total: 87.0,
    taskPct: 84.5,
    bonus: 4,
    penalty: 2,
    streak: 5,
    badges: ["pingo_bff", "perfect_week"],
  },
];

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
    image: "/punishments/arlete.jpg",
    photoFocus: "50% 10%",
    icon: Church,
  },
  {
    id: "nonna",
    label: "Colocar todos os casacos que a Nonna mandar",
    detail: "todos, sem discussão",
    personName: "Nonna",
    image: "/punishments/nonna.jpg",
    photoFocus: "50% 28%",
    icon: Shirt,
  },
  {
    id: "vanderlei",
    label: "Lixar dois armários com o Vanderlei",
    detail: "lixa, pano e paciência",
    personName: "Vanderlei",
    image: "/punishments/vanderlei.jpg",
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
