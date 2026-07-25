import { codeToHtml } from "shiki";

const cache = new Map<string, string>();

function cacheKey(code: string, language: string, themeId: string) {
  return `${themeId}::${language}::${code}`;
}

export async function highlightCode(
  code: string,
  language: string,
  themeId: string,
): Promise<string> {
  const key = cacheKey(code, language, themeId);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const html = await codeToHtml(code || " ", {
      lang: language,
      theme: themeId,
    });
    cache.set(key, html);
    return html;
  } catch {
    const html = await codeToHtml(code || " ", {
      lang: "text",
      theme: themeId,
    });
    cache.set(key, html);
    return html;
  }
}
