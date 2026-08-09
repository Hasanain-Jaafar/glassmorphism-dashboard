"use client";

import { motion } from "framer-motion";
import { formatUSD } from "@/lib/format";

export type BrandBubble = {
  id: string;
  name: string;
  value: number;
};

export function BrandBubbles({ brands }: { brands: BrandBubble[] }) {
  const values = brands.map((brand) => brand.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {brands.map((brand, index) => {
        const t = (brand.value - min) / range;
        const fontSize = 12 + t * 7;
        const paddingBlock = 6 + t * 5;
        const paddingInline = 12 + t * 8;
        const tier = t > 0.66 ? "high" : t > 0.33 ? "mid" : "low";

        return (
          <motion.span
            key={brand.id}
            title={`${brand.name} · ${formatUSD(brand.value)} catalog value`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.03 }}
            className={
              "inline-flex cursor-default items-center justify-center rounded-full font-medium " +
              (tier === "high"
                ? "bg-primary/20 text-primary"
                : tier === "mid"
                  ? "bg-primary/[0.12] text-primary"
                  : "bg-foreground/[0.06] text-text-secondary")
            }
            style={{
              fontSize,
              paddingTop: paddingBlock,
              paddingBottom: paddingBlock,
              paddingLeft: paddingInline,
              paddingRight: paddingInline,
            }}
          >
            {brand.name}
          </motion.span>
        );
      })}
    </div>
  );
}
