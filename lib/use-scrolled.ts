import { useEffect, useState } from "react";

/**
 * True once the window has scrolled past `threshold` px. rAF-throttled so
 * it's cheap to read on every scroll tick.
 *
 * Uses hysteresis (a lower exit threshold than the enter threshold) rather
 * than a single boundary — collapsing the topbar changes its own height,
 * which nudges scrollY by a few px, which can flip a single-boundary check
 * back the other way on the very next frame. With scrollY hovering near
 * that one number (trackpad momentum, that self-induced nudge), the state
 * flaps every frame — the topbar visibly stuck shaking between expanded and
 * collapsed. A gap between enter/exit means once collapsed, scrollY has to
 * drop well below `threshold` before it expands again, so it can't retrigger
 * itself.
 */
export function useScrolled(threshold = 12): boolean {
  const [scrolled, setScrolled] = useState(false);
  const exitThreshold = Math.max(threshold - 8, 0);

  useEffect(() => {
    let ticking = false;

    function update() {
      setScrolled((prev) =>
        prev ? window.scrollY > exitThreshold : window.scrollY > threshold
      );
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, exitThreshold]);

  return scrolled;
}
