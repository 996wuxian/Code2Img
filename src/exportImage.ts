import { domToPng } from "modern-screenshot";

type CaptureOptions = {
  width?: number;
  height?: number;
  detached?: boolean;
};

function createDetachedCaptureNode(
  element: HTMLElement,
  width?: number,
  height?: number,
): { node: HTMLElement; cleanup: () => void } {
  const clone = element.cloneNode(true) as HTMLElement;
  const captureWidth = width ?? element.scrollWidth;
  const captureHeight = height ?? element.scrollHeight;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${captureWidth}px`,
    height: `${captureHeight}px`,
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "-2147483648",
  });

  Object.assign(clone.style, {
    width: `${captureWidth}px`,
    height: `${captureHeight}px`,
    minWidth: `${captureWidth}px`,
    minHeight: `${captureHeight}px`,
    overflow: "visible",
  });

  host.appendChild(clone);
  document.body.appendChild(host);

  return {
    node: clone,
    cleanup: () => host.remove(),
  };
}

async function elementToPngBlob(
  element: HTMLElement,
  options: CaptureOptions = {},
): Promise<Blob> {
  const capture = options.detached
    ? createDetachedCaptureNode(element, options.width, options.height)
    : { node: element, cleanup: () => undefined };

  try {
    const dataUrl = await domToPng(capture.node, {
      width: options.width,
      height: options.height,
      style:
        options.width || options.height
          ? {
              width: options.width ? `${options.width}px` : undefined,
              height: options.height ? `${options.height}px` : undefined,
              minWidth: options.width ? `${options.width}px` : undefined,
              minHeight: options.height ? `${options.height}px` : undefined,
              overflow: "visible",
            }
          : undefined,
      scale: 2,
      quality: 1,
      backgroundColor: null,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // Clipboard expects an explicit image/png type
    if (blob.type === "image/png") return blob;
    return new Blob([blob], { type: "image/png" });
  } finally {
    capture.cleanup();
  }
}

/** Copy rendered element as PNG into the system clipboard (paste into chat / docs). */
export async function copyElementAsPng(
  element: HTMLElement,
  options?: CaptureOptions,
): Promise<void> {
  const blob = await elementToPngBlob(element, options);

  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("当前环境不支持复制图片到剪贴板");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

/** Download rendered element as a PNG file. */
export async function exportElementAsPng(
  element: HTMLElement,
  filename = "code2img.png",
  options?: CaptureOptions,
): Promise<void> {
  const blob = await elementToPngBlob(element, options);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function suggestedFilename(lang: string, theme: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `code2img-${lang}-${theme}-${stamp}.png`;
}
