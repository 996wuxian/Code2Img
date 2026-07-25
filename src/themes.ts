export type ThemeOption = {
  id: string;
  label: string;
  /** Outer card background when not using transparent */
  frame: string;
};

/** Popular Shiki themes for code screenshots */
export const THEMES: ThemeOption[] = [
  { id: "github-dark", label: "GitHub Dark", frame: "#0d1117" },
  { id: "github-light", label: "GitHub Light", frame: "#ffffff" },
  { id: "dracula", label: "Dracula", frame: "#282a36" },
  { id: "nord", label: "Nord", frame: "#2e3440" },
  { id: "one-dark-pro", label: "One Dark Pro", frame: "#282c34" },
  { id: "monokai", label: "Monokai", frame: "#272822" },
  { id: "tokyo-night", label: "Tokyo Night", frame: "#1a1b26" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha", frame: "#1e1e2e" },
  { id: "catppuccin-latte", label: "Catppuccin Latte", frame: "#eff1f5" },
  { id: "material-theme-darker", label: "Material Darker", frame: "#212121" },
  { id: "solarized-dark", label: "Solarized Dark", frame: "#002b36" },
  { id: "solarized-light", label: "Solarized Light", frame: "#fdf6e3" },
  { id: "vitesse-dark", label: "Vitesse Dark", frame: "#121212" },
  { id: "vitesse-light", label: "Vitesse Light", frame: "#ffffff" },
  { id: "night-owl", label: "Night Owl", frame: "#011627" },
  { id: "min-dark", label: "Min Dark", frame: "#1f1f1f" },
  { id: "min-light", label: "Min Light", frame: "#ffffff" },
  { id: "rose-pine", label: "Rosé Pine", frame: "#191724" },
  { id: "synthwave-84", label: "Synthwave '84", frame: "#2b213a" },
  { id: "poimandres", label: "Poimandres", frame: "#1b1e28" },
];

export const LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "tsx", label: "TSX" },
  { id: "jsx", label: "JSX" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "dart", label: "Dart" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "scss", label: "SCSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "toml", label: "TOML" },
  { id: "markdown", label: "Markdown" },
  { id: "sql", label: "SQL" },
  { id: "shell", label: "Shell" },
  { id: "powershell", label: "PowerShell" },
  { id: "dockerfile", label: "Dockerfile" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "text", label: "Plain Text" },
] as const;

export const DEFAULT_CODE = `function greet(name: string) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

greet("code2img");
`;
