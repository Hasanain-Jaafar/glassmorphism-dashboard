"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type {
  ProductNetworkEdge,
  ProductNetworkNode,
} from "@/lib/product-network";
import { productCategories } from "@/lib/mock-data";

/** Fixed categorical order — validated together for CVD/contrast in both
 * themes via the dataviz skill's palette checker. Don't reorder. */
const CATEGORY_COLOR_VARS = [
  "--chart-1",
  "--chart-4",
  "--chart-2",
  "--chart-5",
  "--chart-3",
  "--chart-6",
  "--chart-7",
] as const;

const MIN_RADIUS = 7;
const MAX_RADIUS = 22;
const CLICK_MAX_DRAG_PX = 4;
const CLICK_MAX_MS = 350;

type SimNode = {
  id: string;
  name: string;
  category: string;
  timesQuoted: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
  color: string;
};

type SimEdge = {
  source: SimNode;
  target: SimNode;
  weight: number;
  maxWeight: number;
};

type ResolvedColors = {
  categories: string[];
  edge: string;
  edgeHighlight: string;
  labelText: string;
};

function resolveColors(el: HTMLElement): ResolvedColors {
  const styles = getComputedStyle(el);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    categories: CATEGORY_COLOR_VARS.map(read),
    edge: read("--text-tertiary") || "rgba(128,128,128,0.4)",
    edgeHighlight: read("--primary") || "#7c67ff",
    labelText: read("--foreground") || "#fff",
  };
}

function buildSimNodes(
  nodes: ProductNetworkNode[],
  colors: ResolvedColors,
  width: number,
  height: number
): Map<string, SimNode> {
  const maxTimesQuoted = Math.max(1, ...nodes.map((n) => n.timesQuoted));
  const cx = width / 2;
  const cy = height / 2;
  const map = new Map<string, SimNode>();

  nodes.forEach((node, index) => {
    const categoryIndex = productCategories.indexOf(
      node.category as (typeof productCategories)[number]
    );
    const color =
      colors.categories[categoryIndex % colors.categories.length] ??
      colors.categories[0];
    // Seed near the center in a loose ring so the opening burst of
    // repulsion sends nodes flying outward, like Obsidian's graph does the
    // first time it renders — rather than starting pre-arranged.
    const seedAngle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const seedRadius = 20 + Math.random() * 30;
    map.set(node.id, {
      id: node.id,
      name: node.name,
      category: node.category,
      timesQuoted: node.timesQuoted,
      x: cx + Math.cos(seedAngle) * seedRadius,
      y: cy + Math.sin(seedAngle) * seedRadius,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      radius:
        MIN_RADIUS +
        Math.sqrt(node.timesQuoted / maxTimesQuoted) * (MAX_RADIUS - MIN_RADIUS),
      color,
    });
  });

  return map;
}

function tick(
  simNodes: SimNode[],
  simEdges: SimEdge[],
  width: number,
  height: number,
  alpha: number
) {
  const repulsionStrength = 1100;

  for (let i = 0; i < simNodes.length; i++) {
    const a = simNodes[i];
    for (let j = i + 1; j < simNodes.length; j++) {
      const b = simNodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = Math.max(dx * dx + dy * dy, 1);
      const dist = Math.sqrt(distSq);
      const force = (repulsionStrength * alpha) / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  for (const edge of simEdges) {
    const { source, target, weight } = edge;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const targetDist = 95 / (1 + weight * 0.3);
    const strength = Math.min(0.03 + weight * 0.012, 0.14) * alpha;
    const displacement = (dist - targetDist) * strength;
    const nx = dx / dist;
    const ny = dy / dist;
    source.vx += nx * displacement;
    source.vy += ny * displacement;
    target.vx -= nx * displacement;
    target.vy -= ny * displacement;
  }

  const cx = width / 2;
  const cy = height / 2;
  for (const node of simNodes) {
    node.vx += (cx - node.x) * 0.0015 * alpha;
    node.vy += (cy - node.y) * 0.0015 * alpha;
    // A tiny ambient jitter, independent of alpha, so the graph keeps a
    // faint living drift at rest instead of freezing solid.
    node.vx += (Math.random() - 0.5) * 0.03;
    node.vy += (Math.random() - 0.5) * 0.03;
  }

  for (const node of simNodes) {
    if (node.fx !== null && node.fy !== null) {
      node.x = node.fx;
      node.y = node.fy;
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    node.vx *= 0.86;
    node.vy *= 0.86;
    node.x += node.vx;
    node.y += node.vy;

    const margin = node.radius + 6;
    node.x = Math.min(Math.max(node.x, margin), width - margin);
    node.y = Math.min(Math.max(node.y, margin), height - margin);
  }
}

export function ProductNetworkGraph({
  nodes,
  edges,
  onSelectProduct,
}: {
  nodes: ProductNetworkNode[];
  edges: ProductNetworkEdge[];
  onSelectProduct?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  const simRef = useRef<{ nodes: SimNode[]; edges: SimEdge[] }>({
    nodes: [],
    edges: [],
  });
  const viewRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const alphaRef = useRef(1);
  const reducedMotionRef = useRef(false);

  const dragRef = useRef<{
    node: SimNode;
    startClientX: number;
    startClientY: number;
    startedAt: number;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number } | null>(
    null
  );

  const [hovered, setHovered] = useState<SimNode | null>(null);
  // Mirrors `hovered` but readable from inside the draw()/RAF closure, which
  // is created once per effect run and never sees later React state.
  const hoveredRef = useRef<SimNode | null>(null);
  const tooltipElRef = useRef<HTMLDivElement>(null);
  // Lets pointer handlers force an immediate repaint. The RAF loop already
  // redraws every frame, but under prefers-reduced-motion there is no loop —
  // without this, dragging/hovering/panning/zooming would mutate state with
  // zero visual feedback once the initial settle-and-render is done.
  const drawRef = useRef<(() => void) | null>(null);

  const presentCategories = useMemo(
    () => productCategories.filter((c) => nodes.some((n) => n.category === c)),
    [nodes]
  );

  // Rebuild the simulation whenever the underlying data or theme changes —
  // theme changes need fresh resolved colors, since canvas fillStyle can't
  // read CSS custom properties directly.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const colors = resolveColors(container);
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;
    sizeRef.current = { width, height };

    const nodeMap = buildSimNodes(nodes, colors, width, height);
    const simEdges: SimEdge[] = [];
    const maxWeight = Math.max(1, ...edges.map((e) => e.weight));
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;
      simEdges.push({ source, target, weight: edge.weight, maxWeight });
    }

    simRef.current = { nodes: Array.from(nodeMap.values()), edges: simEdges };
    viewRef.current = { scale: 1, panX: 0, panY: 0 };
    alphaRef.current = 1;

    let lastWidth = 0;
    let lastHeight = 0;
    drawRef.current = draw;

    if (reducedMotionRef.current) {
      // Settle synchronously, then render once — no continuous motion. Direct
      // interactions (drag/hover/pan/zoom) still repaint via drawRef.
      for (let i = 0; i < 300; i++) {
        tick(simRef.current.nodes, simRef.current.edges, width, height, 0.3);
      }
      draw();
      return () => {
        drawRef.current = null;
      };
    }

    let raf = 0;
    const ALPHA_FLOOR = 0.06;

    function frame() {
      const { width, height } = sizeRef.current;
      alphaRef.current = Math.max(ALPHA_FLOOR, alphaRef.current * 0.985);
      tick(simRef.current.nodes, simRef.current.edges, width, height, alphaRef.current);
      draw();
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      drawRef.current = null;
    };

    function draw() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = sizeRef.current;
      if (width !== lastWidth || height !== lastHeight) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        lastWidth = width;
        lastHeight = height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const { scale, panX, panY } = viewRef.current;
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      const activeNode = dragRef.current?.node ?? hoveredRef.current;
      const neighborIds = new Set<string>();
      if (activeNode) {
        for (const edge of simRef.current.edges) {
          if (edge.source === activeNode) neighborIds.add(edge.target.id);
          if (edge.target === activeNode) neighborIds.add(edge.source.id);
        }
      }

      for (const edge of simRef.current.edges) {
        const isRelated =
          !activeNode ||
          edge.source === activeNode ||
          edge.target === activeNode;
        const weightRatio = edge.weight / edge.maxWeight;
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.strokeStyle = isRelated ? colors.edgeHighlight : colors.edge;
        ctx.globalAlpha = activeNode
          ? isRelated
            ? 0.45 + weightRatio * 0.3
            : 0.06
          : 0.12 + weightRatio * 0.28;
        ctx.lineWidth = 0.75 + weightRatio * 1.75;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const node of simRef.current.nodes) {
        const isActive = !activeNode || node === activeNode || neighborIds.has(node.id);
        ctx.globalAlpha = isActive ? 1 : 0.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        if (node === activeNode) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = colors.labelText;
          ctx.globalAlpha = 0.9;
          ctx.stroke();
        }

        // Always-on labels for the biggest hubs; others only when active.
        if (node.radius >= MAX_RADIUS * 0.72 || node === activeNode || neighborIds.has(node.id)) {
          ctx.globalAlpha = isActive ? 0.85 : 0.25;
          ctx.fillStyle = colors.labelText;
          ctx.font = "10px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(truncateLabel(node.name), node.x, node.y + node.radius + 3);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }, [nodes, edges, resolvedTheme]);

  // Resize observer: keep the canvas matched to its container without
  // rebuilding the whole simulation (positions carry over).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      sizeRef.current = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function toWorld(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { scale, panX, panY } = viewRef.current;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return { x: (localX - panX) / scale, y: (localY - panY) / scale };
  }

  function hitTest(x: number, y: number): SimNode | null {
    let closest: SimNode | null = null;
    let closestDist = Infinity;
    for (const node of simRef.current.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = Math.max(node.radius, 14);
      if (dist <= hitRadius && dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    }
    return closest;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const world = toWorld(event.clientX, event.clientY);
    const node = hitTest(world.x, world.y);
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);

    if (node) {
      node.fx = node.x;
      node.fy = node.y;
      alphaRef.current = Math.max(alphaRef.current, 0.5);
      dragRef.current = {
        node,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startedAt: Date.now(),
        moved: false,
      };
    } else {
      panRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewRef.current.panX,
        startPanY: viewRef.current.panY,
      };
    }
    drawRef.current?.();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      const drag = dragRef.current;
      const world = toWorld(event.clientX, event.clientY);
      drag.node.fx = world.x;
      drag.node.fy = world.y;
      if (
        Math.abs(event.clientX - drag.startClientX) > CLICK_MAX_DRAG_PX ||
        Math.abs(event.clientY - drag.startClientY) > CLICK_MAX_DRAG_PX
      ) {
        drag.moved = true;
      }
      drawRef.current?.();
      return;
    }

    if (panRef.current) {
      const pan = panRef.current;
      viewRef.current.panX = pan.startPanX + (event.clientX - pan.startClientX);
      viewRef.current.panY = pan.startPanY + (event.clientY - pan.startClientY);
      drawRef.current?.();
      return;
    }

    const world = toWorld(event.clientX, event.clientY);
    const node = hitTest(world.x, world.y);
    hoveredRef.current = node;
    if (node && tooltipElRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      tooltipElRef.current.style.left = `${event.clientX - containerRect.left + 14}px`;
      tooltipElRef.current.style.top = `${event.clientY - containerRect.top + 14}px`;
    }
    setHovered((prev) => (prev?.id === node?.id ? prev : node));
    drawRef.current?.();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (drag) {
      drag.node.fx = null;
      drag.node.fy = null;
      const elapsed = Date.now() - drag.startedAt;
      if (!drag.moved && elapsed < CLICK_MAX_MS) {
        onSelectProduct?.(drag.node.name);
      }
      dragRef.current = null;
    }
    panRef.current = null;
    (event.target as HTMLCanvasElement).releasePointerCapture(event.pointerId);
    drawRef.current?.();
  }

  function handlePointerLeave() {
    if (!dragRef.current) {
      hoveredRef.current = null;
      setHovered(null);
      drawRef.current?.();
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const view = viewRef.current;
    const nextScale = Math.min(
      2.5,
      Math.max(0.5, view.scale * (event.deltaY > 0 ? 0.92 : 1.08))
    );
    // Zoom around the cursor, not the canvas origin.
    view.panX = cursorX - ((cursorX - view.panX) / view.scale) * nextScale;
    view.panY = cursorY - ((cursorY - view.panY) / view.scale) * nextScale;
    view.scale = nextScale;
    drawRef.current?.();
  }

  return (
    <div ref={containerRef} className="relative h-[420px] w-full overflow-hidden rounded-xl">
      <canvas
        ref={canvasRef}
        className="size-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />

      <div
        ref={tooltipElRef}
        className="glass-panel pointer-events-none absolute top-0 left-0 z-10 max-w-[220px] rounded-lg px-3 py-2 text-xs shadow-md transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {hovered && (
          <>
            <p className="truncate font-medium text-foreground">{hovered.name}</p>
            <p className="mt-0.5 text-text-tertiary">{hovered.category}</p>
            <p className="mt-1 text-text-secondary">
              Quoted {hovered.timesQuoted} {hovered.timesQuoted === 1 ? "time" : "times"}
            </p>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1.5 rounded-lg bg-background/70 px-2.5 py-1.5 backdrop-blur-sm">
        {presentCategories.map((category) => {
          const index = productCategories.indexOf(category);
          const colorVar = CATEGORY_COLOR_VARS[index % CATEGORY_COLOR_VARS.length];
          return (
            <span key={category} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${colorVar})` }}
              />
              {category}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function truncateLabel(name: string, max = 18) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
