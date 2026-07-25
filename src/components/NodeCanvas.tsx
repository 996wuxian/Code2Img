import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../geometry";
import type { CodeNode, ConnectingState, Edge, PortSide } from "../types";
import { CodeCard } from "./CodeCard";
import { EdgeLayer } from "./EdgeLayer";

type Props = {
  nodes: CodeNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  canvasBg: string;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onAddEdge: (edge: Edge) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
};

const MIN_WORLD_WIDTH = 1400;
const MIN_WORLD_HEIGHT = 900;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.0015;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

function closestPortForPoint(
  node: CodeNode,
  height: number,
  x: number,
  y: number,
): PortSide {
  const distances: Array<[PortSide, number]> = [
    ["left", Math.abs(x - node.x)],
    ["right", Math.abs(x - (node.x + node.width))],
    ["top", Math.abs(y - node.y)],
    ["bottom", Math.abs(y - (node.y + height))],
  ];
  return distances.sort((a, b) => a[1] - b[1])[0][0];
}

export function NodeCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  canvasBg,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onAddEdge,
  canvasRef,
}: Props) {
  const worldRef = useRef<HTMLDivElement>(null);
  const heightsRef = useRef<Record<string, number>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const connectingRef = useRef<ConnectingState | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const panRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const worldSize = useMemo(() => {
    let width = MIN_WORLD_WIDTH;
    let height = MIN_WORLD_HEIGHT;
    for (const node of nodes) {
      const nodeHeight = heights[node.id] ?? heightsRef.current[node.id] ?? 180;
      width = Math.max(width, node.x + node.width + 240);
      height = Math.max(height, node.y + nodeHeight + 240);
    }
    return { width, height };
  }, [heights, nodes]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isEditableTarget(e.target)) return;
      e.preventDefault();
      setSpacePressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpacePressed(false);
      panRef.current = null;
      setIsPanning(false);
    };
    const onBlur = () => {
      setSpacePressed(false);
      panRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const viewport = canvasRef.current;
    if (!viewport) return { x: clientX, y: clientY };
    const rect = viewport.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    return {
      x: (clientX - rect.left + viewport.scrollLeft) / currentZoom,
      y: (clientY - rect.top + viewport.scrollTop) / currentZoom,
    };
  }, [canvasRef]);

  const setNodeHeight = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return;
    const h = el.offsetHeight;
    if (heightsRef.current[id] === h) return;
    heightsRef.current = { ...heightsRef.current, [id]: h };
    setHeights(heightsRef.current);
  }, []);

  const onNodeDragStart = (id: string, e: React.PointerEvent) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const p = toWorld(e.clientX, e.clientY);
    dragRef.current = {
      id,
      offsetX: p.x - node.x,
      offsetY: p.y - node.y,
    };
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const startConnect = (nodeId: string, port: PortSide, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const p = toWorld(e.clientX, e.clientY);
    const state: ConnectingState = {
      sourceId: nodeId,
      sourcePort: port,
      mouseX: p.x,
      mouseY: p.y,
    };
    connectingRef.current = state;
    setConnecting(state);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const findConnectionTarget = useCallback(
    (x: number, y: number, sourceId: string) => {
      const hitPadding = 18;
      for (const node of nodes) {
        if (node.id === sourceId) continue;
        const height = heightsRef.current[node.id] ?? heights[node.id] ?? 160;
        const inBounds =
          x >= node.x - hitPadding &&
          x <= node.x + node.width + hitPadding &&
          y >= node.y - hitPadding &&
          y <= node.y + height + hitPadding;
        if (!inBounds) continue;
        return {
          targetId: node.id,
          targetPort: closestPortForPoint(node, height, x, y),
        };
      }
      return null;
    },
    [heights, nodes],
  );

  const tryCompleteConnect = (clientX: number, clientY: number) => {
    const conn = connectingRef.current;
    if (!conn) return;

    const p = toWorld(clientX, clientY);
    const target =
      findConnectionTarget(p.x, p.y, conn.sourceId) ??
      (conn.targetId && conn.targetPort
        ? { targetId: conn.targetId, targetPort: conn.targetPort }
        : null);

    if (target) {
      const exists = edges.some(
        (ed) =>
          ed.sourceId === conn.sourceId &&
          ed.targetId === target.targetId &&
          ed.sourcePort === conn.sourcePort &&
          ed.targetPort === target.targetPort,
      );
      if (!exists) {
        onAddEdge({
          id: uid("edge"),
          sourceId: conn.sourceId,
          targetId: target.targetId,
          sourcePort: conn.sourcePort,
          targetPort: target.targetPort,
          color: "#6ea8ff",
        });
      }
    }

    connectingRef.current = null;
    setConnecting(null);
    setDropTargetNodeId(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panRef.current) {
      e.preventDefault();
      const viewport = canvasRef.current;
      if (!viewport) return;
      viewport.scrollLeft =
        panRef.current.scrollLeft - (e.clientX - panRef.current.clientX);
      viewport.scrollTop =
        panRef.current.scrollTop - (e.clientY - panRef.current.clientY);
      return;
    }

    const p = toWorld(e.clientX, e.clientY);

    if (dragRef.current) {
      const { id, offsetX, offsetY } = dragRef.current;
      onMoveNode(id, Math.max(0, p.x - offsetX), Math.max(0, p.y - offsetY));
    }

    if (connectingRef.current) {
      const target = findConnectionTarget(
        p.x,
        p.y,
        connectingRef.current.sourceId,
      );
      const next = {
        ...connectingRef.current,
        mouseX: p.x,
        mouseY: p.y,
        targetId: target?.targetId,
        targetPort: target?.targetPort,
      };
      connectingRef.current = next;
      setConnecting(next);
      setDropTargetNodeId(target?.targetId ?? null);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (connectingRef.current) {
      tryCompleteConnect(e.clientX, e.clientY);
    }
    dragRef.current = null;
    panRef.current = null;
    setIsPanning(false);
  };

  const startPan = (e: React.PointerEvent) => {
    const viewport = canvasRef.current;
    if (!viewport) return;
    e.preventDefault();
    e.stopPropagation();
    panRef.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const viewport = canvasRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const oldZoom = zoomRef.current;
    const nextZoom = clamp(oldZoom * (1 - e.deltaY * ZOOM_STEP), MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === oldZoom) return;

    const pointerWorldX = (e.clientX - rect.left + viewport.scrollLeft) / oldZoom;
    const pointerWorldY = (e.clientY - rect.top + viewport.scrollTop) / oldZoom;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);

    requestAnimationFrame(() => {
      viewport.scrollLeft = pointerWorldX * nextZoom - (e.clientX - rect.left);
      viewport.scrollTop = pointerWorldY * nextZoom - (e.clientY - rect.top);
    });
  };

  return (
    <div
      className={`node-canvas ${spacePressed ? "is-space-panning" : ""} ${
        isPanning ? "is-panning" : ""
      }`}
      ref={canvasRef}
      onWheel={onWheel}
      onPointerDownCapture={(e) => {
        if (spacePressed) startPan(e);
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("canvas-grid") || (e.target as HTMLElement).classList.contains("canvas-world") || (e.target as HTMLElement).classList.contains("edge-layer")) {
          onSelectNode(null);
          onSelectEdge(null);
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
        panRef.current = null;
        setIsPanning(false);
        connectingRef.current = null;
        setConnecting(null);
        setDropTargetNodeId(null);
      }}
    >
      <div
        className="canvas-zoom-surface"
        style={{
          width: worldSize.width * zoom,
          height: worldSize.height * zoom,
          background: canvasBg,
        }}
      >
        <div
          className="canvas-zoom-content"
          style={{
            width: worldSize.width,
            height: worldSize.height,
            transform: `scale(${zoom})`,
          }}
        >
          <div
            className="canvas-world"
            ref={worldRef}
            style={{
              width: worldSize.width,
              height: worldSize.height,
              background: canvasBg,
            }}
          >
            <div className="canvas-grid" />

            <EdgeLayer
              nodes={nodes}
              edges={edges}
              heights={heights}
              connecting={connecting}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={(id) => {
                onSelectEdge(id);
                onSelectNode(null);
              }}
            />

            {nodes.map((node) => (
              <CodeCard
                key={node.id}
                node={node}
                selected={selectedNodeId === node.id}
                connectionTarget={dropTargetNodeId === node.id}
                onSelect={() => {
                  onSelectNode(node.id);
                  onSelectEdge(null);
                }}
                onDragStart={(e) => onNodeDragStart(node.id, e)}
                onPortPointerDown={(port, e) => startConnect(node.id, port, e)}
                onPortPointerUp={() => {
                  /* completion handled via pointer capture */
                }}
                measureRef={(el) => {
                  if (el) el.dataset.nodeId = node.id;
                  setNodeHeight(node.id, el);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
