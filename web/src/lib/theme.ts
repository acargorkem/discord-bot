/** Başlangıç temasını uygular (kayıtlı tercih veya sistem tercihi). Koyu ise true döner. */
export function initTheme(): boolean {
  const saved = localStorage.getItem("theme");
  const dark = saved
    ? saved === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

/** Temayı ayarlar ve tercihi saklar. */
export function setTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}
