import { badgeCatalog } from "@/lib/panel/ceremony-seed";
import { cn } from "@/lib/utils";

interface MonthMedalsProps {
  badges: string[];
  className?: string;
}

/** Medalhas conquistadas no mês (seção 7.4 do plano). */
export const MonthMedals = ({ badges, className }: MonthMedalsProps) => {
  if (badges.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap justify-center gap-1.5", className)}>
      {badges.map((code) => {
        const badge = badgeCatalog[code];
        if (!badge) return null;
        const Icon = badge.icon;
        return (
          <li
            key={code}
            className="t-caption inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/15 px-2.5 py-1 text-accent-strong"
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {badge.name}
          </li>
        );
      })}
    </ul>
  );
};
