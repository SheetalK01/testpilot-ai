// Applies the saved (or system) theme before first paint to avoid a light/dark flash.
// Kept as a file rather than an inline script so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem('tp_theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    // Storage unavailable: fall back to the light theme.
  }
})();
