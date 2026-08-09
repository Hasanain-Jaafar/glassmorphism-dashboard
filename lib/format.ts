export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactUSD(amount: number): string {
  const millions = amount / 1_000_000;
  if (Math.abs(millions) >= 1) {
    return `$${millions.toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  }
  const thousands = amount / 1_000;
  return `$${thousands.toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatSignedPercent(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value, fractionDigits)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
