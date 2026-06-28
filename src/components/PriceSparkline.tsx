import { useId } from "react";

type PriceSparklineProps = {
  points: number[];
  accent?: string;
  softAccent?: string;
  emptyLabel?: string;
};

export function PriceSparkline({
  points,
  accent = "#de7762",
  softAccent = "#f6dad2",
  emptyLabel = "",
}: PriceSparklineProps) {
  const gradientId = useId();

  if (points.length < 2) {
    return (
      <div
        className="flex h-16 items-center justify-center rounded-2xl bg-warm-50 text-xs text-warm-500"
        style={{ color: accent, backgroundColor: softAccent }}
      >
        {emptyLabel}
      </div>
    );
  }

  const width = 220;
  const height = 64;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(points.length - 1, 1);

  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * (height - 10) - 5;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => {
        const x = index * step;
        const y = height - ((point - min) / range) * (height - 10) - 5;
        return <circle key={`${index}-${point}`} cx={x} cy={y} r="2.5" fill={accent} />;
      })}
    </svg>
  );
}
