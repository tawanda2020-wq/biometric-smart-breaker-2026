/*
  icons.js — small shared set of inline SVG icons (Feather-style: 24x24,
  stroke-based, currentColor). No external icon font/CDN needed.

  Usage: <span class="icon" data-icon="lock"></span>  then call renderIcons()
  once the DOM is ready (each page's inline script does this).
*/
const ICONS = {
  lock: '<path d="M5 11h14v10H5z"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3z"/>',
  "shield-check": '<path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  wifi: '<path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5 12.5a11 11 0 0 1 14 0"/><path d="M8.5 16.5a6 6 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/>',
  "wifi-off": '<path d="M2 2l20 20"/><path d="M8.5 16.5a6 6 0 0 1 7 0"/><path d="M5 12.5a11 11 0 0 1 5.5-3"/><path d="M19 12.5a11 11 0 0 0-3.5-2.5"/><path d="M2 8.5a16 16 0 0 1 4.5-2.8"/><path d="M22 8.5a16 16 0 0 0-4-2.5"/><circle cx="12" cy="20" r="1"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M17.94 17.94A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.3 3.4"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>',
  power: '<path d="M12 2v8"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  "check-circle": '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
  "x-circle": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  "alert-triangle": '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 3-1 5-2 6.5"/><path d="M12 6a6 6 0 0 1 6 6c0 1.5-.1 2.8-.4 4"/><path d="M15 9.5a4 4 0 0 1 .5 4.5"/><path d="M8.5 20a12 12 0 0 0 1.2-2.3"/><path d="M12 2a10 10 0 0 0-8.6 15"/><path d="M20.6 17A10 10 0 0 0 22 12a10 10 0 0 0-1.5-5.3"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  "plus-circle": '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  "arrow-left": '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  "rotate-cw": '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
};

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    if (ICONS[name] && !el.dataset.rendered) {
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
      el.dataset.rendered = "true";
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => renderIcons());
}
