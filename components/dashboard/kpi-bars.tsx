function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}

/** Faint decorative bar chart for KPI cards — companion shape to KpiWave, not a data chart. */
export function KpiBars({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const width = 300;
  const height = 110;
  const gap = 10;
  const barWidth = (width - gap * (data.length - 1)) / data.length;
  const max = Math.max(...data, 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] w-full"
      aria-hidden="true"
    >
      {data.map((value, index) => {
        const barHeight = max ? Math.max((value / max) * height * 0.62, 6) : 6;
        const x = index * (barWidth + gap);
        const y = height - barHeight;
        const emphasis = 0.07 + (index / (data.length - 1)) * 0.09;
        return (
          <path
            key={index}
            d={roundedTopRect(x, y, barWidth, barHeight, 3)}
            fill="var(--chart-1)"
            fillOpacity={emphasis}
          />
        );
      })}
    </svg>
  );
}
