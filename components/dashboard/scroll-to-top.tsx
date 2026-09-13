"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Next's built-in scroll restoration doesn't reliably land at the top when
 * navigating between dashboard routes — the shared DashboardShell layout
 * never remounts, so its scroll-to-top heuristic (bring the new page's DOM
 * node into view) sometimes leaves the previous page's scroll offset in
 * place. Force it explicitly on every route change instead.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
