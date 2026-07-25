import {
  cubicAngleDeg,
  cubicBetween,
  cubicMidpoint,
  cubicPathShortened,
  portPosition,
} from "../geometry";
import type { CodeNode, ConnectingState, Edge, PortSide } from "../types";
import {
  EDGE_END_ICON_INSET,
  EdgeEndIcon,
  arrowTipPosition,
} from "./EdgeEndIcon";

type Heights = Record<string, number>;

type Props = {
  nodes: CodeNode[];
  edges: Edge[];
  heights: Heights;
  connecting: ConnectingState | null;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string) => void;
};

function nodeById(nodes: CodeNode[], id: string) {
  return nodes.find((n) => n.id === id);
}

export function EdgeLayer({
  nodes,
  edges,
  heights,
  connecting,
  selectedEdgeId,
  onSelectEdge,
}: Props) {
  return (
    <svg className="edge-layer" aria-hidden>
      {edges.map((edge) => {
        const source = nodeById(nodes, edge.sourceId);
        const target = nodeById(nodes, edge.targetId);
        if (!source || !target) return null;

        const from = portPosition(
          source,
          edge.sourcePort,
          heights[source.id] ?? 160,
        );
        const to = portPosition(
          target,
          edge.targetPort,
          heights[target.id] ?? 160,
        );
        const cubic = cubicBetween(from, to, edge.sourcePort, edge.targetPort);
        const d = cubicPathShortened(cubic, EDGE_END_ICON_INSET);
        const mid = cubicMidpoint(from, to, edge.sourcePort, edge.targetPort);
        const angle = cubicAngleDeg(cubic, 1);
        const tip = arrowTipPosition(to.x, to.y, angle);
        const selected = selectedEdgeId === edge.id;

        return (
          <g
            key={edge.id}
            className={`edge-group ${selected ? "is-selected" : ""}`}
            style={{ color: edge.color }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectEdge(edge.id);
            }}
          >
            <path d={d} className="edge-hit" />
            <path d={d} className="edge-path" stroke={edge.color} />
            <EdgeEndIcon
              x={tip.x}
              y={tip.y}
              angle={angle}
              color={edge.color}
              selected={selected}
            />
            {edge.label && (
              <text
                x={mid.x}
                y={mid.y - 10}
                className="edge-label"
                textAnchor="middle"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {connecting &&
        (() => {
          const source = nodeById(nodes, connecting.sourceId);
          if (!source) return null;
          const from = portPosition(
            source,
            connecting.sourcePort,
            heights[source.id] ?? 160,
          );
          const to = { x: connecting.mouseX, y: connecting.mouseY };
          const targetPort: PortSide =
            connecting.targetPort ??
            (connecting.sourcePort === "left"
              ? "right"
              : connecting.sourcePort === "right"
                ? "left"
                : connecting.sourcePort === "top"
                  ? "bottom"
                  : "top");
          const cubic = cubicBetween(from, to, connecting.sourcePort, targetPort);
          const d = cubicPathShortened(cubic, EDGE_END_ICON_INSET);
          const angle = cubicAngleDeg(cubic, 1);
          const tip = arrowTipPosition(to.x, to.y, angle);
          return (
            <g className="edge-preview-group">
              <path
                d={d}
                className="edge-path edge-preview"
                stroke="var(--accent)"
              />
              <EdgeEndIcon
                x={tip.x}
                y={tip.y}
                angle={angle}
                color="var(--accent)"
              />
            </g>
          );
        })()}
    </svg>
  );
}
