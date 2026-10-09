/*
  dashboard.js - operator registration, animated live status, and history.

  Schema note: every timestamp in this database is Unix SECONDS (to match
  the ESP32's NTP-synced clock), not JavaScript's millisecond Date.now().
  Always store Math.floor(Date.now() / 1000), and multiply by 1000 again
  when turning a stored value back into a JS Date.
*/

requireLogin();

document.getElementById("logoutBtn").addEventListener("click", logout);

// Password show/hide on the registration form (same pattern as login.html)
(function () {
  const input = document.getElementById("regPassword");
  const toggle = document.getElementById("regPwToggle");
  const icon = toggle.querySelector("[data-icon]");
  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.innerHTML = "";
    icon.removeAttribute("data-rendered");
    icon.setAttribute("data-icon", show ? "eye-off" : "eye");
    renderIcons(toggle);
  });
})();

// ---------------------------------------------------------------------------
// SHA-256 helper (matches firebase_sha256Hex() on the ESP32 - same
// algorithm, same lowercase-hex output, so a password typed on the keypad
// hashes to the same string as one typed here).
// ---------------------------------------------------------------------------
async function sha256Hex(message) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return "Unknown";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function timeAgo(unixSeconds) {
  if (!unixSeconds) return "never";
  const diff = nowSeconds() - unixSeconds;
  if (diff < 5) return "just now";
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// Brief "pop" + colour flash on a KPI number when its value actually changes,
// so an admin glancing at the dashboard notices new activity without having
// to compare numbers themselves.
function setNumberAnimated(elId, value) {
  const el = document.getElementById(elId);
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.remove("num-pop");
    void el.offsetWidth; // restart the animation if it's still running
    el.classList.add("num-pop");
  }
}

// ---------------------------------------------------------------------------
// Live breaker status - animated orb + detailed plain-language notes
// ---------------------------------------------------------------------------
const STALE_AFTER_SEC = 20; // no heartbeat for this long -> show device Offline

let lastKnownBreaker = {};
let previousIsOn = null;  // used to detect ON<->OFF transitions for the flip animation + toast
let previousFresh = null; // used to detect device online<->offline transitions for a toast

function renderBreakerStatus() {
  const b = lastKnownBreaker;
  const isOn = b.status === "ON";
  const fresh = b.lastSeen && (nowSeconds() - b.lastSeen) < STALE_AFTER_SEC;

  const orb = document.getElementById("breakerOrb");
  const statusText = document.getElementById("statusText");
  const statusSub = document.getElementById("statusSub");

  orb.classList.toggle("is-on", isOn);
  orb.classList.toggle("is-off", !isOn);
  if (previousIsOn !== null && previousIsOn !== isOn) {
    orb.classList.add("is-flip");
    setTimeout(() => orb.classList.remove("is-flip"), 550);
    showToast({
      type: isOn ? "success" : "info",
      icon: "power",
      title: isOn ? "Breaker turned ON" : "Breaker turned OFF",
      message: isOn
        ? `Energised by ${b.lastOperator || "an operator"}.`
        : "De-energised - back to the safe resting state.",
    });
  }
  previousIsOn = isOn;

  // Only meaningful once we've actually heard from the device at least once -
  // skip the toast on the very first render so loading the page doesn't
  // immediately announce "device online".
  if (b.status && previousFresh !== null && previousFresh !== fresh) {
    showToast({
      type: fresh ? "success" : "warn",
      icon: fresh ? "wifi" : "wifi-off",
      title: fresh ? "Device back online" : "Device offline",
      message: fresh
        ? "Receiving live status again."
        : "No heartbeat for " + STALE_AFTER_SEC + "s. Local safety is unaffected.",
    });
  }
  previousFresh = fresh;

  statusText.textContent = isOn ? "Breaker ON" : "Breaker OFF";
  statusSub.textContent = isOn
    ? "Energised - relay closed, MCB lever in the ON position."
    : "De-energised - this is the safe default state.";

  document.getElementById("lastOperator").textContent = b.lastOperator || "-";
  document.getElementById("lastEventTime").textContent = formatTime(b.lastEventTime);

  const deviceEl = document.getElementById("deviceOnline");
  deviceEl.textContent = fresh ? "Online" : "Offline";
  deviceEl.className = "value " + (fresh ? "status-online" : "status-offline");

  const connIndicator = document.getElementById("connIndicator");
  connIndicator.innerHTML = fresh
    ? '<span class="icon icon-sm" data-icon="wifi"></span> Device online'
    : '<span class="icon icon-sm" data-icon="wifi-off"></span> Device offline';
  connIndicator.className = "small flex items-center gap-12 " + (fresh ? "status-online" : "status-offline");
  renderIcons(connIndicator);

  // Detailed, plain-language explanation of what's happening right now.
  const note = document.getElementById("statusNote");
  note.classList.remove("warn");
  if (!b.status) {
    note.innerHTML = `<span class="icon" data-icon="activity"></span>
      <span>No status has been received from the device yet. Once it powers up and
      reaches Wi-Fi, its first heartbeat will appear here automatically.</span>`;
  } else if (!fresh) {
    note.classList.add("warn");
    note.innerHTML = `<span class="icon" data-icon="alert-triangle"></span>
      <span><strong>This status may be stale</strong> - the device hasn't checked in for
      over ${STALE_AFTER_SEC} seconds (last seen ${timeAgo(b.lastSeen)}). This does
      <strong>not</strong> affect the breaker itself: local authentication and the
      hardwired OFF path keep working at the device regardless of its connection
      to this dashboard.</span>`;
  } else if (isOn) {
    note.innerHTML = `<span class="icon" data-icon="check-circle"></span>
      <span><strong>${escapeHtml(b.lastOperator || "An operator")}</strong> authenticated
      successfully (fingerprint + PIN, confirmed within the 30-second window)
      and the breaker energised. The hardwired cutoff is armed and will de-energise
      instantly on a button press or an MCB trip, independent of this dashboard or
      the controller's state.</span>`;
  } else {
    note.innerHTML = `<span class="icon" data-icon="power"></span>
      <span>The breaker is de-energised and the device is idle, waiting for an
      operator to scan a fingerprint. This is the safe resting state - nothing
      energises until a full dual-factor login succeeds at the physical unit.</span>`;
  }
  renderIcons(note);

  document.getElementById("lastSync").textContent = "Checked " + new Date().toLocaleTimeString();
}

db.ref("breaker").on("value", (snap) => {
  lastKnownBreaker = snap.val() || {};
  renderBreakerStatus();
});

// Re-check staleness every few seconds even without new Firebase data,
// so a device that silently dies still flips to "Offline" on screen.
setInterval(renderBreakerStatus, 5000);

// ---------------------------------------------------------------------------
// Operator registration + roster
// ---------------------------------------------------------------------------
const registerForm = document.getElementById("registerForm");
const regMsg = document.getElementById("regMsg");

// Shows a form message and auto-hides it after autoHideMs (0 = stays up,
// used for nothing currently but kept as an option) - a success/error
// message that never clears reads as stuck/stale once the admin has moved
// on, especially next to a form that's since been reset for the next entry.
let regMsgHideTimer = null;
function setRegMsg(text, cls, autoHideMs = 8000) {
  clearTimeout(regMsgHideTimer);
  regMsg.textContent = text;
  regMsg.className = "form-msg " + cls + " show";
  if (autoHideMs > 0) {
    regMsgHideTimer = setTimeout(() => regMsg.classList.remove("show"), autoHideMs);
  }
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;
  const submitBtn = registerForm.querySelector("button[type=submit]");

  regMsg.className = "form-msg";
  if (!username) {
    setRegMsg("Enter a username.", "err");
    return;
  }
  // Exactly 4 digits, nothing else - the physical keypad is 0-9/A-D/*/#,
  // and * and # are reserved there as backspace/confirm, so anything other
  // than plain digits risks a PIN the operator literally cannot type in.
  if (!/^[0-9]{4}$/.test(password)) {
    setRegMsg("PIN must be exactly 4 digits (0-9 only).", "err");
    return;
  }

  submitBtn.disabled = true;
  try {
    const passwordHash = await sha256Hex(password);
    await db.ref("operators").push({
      username,
      passwordHash,
      fingerprintId: -1,
      status: "pending_enrollment",
      createdAt: nowSeconds(),
    });
    setRegMsg("Registered. Ask " + username + " to scan their finger at the device to finish enrolment.", "ok");
    showToast({
      type: "success",
      icon: "fingerprint",
      title: "Operator registered",
      message: `${username} is pending enrolment - ask them to scan at the device.`,
    });
    registerForm.reset();
  } catch (err) {
    setRegMsg("Could not register operator: " + err.message, "err");
    showToast({ type: "error", title: "Registration failed", message: err.message });
  } finally {
    submitBtn.disabled = false;
  }
});

let knownOperatorIds = null;   // null = haven't rendered yet (first snapshot shouldn't "flash" every row)
let knownOperatorStatus = {};  // id -> last-seen DISPLAY status (enrolled / pending_enrollment / timed_out),
                                // so we can toast exactly once on each transition
let lastOperatorsSnapshot = null;

// How long an operator can sit at "pending scan" before the dashboard flags
// it instead of leaving the admin staring at "Pending scan" forever with no
// idea whether it's still in progress or has quietly stalled (e.g. the
// device was offline, or the operator never showed up to the sensor).
const ENROLLMENT_TIMEOUT_SEC = 60;

function renderOperators(operatorsObj) {
  lastOperatorsSnapshot = operatorsObj;
  const tbody = document.getElementById("operatorsBody");
  const entries = Object.entries(operatorsObj || {});
  setNumberAnimated("statOperators", entries.length);
  if (entries.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No operators registered yet.</td></tr>';
    knownOperatorIds = new Set();
    return;
  }
  entries.sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  const isFirstRender = knownOperatorIds === null;
  const nextKnown = new Set();
  const nextStatus = {};

  tbody.innerHTML = entries.map(([id, op], i) => {
    nextKnown.add(id);
    const enrolled = op.status === "enrolled";
    const timedOut = !enrolled && (nowSeconds() - (op.createdAt || 0)) > ENROLLMENT_TIMEOUT_SEC;
    const displayStatus = enrolled ? "enrolled" : timedOut ? "timed_out" : "pending_enrollment";
    nextStatus[id] = displayStatus;

    if (!isFirstRender && knownOperatorStatus[id] === "pending_enrollment" && enrolled) {
      showToast({
        type: "success",
        icon: "check-circle",
        title: "Fingerprint enrolled",
        message: `${op.username} can now authenticate at the device (ID #${op.fingerprintId}).`,
      });
    } else if (!isFirstRender && knownOperatorStatus[id] === "pending_enrollment" && timedOut) {
      showToast({
        type: "warn",
        icon: "alert-triangle",
        title: "Enrolment timed out",
        message: `${op.username} didn't scan within ${ENROLLMENT_TIMEOUT_SEC}s - retry below once they're at the device.`,
      });
    }

    const isNew = !isFirstRender && knownOperatorIds && !knownOperatorIds.has(id);
    const rail = enrolled ? "rail-on" : timedOut ? "rail-denied" : "rail-timeout";
    const badgeClass = enrolled ? "badge-on" : timedOut ? "badge-denied" : "badge-timeout";
    const badgeIcon = enrolled ? "check-circle" : timedOut ? "alert-triangle" : "clock";
    const badgeLabel = enrolled ? "Enrolled" : timedOut ? "Timed out" : "Pending scan";
    const retryBtn = timedOut
      ? `<button type="button" class="btn btn-secondary btn-sm retry-enrol-btn" data-id="${id}" data-username="${escapeHtml(op.username)}">Retry</button>`
      : "";

    return `<tr class="row-in row-rail ${rail} ${isNew ? "row-new" : ""}" style="animation-delay:${i * 0.03}s">
      <td><span class="row-icon"><span class="icon icon-sm" data-icon="user"></span>${escapeHtml(op.username)}</span></td>
      <td>${enrolled ? "#" + op.fingerprintId : "-"}</td>
      <td class="flex items-center gap-12">
        <span class="badge ${badgeClass}">
          <span class="icon" data-icon="${badgeIcon}"></span>
          ${badgeLabel}
        </span>
        ${retryBtn}
      </td>
    </tr>`;
  }).join("");
  renderIcons(tbody);
  knownOperatorIds = nextKnown;
  knownOperatorStatus = nextStatus;
}

db.ref("operators").on("value", (snap) => renderOperators(snap.val()));

// Re-check timeouts every few seconds even without new Firebase data - a
// stalled enrolment's status doesn't change in the database (it just sits at
// "pending_enrollment"), only the elapsed time does, so without this tick
// the dashboard would never notice it crossed ENROLLMENT_TIMEOUT_SEC.
setInterval(() => renderOperators(lastOperatorsSnapshot), 5000);

// Delegated click handler (not re-attached per row) - restarts an operator's
// enrolment window by resetting createdAt, giving them a fresh
// ENROLLMENT_TIMEOUT_SEC without re-entering their username/password. The
// ESP32 is already polling for any operator with status "pending_enrollment"
// every ENROLL_POLL_INTERVAL_MS, so this alone is enough to put them back
// in its queue.
document.getElementById("operatorsBody").addEventListener("click", async (e) => {
  const btn = e.target.closest(".retry-enrol-btn");
  if (!btn) return;
  const { id, username } = btn.dataset;
  btn.disabled = true;
  try {
    await db.ref("operators/" + id).update({ createdAt: nowSeconds() });
    showToast({
      type: "info",
      icon: "refresh-cw",
      title: "Enrolment restarted",
      message: `${username} has another ${ENROLLMENT_TIMEOUT_SEC}s to scan at the device.`,
    });
  } catch (err) {
    showToast({ type: "error", title: "Couldn't restart enrolment", message: err.message });
    btn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// History (event log): stats + newest-first scrollable table
// ---------------------------------------------------------------------------
const EVENT_LOG_LIMIT = 50;

const EVENT_META = {
  ON:      { badge: "badge-on",      icon: "check-circle" },
  OFF:     { badge: "badge-off",     icon: "power" },
  DENIED:  { badge: "badge-denied",  icon: "x-circle" },
  TIMEOUT: { badge: "badge-timeout", icon: "clock" },
  LOCKOUT: { badge: "badge-lockout", icon: "lock" },
};

const EVENT_RAIL = { ON: "rail-on", OFF: "rail-off", DENIED: "rail-denied", TIMEOUT: "rail-timeout", LOCKOUT: "rail-lockout" };
const EVENT_TOAST_TYPE = { ON: "success", OFF: "info", DENIED: "error", TIMEOUT: "warn", LOCKOUT: "error" };

let knownEventIds = null; // null = haven't rendered yet - don't flash/toast the initial 50 on page load

function renderEvents(eventsObj) {
  const tbody = document.getElementById("eventsBody");
  const entries = Object.entries(eventsObj || {});

  setNumberAnimated("statTotal", entries.length);
  setNumberAnimated("statOn", entries.filter(([, e]) => e.type === "ON").length);
  setNumberAnimated("statDenied", entries.filter(([, e]) => e.type === "DENIED").length);

  if (entries.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No events yet.</td></tr>';
    knownEventIds = new Set();
    return;
  }
  entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

  const isFirstRender = knownEventIds === null;
  const nextKnown = new Set();
  const freshlyArrived = [];

  tbody.innerHTML = entries.map(([id, ev], i) => {
    nextKnown.add(id);
    const meta = EVENT_META[ev.type] || { badge: "badge-off", icon: "activity" };
    const isNew = !isFirstRender && knownEventIds && !knownEventIds.has(id);
    if (isNew) freshlyArrived.push(ev);
    return `<tr class="row-in row-rail ${EVENT_RAIL[ev.type] || ""} ${isNew ? "row-new" : ""}" style="animation-delay:${i * 0.02}s">
      <td>${formatTime(ev.timestamp)}</td>
      <td>${escapeHtml(ev.operator || "-")}</td>
      <td><span class="badge ${meta.badge}"><span class="icon" data-icon="${meta.icon}"></span>${escapeHtml(ev.type || "?")}</span></td>
      <td>${escapeHtml(ev.result || "")}</td>
    </tr>`;
  }).join("");
  renderIcons(tbody);
  knownEventIds = nextKnown;

  // Toast genuinely new events (not the initial page-load batch). Capped so
  // a device that was offline for a while and syncs a backlog doesn't fire
  // a wall of toasts at once.
  freshlyArrived.slice(0, 3).forEach((ev) => {
    showToast({
      type: EVENT_TOAST_TYPE[ev.type] || "info",
      icon: (EVENT_META[ev.type] || {}).icon || "activity",
      title: `New event: ${ev.type || "?"}`,
      message: `${ev.operator || "Unknown"} - ${ev.result || ""}`,
    });
  });
  if (freshlyArrived.length > 3) {
    showToast({ type: "info", icon: "list", title: "More events synced", message: `+${freshlyArrived.length - 3} more in the table below.` });
  }
}

db.ref("events").limitToLast(EVENT_LOG_LIMIT).on("value", (snap) => renderEvents(snap.val()));
