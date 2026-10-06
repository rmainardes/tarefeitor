const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  /** Pode passar de 100 (seção 7.3); o traço do anel fica cheio nesse caso. */
  percent: number;
  color: string;
}

export function ProgressRing({ percent, color }: ProgressRingProps) {
  const filled = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - filled / 100);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
  );
}
