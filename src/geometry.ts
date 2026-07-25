import type { CodeNode, Point, PortSide } from "./types";

export function portPosition(
  node: CodeNode,
  port: PortSide,
  height: number,
): Point {
  const w = node.width;
  const h = Math.max(height, 80);
  switch (port) {
    case "left":
      return { x: node.x, y: node.y + h / 2 };
    case "right":
      return { x: node.x + w, y: node.y + h / 2 };
    case "top":
      return { x: node.x + w / 2, y: node.y };
    case "bottom":
      return { x: node.x + w / 2, y: node.y + h };
  }
}

function portOffset(port: PortSide, amount: number): Point {
  switch (port) {
    case "left":
      return { x: -amount, y: 0 };
    case "right":
      return { x: amount, y: 0 };
    case "top":
      return { x: 0, y: -amount };
    case "bottom":
      return { x: 0, y: amount };
  }
}

export type Cubic = {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
};

/** Build cubic control points for a smooth arc between ports. */
export function cubicBetween(
  from: Point,
  to: Point,
  fromPort: PortSide,
  toPort: PortSide,
): Cubic {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const bend = Math.max(40, Math.min(180, dist * 0.45));
  const o1 = portOffset(fromPort, bend);
  const o2 = portOffset(toPort, bend);
  return {
    p0: from,
    p1: { x: from.x + o1.x, y: from.y + o1.y },
    p2: { x: to.x + o2.x, y: to.y + o2.y },
    p3: to,
  };
}

export function cubicPath(c: Cubic): string {
  return `M ${c.p0.x} ${c.p0.y} C ${c.p1.x} ${c.p1.y}, ${c.p2.x} ${c.p2.y}, ${c.p3.x} ${c.p3.y}`;
}

/** Smooth cubic arc between two ports (S-curve / bowed arc). */
export function arcPath(
  from: Point,
  to: Point,
  fromPort: PortSide,
  toPort: PortSide,
): string {
  return cubicPath(cubicBetween(from, to, fromPort, toPort));
}

export function pointOnCubic(c: Cubic, t: number): Point {
  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * c.p0.x +
      3 * mt * mt * t * c.p1.x +
      3 * mt * t * t * c.p2.x +
      t * t * t * c.p3.x,
    y:
      mt * mt * mt * c.p0.y +
      3 * mt * mt * t * c.p1.y +
      3 * mt * t * t * c.p2.y +
      t * t * t * c.p3.y,
  };
}

/** Tangent angle in degrees at parameter t (0..1). */
export function cubicAngleDeg(c: Cubic, t: number): number {
  const mt = 1 - t;
  // B'(t) = 3(1-t)^2(P1-P0) + 6(1-t)t(P2-P1) + 3t^2(P3-P2)
  const dx =
    3 * mt * mt * (c.p1.x - c.p0.x) +
    6 * mt * t * (c.p2.x - c.p1.x) +
    3 * t * t * (c.p3.x - c.p2.x);
  const dy =
    3 * mt * mt * (c.p1.y - c.p0.y) +
    6 * mt * t * (c.p2.y - c.p1.y) +
    3 * t * t * (c.p3.y - c.p2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Midpoint along cubic bezier (t=0.5) for optional labels */
export function cubicMidpoint(
  from: Point,
  to: Point,
  fromPort: PortSide,
  toPort: PortSide,
): Point {
  return pointOnCubic(cubicBetween(from, to, fromPort, toPort), 0.5);
}

/** Shorten cubic end so the line stops before the end icon. */
export function cubicPathShortened(c: Cubic, endInset: number): string {
  if (endInset <= 0) return cubicPath(c);
  // Approximate by moving p3 back along end tangent
  const angle = (cubicAngleDeg(c, 1) * Math.PI) / 180;
  const p3 = {
    x: c.p3.x - Math.cos(angle) * endInset,
    y: c.p3.y - Math.sin(angle) * endInset,
  };
  // Keep curvature: also nudge p2 slightly toward new end
  const p2 = {
    x: c.p2.x - Math.cos(angle) * endInset * 0.35,
    y: c.p2.y - Math.sin(angle) * endInset * 0.35,
  };
  return cubicPath({ ...c, p2, p3 });
}

export function uid(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
