import { domToPng } from "modern-screenshot";

async function elementToPngBlob(element: HTMLElement): Promise<Blob> {
  const dataUrl = await domToPng(element, {
    scale: 2,
    quality: 1,
    backgroundColor: null,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  // Clipboard expects an explicit image/png type
  if (blob.type === "image/png") return blob;
  return new Blob([blob], { type: "image/png" });
}

/** Copy rendered element as PNG into the system clipboard (paste into chat / docs). */
export async function copyElementAsPng(element: HTMLElement): Promise<void> {
  const blob = await elementToPngBlob(element);

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
): Promise<void> {
  const blob = await elementToPngBlob(element);
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
