/*
  toast.js — small shared toast/notification system.

  Usage:
    showToast({ type: "success", title: "Operator registered", message: "...", icon: "check-circle" });

  type: "success" | "error" | "warn" | "info" (default "info")
  duration: ms before auto-dismiss (default 5000; pass 0 to keep until closed)
*/
(function () {
  const ICON_CHIP_CLASS = { success: "green", error: "red", warn: "amber", info: "blue" };
  const DEFAULT_ICON = { success: "check-circle", error: "x-circle", warn: "alert-triangle", info: "bell" };
  const MAX_VISIBLE = 4; // a burst (e.g. a device syncing a backlog) shouldn't pile up forever

  function ensureStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.showToast = function ({ type = "info", title = "", message = "", icon, duration = 5000 } = {}) {
    const stack = ensureStack();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="icon-chip ${ICON_CHIP_CLASS[type] || "blue"}">
        <span class="icon" data-icon="${icon || DEFAULT_ICON[type] || "bell"}"></span>
      </div>
      <div class="toast-body">
        ${title ? `<p class="toast-title">${title}</p>` : ""}
        ${message ? `<p class="toast-msg">${message}</p>` : ""}
      </div>
      <button class="toast-close" aria-label="Dismiss"><span class="icon" data-icon="x"></span></button>
      ${duration > 0 ? `<div class="toast-bar" style="animation-duration:${duration}ms"></div>` : ""}
    `;

    function close() {
      if (el.classList.contains("closing")) return;
      el.classList.add("closing");
      setTimeout(() => el.remove(), 260);
    }

    el.querySelector(".toast-close").addEventListener("click", close);
    stack.appendChild(el);

    // Oldest-first overflow: if we're over the visible cap, close the
    // oldest ones immediately rather than letting the stack grow forever.
    const existing = Array.from(stack.children).filter((c) => !c.classList.contains("closing"));
    while (existing.length > MAX_VISIBLE) {
      const oldest = existing.shift();
      oldest.classList.add("closing");
      setTimeout(() => oldest.remove(), 260);
    }

    if (typeof renderIcons === "function") renderIcons(el);
    if (duration > 0) setTimeout(close, duration);
    return { close };
  };
})();
