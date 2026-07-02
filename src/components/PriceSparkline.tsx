type PriceSparklineProps = {
  points: number[];
  referenceValue?: number | null;
  referenceLabel?: string;
  currentLabel?: string;
  startLabel?: string;
  endLabel?: string;
  accent?: string;
  softAccent?: string;
  emptyLabel?: string;
};

export function PriceSparkline({
  points,
  referenceValue = null,
  referenceLabel,
  currentLabel = "Current",
  startLabel = "Start",
  endLabel = "Today",
  accent = "#de7762",
  softAccent = "#f6dad2",
  emptyLabel = "",
}: PriceSparklineProps) {
  const validPoints = points.filter((point) => Number.isFinite(point));
  const scaleValues = [...validPoints];
  if (referenceValue !== null && Number.isFinite(referenceValue)) {
    scaleValues.push(referenceValue);
  }

  if (validPoints.length < 2) {
    return (
      <div
        className="flex min-h-[132px] items-center justify-center rounded-[22px] border border-dashed border-warm-200 bg-warm-50 px-4 text-center text-xs leading-5 text-warm-500"
        style={{ color: accent, backgroundColor: softAccent }}
      >
        {emptyLabel}
      </div>
    );
  }

  const width = 360;
  const height = 132;
  const paddingX = 12;
  const paddingTop = 14;
  const paddingBottom = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const min = Math.min(...scaleValues);
  const max = Math.max(...scaleValues);
  const range = Math.max(max - min, 1);
  const step = innerWidth / Math.max(validPoints.length - 1, 1);

  const getY = (value: number) => height - paddingBottom - ((value - min) / range) * innerHeight;
  const getX = (index: number) => paddingX + index * step;

  const referenceY = referenceValue !== null && Number.isFinite(referenceValue) ? getY(referenceValue) : null;
  const lastPoint = validPoints.at(-1) ?? null;
  const lastPointX = getX(validPoints.length - 1);
  const lastPointY = lastPoint !== null ? getY(lastPoint) : null;

  const path = validPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(index).toFixed(1)} ${getY(point).toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L ${paddingX + innerWidth} ${height - paddingBottom} L ${paddingX} ${height - paddingBottom} Z`;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-warm-500">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[140px] w-full rounded-[24px] bg-surface-alt p-1" role="img" aria-label={referenceLabel ?? "Price history"}>
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = paddingTop + innerHeight * ratio;
          return <line key={ratio} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="rgba(126, 106, 100, 0.07)" strokeWidth="1" />;
        })}
        <line x1={paddingX} x2={width - paddingX} y1={height - paddingBottom} y2={height - paddingBottom} stroke="rgba(126, 106, 100, 0.1)" strokeWidth="1.1" />

        {referenceY !== null ? (
          <line
            x1={paddingX}
            x2={width - paddingX}
            y1={referenceY}
            y2={referenceY}
            stroke={accent}
            strokeDasharray="5 5"
            strokeWidth="1.5"
            opacity="0.6"
          />
        ) : null}

        <path d={areaPath} fill={softAccent} opacity="1" />
        <path d={path} fill="none" stroke={accent} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />

        {validPoints.map((point, index) => {
          const x = getX(index);
          const y = getY(point);
          const isLast = index === validPoints.length - 1;

          return (
            <g key={`${index}-${point}`}>
              {isLast ? <circle cx={x} cy={y} r="8" fill={accent} opacity="0.12" /> : null}
              <circle cx={x} cy={y} r={isLast ? "4.2" : "3"} fill={accent} />
            </g>
          );
        })}

        {lastPointX !== null && lastPointY !== null ? (
          <>
            <rect
              x={Math.min(lastPointX + 10, width - 74)}
              y={Math.max(lastPointY - 34, 10)}
              rx="999"
              ry="999"
              width="64"
              height="20"
              fill="white"
              opacity="0.98"
              stroke="rgba(126, 106, 100, 0.12)"
            />
            <text
              x={Math.min(lastPointX + 42, width - 42)}
              y={Math.max(lastPointY - 20, 24)}
              textAnchor="middle"
              fill={accent}
              fontSize="10"
              fontWeight="700"
            >
              {currentLabel}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
