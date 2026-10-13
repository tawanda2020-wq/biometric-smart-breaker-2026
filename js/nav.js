/*
  nav.js — mobile nav toggle, shared across every page.

  No-ops safely on a page with no .nav-toggle button (e.g. login.html,
  whose nav only ever has one link and never needed a hamburger), so the
  same <script> tag can go on every page without a per-page check.
*/
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  const icon = toggle.querySelector("[data-icon]");

  function setOpen(open) {
    nav.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    icon.innerHTML = "";
    icon.removeAttribute("data-rendered");
    icon.setAttribute("data-icon", open ? "x" : "menu");
    renderIcons(toggle);
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("nav-open")));

  // Tapping any link or button inside the menu closes it - without this,
  // navigating to a same-page #anchor (Features, How it works, Safety)
  // leaves the dropdown covering the content it just scrolled to.
  nav.querySelectorAll(".nav-links a, .nav-links button").forEach((el) => {
    el.addEventListener("click", () => setOpen(false));
  });
})();
