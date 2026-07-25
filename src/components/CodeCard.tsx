import { useEffect, useRef, useState } from "react";
import { highlightCode } from "../highlight";
import type { CodeNode, PortSide } from "../types";

const PORTS: PortSide[] = ["left", "right", "top", "bottom"];

type Props = {
  node: CodeNode;
  selected: boolean;
  connectionTarget: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onPortPointerDown: (port: PortSide, e: React.PointerEvent) => void;
  onPortPointerUp: (port: PortSide, e: React.PointerEvent) => void;
  measureRef?: (el: HTMLDivElement | null) => void;
};

export function CodeCard({
  node,
  selected,
  connectionTarget,
  onSelect,
  onDragStart,
  onPortPointerDown,
  onPortPointerUp,
  measureRef,
}: Props) {
  const [html, setHtml] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void highlightCode(node.code, node.language, node.themeId).then((h) => {
      if (!cancelled) setHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [node.code, node.language, node.themeId]);

  useEffect(() => {
    measureRef?.(rootRef.current);
  }, [
    measureRef,
    node.code,
    node.padding,
    node.radius,
    node.showLineNumbers,
    node.windowChrome,
    html,
  ]);

  const lineCount = Math.max(1, (node.code || " ").split("\n").length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join(
    "\n",
  );

  return (
    <div
      ref={rootRef}
      className={`canvas-node ${selected ? "is-selected" : ""} ${
        connectionTarget ? "is-connection-target" : ""
      }`}
      data-node-id={node.id}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
      }}
      onPointerDown={(e) => {
        // don't start drag from ports
        if ((e.target as HTMLElement).closest(".port")) return;
        onSelect();
        onDragStart(e);
      }}
    >
      {PORTS.map((port) => (
        <button
          key={port}
          type="button"
          className={`port port-${port}`}
          data-port={port}
          title={`从这里拖出弧线连接到其他节点`}
          aria-label={`${port} 连接点`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect();
            onPortPointerDown(port, e);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onPortPointerUp(port, e);
          }}
        />
      ))}

      <div
        className="export-card node-card"
        style={{
          background: node.bgColor,
          borderRadius: `${node.radius}px`,
          padding: `${node.padding}px`,
        }}
        data-theme={node.themeId}
      >
        <div
          className="code-window"
          style={{ borderRadius: `${node.radius}px` }}
        >
          {node.windowChrome !== "none" && (
            <div className={`window-chrome chrome-${node.windowChrome}`}>
              {node.windowChrome === "mac" && (
                <div className="traffic-lights" aria-hidden>
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
              )}
              <div className="window-title">{node.fileName || "untitled"}</div>
              {node.windowChrome === "windows" ? (
                <div className="win-controls" aria-hidden>
                  <span className="win-btn">—</span>
                  <span className="win-btn">□</span>
                  <span className="win-btn">×</span>
                </div>
              ) : (
                <div className="chrome-spacer" />
              )}
            </div>
          )}

          <div className="code-body">
            {node.showLineNumbers && (
              <pre className="line-numbers" aria-hidden>
                {lineNumbers}
              </pre>
            )}
            <div
              className="shiki-host"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
