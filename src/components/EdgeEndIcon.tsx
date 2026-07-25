/**
 * Pure arrow end marker — Lucide-style stroke arrow (no circle badge).
 * Points along the edge tangent (+X in local space).
 */
type Props = {
  x: number;
  y: number;
  /** degrees, from cubic tangent */
  angle: number;
  color: string;
  selected?: boolean;
};

/** Gap from target port → arrow tip (keeps tip clear of the node card). */
export const EDGE_ARROW_CLEARANCE = 16;

/** Arrow length along the path (shaft start → tip). */
export const EDGE_ARROW_LENGTH = 13;

/** How far the line path should stop before the target port. */
export const EDGE_END_ICON_INSET = EDGE_ARROW_CLEARANCE + EDGE_ARROW_LENGTH;

/**
 * Place arrow tip at port, pulled back along reverse tangent by CLEARANCE.
 */
export function arrowTipPosition(
  portX: number,
  portY: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: portX - Math.cos(rad) * EDGE_ARROW_CLEARANCE,
    y: portY - Math.sin(rad) * EDGE_ARROW_CLEARANCE,
  };
}

export function EdgeEndIcon({ x, y, angle, color, selected }: Props) {
  return (
    <g
      className={`edge-end-icon ${selected ? "is-selected" : ""}`}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    >
      {/*
        Tip at local origin; body extends backward so it sits on the line.
        Lucide-style arrow-right, stroke matches edge weight.
      */}
      <g
        transform={`translate(${-EDGE_ARROW_LENGTH} 0)`}
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={`M0 0 H${EDGE_ARROW_LENGTH}`} />
        <path
          d={`M${EDGE_ARROW_LENGTH - 6} -5 L${EDGE_ARROW_LENGTH} 0 L${EDGE_ARROW_LENGTH - 6} 5`}
        />
      </g>
    </g>
  );
}
