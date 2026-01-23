const STORAGE_PREFIX = "cr_";

export function readSetting(key, fallback) {
  const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return value ?? fallback;
}

export function writeSetting(key, value) {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
}

export function applySettings(settings) {
  const root = document.documentElement;
  root.setAttribute("data-theme", settings.theme);
  root.style.setProperty(
    "--reader-font-family",
    settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)"
  );
  root.style.setProperty("--reader-font-weight", settings.weight);
  root.style.setProperty("--reader-font-size", `${settings.size}px`);
}
