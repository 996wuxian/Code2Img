import { invoke } from "@tauri-apps/api/core";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "code2img.theme";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function loadTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  const background = theme === "light" ? "#f4f5f7" : "#0b0d12";
  document.documentElement.style.background = background;
  if (document.body) {
    document.body.style.background = background;
  }
  if (isTauri()) {
    void invoke("window_set_theme", { theme }).catch(() => {
      /* host not ready */
    });
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  saveTheme(next);
  return next;
}
