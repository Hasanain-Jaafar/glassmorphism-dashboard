import { Trophy } from "lucide-react";
import { formatUSD } from "@/lib/format";

export function BestSellerCard({
  productName,
  unitsSold,
  revenue,
}: {
  productName: string | null;
  unitsSold: number;
  revenue: number;
}) {
  return (
    <div className="glass-panel relative h-full overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-secondary">Best Seller</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Trophy className="size-4" />
        </span>
      </div>

      {productName ? (
        <>
          <p
            title={productName}
            className="mt-3 truncate text-lg leading-tight font-semibold tracking-tight text-foreground"
          >
            {productName}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {unitsSold.toLocaleString("en-US")} units sold · {formatUSD(revenue)}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-lg leading-tight font-semibold tracking-tight text-foreground">
            —
          </p>
          <p className="mt-2 text-xs text-text-tertiary">No paid sales yet</p>
        </>
      )}
    </div>
  );
}
