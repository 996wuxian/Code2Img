import { DEFAULT_CODE, THEMES } from "./themes";
import { uid } from "./geometry";
import type { CodeNode, Edge } from "./types";

let nodeCounter = 1;

export function createCodeNode(
  partial?: Partial<CodeNode> & { x?: number; y?: number },
): CodeNode {
  const n = nodeCounter++;
  const theme =
    THEMES.find((t) => t.id === (partial?.themeId ?? "github-dark")) ??
    THEMES[0];

  return {
    id: partial?.id ?? uid("node"),
    x: partial?.x ?? 80 + ((n - 1) % 3) * 40,
    y: partial?.y ?? 80 + ((n - 1) % 3) * 40,
    width: partial?.width ?? 420,
    code: partial?.code ?? DEFAULT_CODE,
    language: partial?.language ?? "typescript",
    themeId: partial?.themeId ?? "github-dark",
    fileName: partial?.fileName ?? `snippet-${n}.ts`,
    padding: partial?.padding ?? 0,
    radius: partial?.radius ?? 14,
    bgColor: partial?.bgColor ?? theme.frame,
    showLineNumbers: partial?.showLineNumbers ?? true,
    windowChrome: partial?.windowChrome ?? "mac",
  };
}

export function createStarterGraph(): { nodes: CodeNode[]; edges: Edge[] } {
  nodeCounter = 1;
  const a = createCodeNode({
    id: "node_auth",
    x: 60,
    y: 80,
    fileName: "auth.ts",
    code: `export async function login(user: string, pass: string) {
  const token = await api.auth({ user, pass });
  return token;
}
`,
  });
  const b = createCodeNode({
    id: "node_api",
    x: 560,
    y: 60,
    fileName: "api.ts",
    language: "typescript",
    themeId: "dracula",
    bgColor: "#282a36",
    code: `export const api = {
  auth: async (body: { user: string; pass: string }) => {
    const res = await fetch("/auth", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
};
`,
  });
  const c = createCodeNode({
    id: "node_main",
    x: 300,
    y: 380,
    fileName: "main.ts",
    themeId: "nord",
    bgColor: "#2e3440",
    code: `import { login } from "./auth";

const token = await login("alice", "••••");
console.log("session:", token);
`,
  });

  const edges: Edge[] = [
    {
      id: "edge_main_auth",
      sourceId: c.id,
      targetId: a.id,
      sourcePort: "top",
      targetPort: "bottom",
      color: "#88c0d0",
      label: "import",
    },
    {
      id: "edge_auth_api",
      sourceId: a.id,
      targetId: b.id,
      sourcePort: "right",
      targetPort: "left",
      color: "#6ea8ff",
      label: "calls",
    },
  ];

  return { nodes: [a, b, c], edges };
}
