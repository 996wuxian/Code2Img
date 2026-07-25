export type WindowChrome = "mac" | "windows" | "none";

export type PortSide = "left" | "right" | "top" | "bottom";

export type CodeNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  code: string;
  language: string;
  themeId: string;
  fileName: string;
  padding: number;
  radius: number;
  bgColor: string;
  showLineNumbers: boolean;
  windowChrome: WindowChrome;
};

export type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: PortSide;
  targetPort: PortSide;
  color: string;
  label?: string;
};

export type ConnectingState = {
  sourceId: string;
  sourcePort: PortSide;
  mouseX: number;
  mouseY: number;
  targetId?: string;
  targetPort?: PortSide;
};

export type Point = { x: number; y: number };
