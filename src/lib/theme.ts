export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "outwork:theme";

/**
 * Inlined into <head> so the theme is on <html> before first paint. Without
 * it a dark-mode user on a light-default OS gets a white flash on every cold
 * load. Deliberately dependency-free and stringified — it runs before any
 * bundle has parsed.
 */
/** Surface colours, mirrored from globals.css. Used for the browser chrome
 *  meta, which has to be a literal — it can't read a CSS variable. */
export const THEME_BG = { light: "#faf9f6", dark: "#0a0a0b" } as const;

/** id on the JS-managed theme-color meta. Next emits its own media-scoped
 *  pair from viewport config; ours is appended last and carries no media
 *  attribute, so it wins whenever there's an explicit choice. */
const CHROME_META_ID = "theme-color-override";

export const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var c = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (c === 'light' || c === 'dark') {
      document.documentElement.setAttribute('data-theme', c);
      var m = document.createElement('meta');
      m.id = '${CHROME_META_ID}';
      m.name = 'theme-color';
      m.content = c === 'light' ? '${THEME_BG.light}' : '${THEME_BG.dark}';
      document.head.appendChild(m);
    }
    // 'system' or unset: leave the attribute off and let the
    // prefers-color-scheme block in globals.css + Next's media-scoped
    // theme-color metas decide.
  } catch (e) {}
})();
`;

export function getStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * Persist the choice and apply it immediately. "system" removes the attribute
 * so the media query takes over again.
 */
export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode / blocked storage: the attribute still applies for this
    // session, it just won't survive a reload.
  }
  syncBrowserChrome(choice);
}

/**
 * Keep the mobile browser/status bar colour in step with the theme.
 *
 * Writes a dedicated, media-less meta rather than editing the first
 * theme-color it finds — Next emits a media-scoped pair from viewport
 * config, and mutating one of those would set the wrong colour for the
 * wrong scheme. On "system" we remove ours and hand control back to that
 * pair.
 */
export function syncBrowserChrome(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(CHROME_META_ID);
  if (choice === "system") {
    existing?.remove();
    return;
  }
  const meta =
    (existing as HTMLMetaElement | null) ??
    (() => {
      const m = document.createElement("meta");
      m.id = CHROME_META_ID;
      m.name = "theme-color";
      document.head.appendChild(m);
      return m;
    })();
  meta.content = THEME_BG[choice];
}

/** True when the given choice currently resolves to a light surface. */
export function resolvesToLight(choice: ThemeChoice): boolean {
  if (choice === "light") return true;
  if (choice === "dark") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}
