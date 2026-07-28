import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeCanvas } from "./components/NodeCanvas";
import {
  WindowControls,
  toggleMaximizeFromTitlebar,
} from "./components/WindowControls";
import {
  IconCode,
  IconChevronDown,
  IconCopy,
  IconLink,
  IconPhoto,
  IconPlus,
  IconThemeMoon,
  IconThemeSun,
  IconTrash,
} from "./components/icons";
import { Select } from "./components/Select";
import { indentSelection, outdentSelection } from "./indent";
import { copyElementAsPng } from "./exportImage";
import { highlightCode } from "./highlight";
import { createCodeNode, createStarterGraph } from "./nodeFactory";
import { LANGUAGES, THEMES } from "./themes";
import { uid } from "./geometry";
import { applyTheme, loadTheme, toggleTheme, type ThemeMode } from "./lib/theme";
import type { CodeNode, Edge, WindowChrome } from "./types";
import "./App.css";

const APP_STATE_STORAGE_KEY = "code2img.app-state.v1";
const DEFAULT_CANVAS_BG = "#0f1219";

type StoredAppState = {
  nodes: CodeNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  canvasBg: string;
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

type Rgb = { r: number; g: number; b: number };

const hexToRgb = (hex: string): Rgb => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const mixHex = (base: string, target: string, amount: number) => {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
};

const getReadableTextColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#1f2937" : "#e8ecf5";
};

const getCanvasBackground = (hex: string) => {
  const isLight = getReadableTextColor(hex) === "#1f2937";
  const low = mixHex(hex, isLight ? "#ffffff" : "#020617", 0.18);
  const high = mixHex(hex, isLight ? "#dbeafe" : "#1e293b", 0.22);
  const glow = isLight
    ? "rgba(59, 130, 246, 0.14)"
    : "rgba(148, 163, 184, 0.11)";

  return [
    `radial-gradient(760px 420px at 18% 14%, ${glow}, transparent 58%)`,
    `linear-gradient(145deg, ${high} 0%, ${hex} 46%, ${low} 100%)`,
  ].join(", ");
};

const isWindowChrome = (value: unknown): value is WindowChrome =>
  value === "mac" || value === "windows" || value === "none";

const isCodeNode = (value: unknown): value is CodeNode => {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  return (
    typeof node.id === "string" &&
    typeof node.x === "number" &&
    typeof node.y === "number" &&
    typeof node.width === "number" &&
    typeof node.code === "string" &&
    typeof node.language === "string" &&
    typeof node.themeId === "string" &&
    typeof node.fileName === "string" &&
    typeof node.padding === "number" &&
    typeof node.radius === "number" &&
    isHexColor(node.bgColor) &&
    typeof node.showLineNumbers === "boolean" &&
    isWindowChrome(node.windowChrome)
  );
};

const isPortSide = (value: unknown) =>
  value === "left" || value === "right" || value === "top" || value === "bottom";

const isEdge = (value: unknown): value is Edge => {
  if (!value || typeof value !== "object") return false;
  const edge = value as Record<string, unknown>;
  return (
    typeof edge.id === "string" &&
    typeof edge.sourceId === "string" &&
    typeof edge.targetId === "string" &&
    isPortSide(edge.sourcePort) &&
    isPortSide(edge.targetPort) &&
    isHexColor(edge.color) &&
    (edge.label === undefined || typeof edge.label === "string")
  );
};

function createDefaultAppState(): StoredAppState {
  const starter = createStarterGraph();
  return {
    nodes: starter.nodes,
    edges: starter.edges,
    selectedNodeId: starter.nodes[0]?.id ?? null,
    canvasBg: DEFAULT_CANVAS_BG,
  };
}

function loadStoredAppState(): StoredAppState {
  if (typeof window === "undefined") return createDefaultAppState();

  try {
    const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return createDefaultAppState();

    const parsed = JSON.parse(raw) as Partial<StoredAppState>;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return createDefaultAppState();
    }

    const nodeIds = new Set(parsed.nodes.filter(isCodeNode).map((node) => node.id));
    const nodesAreValid = parsed.nodes.length > 0 && parsed.nodes.every(isCodeNode);
    const edgesAreValid = parsed.edges.every(
      (edge) =>
        isEdge(edge) && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
    );

    if (!nodesAreValid || !edgesAreValid) return createDefaultAppState();

    const selectedNodeId =
      typeof parsed.selectedNodeId === "string" && nodeIds.has(parsed.selectedNodeId)
        ? parsed.selectedNodeId
        : parsed.nodes[0]?.id ?? null;

    return {
      nodes: parsed.nodes,
      edges: parsed.edges,
      selectedNodeId,
      canvasBg: isHexColor(parsed.canvasBg) ? parsed.canvasBg : DEFAULT_CANVAS_BG,
    };
  } catch {
    return createDefaultAppState();
  }
}

const initialAppState = loadStoredAppState();

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [nodes, setNodes] = useState<CodeNode[]>(initialAppState.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialAppState.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialAppState.selectedNodeId,
  );
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState(initialAppState.canvasBg);
  const [isNodeSettingsCollapsed, setIsNodeSettingsCollapsed] = useState(false);
  const [editorHtml, setEditorHtml] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorHighlightRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const selectedEditorColor = useMemo(
    () => (selectedNode ? getReadableTextColor(selectedNode.bgColor) : "#e8ecf5"),
    [selectedNode],
  );

  const canvasBackground = useMemo(
    () => getCanvasBackground(canvasBg),
    [canvasBg],
  );

  const updateSelectedNode = useCallback(
    (patch: Partial<CodeNode>) => {
      if (!selectedNodeId) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== selectedNodeId) return n;
          const next = { ...n, ...patch };
          if (patch.themeId && !patch.bgColor) {
            const theme = THEMES.find((t) => t.id === patch.themeId);
            if (theme) next.bgColor = theme.frame;
          }
          return next;
        }),
      );
    },
    [selectedNodeId],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    try {
      window.localStorage.setItem(
        APP_STATE_STORAGE_KEY,
        JSON.stringify({ nodes, edges, selectedNodeId, canvasBg }),
      );
    } catch {
      /* local persistence is best-effort */
    }
  }, [nodes, edges, selectedNodeId, canvasBg]);

  useEffect(() => {
    if (!selectedNode) {
      setEditorHtml("");
      return;
    }

    let cancelled = false;
    void highlightCode(
      selectedNode.code,
      selectedNode.language,
      selectedNode.themeId,
    ).then((html) => {
      if (!cancelled) setEditorHtml(html);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  const applyEditorState = useCallback(
    (next: { value: string; selectionStart: number; selectionEnd: number }) => {
      updateSelectedNode({ code: next.value });
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(next.selectionStart, next.selectionEnd);
      });
    },
    [updateSelectedNode],
  );

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const state = {
      value: el.value,
      selectionStart: el.selectionStart,
      selectionEnd: el.selectionEnd,
    };
    const next = e.shiftKey ? outdentSelection(state) : indentSelection(state);
    applyEditorState(next);
  };

  const syncEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const highlight = editorHighlightRef.current;
    if (!highlight) return;
    highlight.scrollTop = e.currentTarget.scrollTop;
    highlight.scrollLeft = e.currentTarget.scrollLeft;
  };

  const addNode = () => {
    const node = createCodeNode({
      x: 120 + nodes.length * 28,
      y: 100 + nodes.length * 24,
    });
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const duplicateNode = () => {
    if (!selectedNode) return;
    const copy = createCodeNode({
      ...selectedNode,
      id: uid("node"),
      x: selectedNode.x + 36,
      y: selectedNode.y + 36,
      fileName: selectedNode.fileName.replace(/(\.\w+)?$/, "-copy$1"),
    });
    setNodes((prev) => [...prev, copy]);
    setSelectedNodeId(copy.id);
  };

  const deleteSelected = useCallback(() => {
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter(
        (e) => e.sourceId !== selectedNodeId && e.targetId !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
  }, [selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (!selectedNodeId && !selectedEdgeId) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, selectedNodeId, selectedEdgeId]);

  const onExportCanvas = async () => {
    const el = canvasRef.current?.querySelector(
      ".canvas-world",
    ) as HTMLElement | null;
    if (!el) return;
    setIsExporting(true);
    setError(null);
    setStatus(null);

    // Hide ports / selection chrome so they don't appear in the screenshot
    el.classList.add("is-capturing");

    try {
      const exportPadding = 96;
      let maxX = nodes.length ? exportPadding : 800;
      let maxY = nodes.length ? exportPadding : 600;
      for (const n of nodes) {
        const card = el.querySelector(
          `[data-node-id="${n.id}"]`,
        ) as HTMLElement | null;
        const h = card?.offsetHeight ?? 200;
        maxX = Math.ceil(Math.max(maxX, n.x + n.width + exportPadding));
        maxY = Math.ceil(Math.max(maxY, n.y + h + exportPadding));
      }

      // Let the browser apply capture-only styles before cloning the world.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      // Default: copy image to clipboard for quick paste sharing
      await copyElementAsPng(el, {
        width: maxX,
        height: maxY,
        detached: true,
      });
      setStatus("整图已复制到剪贴板，可直接 Ctrl+V 粘贴");
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制图片失败");
    } finally {
      el.classList.remove("is-capturing");
      setIsExporting(false);
    }
  };

  const onExportNode = async () => {
    if (!selectedNodeId) return;
    const world = canvasRef.current?.querySelector(
      ".canvas-world",
    ) as HTMLElement | null;
    const card = canvasRef.current?.querySelector(
      `[data-node-id="${selectedNodeId}"] .node-card`,
    ) as HTMLElement | null;
    if (!card) return;
    setIsExporting(true);
    setError(null);
    setStatus(null);
    world?.classList.add("is-capturing");
    try {
      await copyElementAsPng(card, {
        width: Math.ceil(card.offsetWidth),
        height: Math.ceil(card.offsetHeight),
        detached: true,
      });
      setStatus("选中节点已复制到剪贴板，可直接 Ctrl+V 粘贴");
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制节点失败");
    } finally {
      world?.classList.remove("is-capturing");
      setIsExporting(false);
    }
  };

  return (
    <div className="app" data-theme={theme}>
      <header
        className="toolbar"
        data-tauri-drag-region
        onDoubleClick={() => void toggleMaximizeFromTitlebar()}
      >
        <div className="brand" data-tauri-drag-region>
          <img
            src="/logo.png"
            alt="code2img"
            className="app-logo"
            draggable={false}
          />
          <div data-tauri-drag-region>
            <h1 data-tauri-drag-region>code2img</h1>
            <p data-tauri-drag-region>多节点代码图 · 弧线关联 · 导出 PNG</p>
          </div>
        </div>

        <div className="toolbar-drag" data-tauri-drag-region />

        <div className="toolbar-actions">
          <button
            type="button"
            className="icon-btn theme-toggle-btn"
            title={theme === "dark" ? "切换亮色" : "切换暗色"}
            aria-label={theme === "dark" ? "切换亮色" : "切换暗色"}
            onClick={() => setTheme((current) => toggleTheme(current))}
          >
            {theme === "dark" ? (
              <IconThemeSun size={16} />
            ) : (
              <IconThemeMoon size={16} />
            )}
          </button>
          <button type="button" className="btn" onClick={addNode}>
            <IconPlus size={16} />
            节点
          </button>
          <button
            type="button"
            className="btn"
            onClick={duplicateNode}
            disabled={!selectedNode}
          >
            <IconCopy size={16} />
            复制
          </button>
          <button
            type="button"
            className="btn"
            onClick={deleteSelected}
            disabled={!selectedNodeId && !selectedEdgeId}
          >
            <IconTrash size={16} />
            删除
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void onExportNode()}
            disabled={!selectedNode || isExporting}
            title="复制选中的单个节点为 PNG 图片"
          >
            <IconPhoto size={16} />
            复制节点
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onExportCanvas()}
            disabled={isExporting}
            title="渲染整图并复制到剪贴板，可直接粘贴给别人"
          >
            <IconPhoto size={16} />
            {isExporting ? "复制中…" : "复制整图"}
          </button>
        </div>

        <WindowControls />
      </header>

      <div className="workspace workspace-graph">
        <section className="panel editor-panel">
          <div className="panel-header">
            <h2>
              <IconCode size={15} />
              节点编辑
            </h2>
            <div className="panel-header__actions">
              <span className="hint">
                {selectedEdge
                  ? "已选连线"
                  : selectedNode
                    ? "Tab / Shift+Tab 缩进"
                    : "点选节点或连线"}
              </span>
              {selectedNode && (
                <button
                  type="button"
                  className="icon-btn collapse-settings-btn"
                  onClick={() =>
                    setIsNodeSettingsCollapsed((collapsed) => !collapsed)
                  }
                  aria-label={
                    isNodeSettingsCollapsed ? "展开节点设置" : "折叠节点设置"
                  }
                  aria-expanded={!isNodeSettingsCollapsed}
                  title={
                    isNodeSettingsCollapsed ? "展开节点设置" : "折叠节点设置"
                  }
                >
                  <IconChevronDown size={16} />
                </button>
              )}
            </div>
          </div>

          {selectedEdge && (
            <div className="edge-editor">
              <label>
                连线颜色
                <input
                  type="color"
                  value={selectedEdge.color}
                  onChange={(e) =>
                    setEdges((prev) =>
                      prev.map((ed) =>
                        ed.id === selectedEdge.id
                          ? { ...ed, color: e.target.value }
                          : ed,
                      ),
                    )
                  }
                />
              </label>
              <label>
                标签（可选）
                <input
                  type="text"
                  value={selectedEdge.label ?? ""}
                  placeholder="calls / depends…"
                  onChange={(e) =>
                    setEdges((prev) =>
                      prev.map((ed) =>
                        ed.id === selectedEdge.id
                          ? { ...ed, label: e.target.value || undefined }
                          : ed,
                      ),
                    )
                  }
                />
              </label>
              <p className="hint-block">
                从节点四边圆点拖出，松在另一节点圆点上即可创建弧线。
              </p>
            </div>
          )}

          {!selectedNode && !selectedEdge && (
            <div className="empty-editor">
              <div className="empty-editor__hero">
                <img
                  src="/logo.png"
                  alt=""
                  className="app-logo app-logo--lg"
                  draggable={false}
                />
                <p>在右侧画布中：</p>
              </div>
              <ul>
                <li>拖拽节点移动位置</li>
                <li>
                  <IconLink size={14} /> 从节点边缘圆点拖到另一节点创建弧线
                </li>
                <li>
                  <IconCode size={14} /> 选中节点后在此编辑代码与主题
                </li>
              </ul>
              <label>
                画布背景
                <div className="color-field color-field--full">
                  <input
                    type="color"
                    className="color-field__swatch"
                    value={canvasBg}
                    onChange={(e) => setCanvasBg(e.target.value)}
                    aria-label="画布背景"
                    title="画布背景"
                  />
                </div>
              </label>
            </div>
          )}

          {selectedNode && (
            <div
              className={`editor-form ${
                isNodeSettingsCollapsed ? "is-settings-collapsed" : ""
              }`}
            >
              {!isNodeSettingsCollapsed && (
                <div className="node-settings">
                  <div className="field-grid field-grid--primary">
                    <label className="field">
                      <span className="field__label">语言</span>
                      <Select
                        value={selectedNode.language}
                        options={LANGUAGES.map((l) => ({
                          value: l.id,
                          label: l.label,
                        }))}
                        onChange={(v) => updateSelectedNode({ language: v })}
                        ariaLabel="语言"
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">主题</span>
                      <Select
                        value={selectedNode.themeId}
                        options={THEMES.map((t) => ({
                          value: t.id,
                          label: t.label,
                        }))}
                        onChange={(v) => updateSelectedNode({ themeId: v })}
                        ariaLabel="主题"
                      />
                    </label>
                  </div>

                  <div className="field-row field-row--filename">
                    <label className="field field--grow">
                      <span className="field__label">文件名</span>
                      <input
                        type="text"
                        className="field__input"
                        value={selectedNode.fileName}
                        onChange={(e) =>
                          updateSelectedNode({ fileName: e.target.value })
                        }
                      />
                    </label>

                    <div className="field field--switch">
                      <span className="field__label">行号</span>
                      <label className="ui-switch" title="显示行号">
                        <input
                          type="checkbox"
                          checked={selectedNode.showLineNumbers}
                          onChange={(e) =>
                            updateSelectedNode({
                              showLineNumbers: e.target.checked,
                            })
                          }
                        />
                        <span className="ui-switch__track" aria-hidden>
                          <span className="ui-switch__thumb" />
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="field-grid field-grid--sliders">
                    <label className="field field--slider">
                      <span className="field__label">
                        内边距
                        <span className="field__value">
                          {selectedNode.padding}px
                        </span>
                      </span>
                      <input
                        type="range"
                        className="ui-range"
                        min={0}
                        max={64}
                        value={selectedNode.padding}
                        onChange={(e) =>
                          updateSelectedNode({ padding: Number(e.target.value) })
                        }
                      />
                    </label>

                    <label className="field field--slider">
                      <span className="field__label">
                        圆角
                        <span className="field__value">
                          {selectedNode.radius}px
                        </span>
                      </span>
                      <input
                        type="range"
                        className="ui-range"
                        min={0}
                        max={28}
                        value={selectedNode.radius}
                        onChange={(e) =>
                          updateSelectedNode({ radius: Number(e.target.value) })
                        }
                      />
                    </label>

                    <label className="field field--slider">
                      <span className="field__label">
                        宽度
                        <span className="field__value">
                          {selectedNode.width}px
                        </span>
                      </span>
                      <input
                        type="range"
                        className="ui-range"
                        min={280}
                        max={720}
                        value={selectedNode.width}
                        onChange={(e) =>
                          updateSelectedNode({ width: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>

                  <div className="field-grid field-grid--meta">
                    <label className="field">
                      <span className="field__label">背景色</span>
                      <div className="color-field color-field--full">
                        <input
                          type="color"
                          className="color-field__swatch"
                          value={selectedNode.bgColor}
                          onChange={(e) =>
                            updateSelectedNode({ bgColor: e.target.value })
                          }
                          aria-label="背景色"
                          title="背景色"
                        />
                      </div>
                    </label>

                    <label className="field">
                      <span className="field__label">窗口样式</span>
                      <Select
                        value={selectedNode.windowChrome}
                        options={[
                          { value: "mac", label: "macOS" },
                          { value: "windows", label: "Windows" },
                          { value: "none", label: "无" },
                        ]}
                        onChange={(v) =>
                          updateSelectedNode({
                            windowChrome: v as WindowChrome,
                          })
                        }
                        ariaLabel="窗口样式"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div
                className="code-editor"
                style={{
                  background: selectedNode.bgColor,
                  color: selectedEditorColor,
                  "--editor-caret-color": selectedEditorColor,
                } as React.CSSProperties}
              >
                <div
                  ref={editorHighlightRef}
                  className="code-editor__highlight shiki-host"
                  aria-hidden
                  dangerouslySetInnerHTML={{ __html: editorHtml }}
                />
                <textarea
                  ref={textareaRef}
                  className="code-input"
                  value={selectedNode.code}
                  onChange={(e) => updateSelectedNode({ code: e.target.value })}
                  onKeyDown={onEditorKeyDown}
                  onScroll={syncEditorScroll}
                  spellCheck={false}
                  placeholder="在此粘贴或编写代码…"
                  aria-label="代码输入"
                />
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {status && <p className="status">{status}</p>}
        </section>

        <section className="panel canvas-panel">
          <div className="panel-header">
            <h2>
              <IconPhoto size={15} />
              画布
            </h2>
            <span className="hint">
              {nodes.length} 节点 · {edges.length} 连线 · 弧线连接
            </span>
          </div>
          <div className="canvas-shell" style={{ background: canvasBackground }}>
            <NodeCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              canvasBg={canvasBackground}
              onSelectNode={setSelectedNodeId}
              onSelectEdge={setSelectedEdgeId}
              onMoveNode={(id, x, y) =>
                setNodes((prev) =>
                  prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
                )
              }
              onAddEdge={(edge) => setEdges((prev) => [...prev, edge])}
              canvasRef={canvasRef}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
