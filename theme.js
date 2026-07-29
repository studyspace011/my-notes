(function () {
  const THEME_KEY = "econ_pwa_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.documentElement.setAttribute("data-theme", "light");
    }
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    const btns = document.querySelectorAll("#theme-toggle-btn, .floating-theme-btn");
    btns.forEach(btn => {
      const isDark = theme === "dark";
      btn.innerHTML = isDark ? 
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>` : 
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    });
  }

  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme);

  window.addEventListener("DOMContentLoaded", () => {
    applyTheme(getPreferredTheme());
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#theme-toggle-btn, .floating-theme-btn");
      if (btn) {
        const active = document.documentElement.classList.contains("dark-mode") ? "light" : "dark";
        applyTheme(active);
      }
    });
  });
})();