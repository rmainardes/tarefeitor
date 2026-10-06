import Link from "next/link";

export type DayTab = "today" | "yesterday";

interface DayTabsProps {
  active: DayTab;
  /** "Ontem" só aparece enquanto o prazo retroativo estiver aberto (seção 8.1). */
  showYesterday: boolean;
}

export function DayTabs({ active, showYesterday }: DayTabsProps) {
  if (!showYesterday) return null;

  return (
    <nav aria-label="Dia" className="flex gap-4 text-base">
      <Tab href="/" label="Hoje" isActive={active === "today"} />
      <Tab href="/?day=yesterday" label="Ontem" isActive={active === "yesterday"} />
    </nav>
  );
}

function Tab({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="font-display"
      style={{
        color: isActive ? "hsl(var(--foreground))" : "color-mix(in srgb, hsl(var(--foreground)) 50%, transparent)",
        textDecoration: isActive ? "underline" : "none",
        textUnderlineOffset: "4px",
      }}
    >
      {label}
    </Link>
  );
}
