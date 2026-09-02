"use client";

import { useId, useMemo } from "react";
import type { MetricTone } from "@/components/dashboard/metric-card";

const toneVar: Record<MetricTone, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  cyan: "var(--chart-2)",
  neutral: "var(--foreground)",
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Faint decorative trend wave for KPI cards — Apple Card-style, not a data chart. */
export function KpiWave({
  data,
  tone = "primary",
}: {
  data: number[];
  /** Tints the wave to match the card's icon chip. Defaults to "primary" (the original violet look). */
  tone?: MetricTone;
}) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `kpi-wave-fill-${rawId}`;
  const sheenId = `kpi-wave-sheen-${rawId}`;
  const clipId = `kpi-wave-clip-${rawId}`;
  const edgeFadeId = `kpi-wave-edge-fade-${rawId}`;
  const edgeMaskId = `kpi-wave-edge-mask-${rawId}`;
  const color = toneVar[tone];

  // Deterministic per-card phase offset so cards on the same screen don't
  // all breathe/shimmer in lockstep — derived from the data itself.
  const phase = useMemo(() => {
    const sum = data.reduce((total, value, index) => total + value * (index + 1), 0);
    return Number((sum % 5).toFixed(2));
  }, [data]);

  if (data.length < 2) return null;

  const width = 300;
  const height = 110;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: 12 + (height - 12) * (1 - (value - min) / range) * 0.72,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="50%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={areaPath} />
        </clipPath>
        {/* Fades the fill/line/sheen out at both edges instead of letting the
            area shape's straight drop to the baseline read as a hard cut. */}
        <linearGradient id={edgeFadeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity={0} />
          <stop offset="16%" stopColor="white" stopOpacity={1} />
          <stop offset="84%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id={edgeMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <rect x="0" y="0" width={width} height={height} fill={`url(#${edgeFadeId})`} />
        </mask>
      </defs>

      <g
        className="kpi-wave-rise"
        mask={`url(#${edgeMaskId})`}
        style={{ animationDelay: `-${phase}s` }}
      >
        <path
          className="kpi-wave-area"
          d={areaPath}
          fill={`url(#${gradientId})`}
          style={{ animationDelay: `-${phase}s` }}
        />
        <path
          className="kpi-wave-line"
          d={linePath}
          fill="none"
          stroke={color}
          strokeOpacity={0.32}
          strokeWidth={1.5}
          style={{ animationDelay: `-${(phase * 1.3) % 6.5}s` }}
        />
        <g clipPath={`url(#${clipId})`}>
          <rect
            className="kpi-wave-sheen"
            x={-width * 0.7}
            y="0"
            width={width * 0.7}
            height={height}
            fill={`url(#${sheenId})`}
            style={{ animationDelay: `-${phase * 1.6}s` }}
          />
        </g>
      </g>
    </svg>
  );
}
