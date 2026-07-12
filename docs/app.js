/*! WP Serial Fix | Copyright (c) 2026 Jayden Yoon ZK | MIT License | https://github.com/JaydenYoonZK/wp-serial-fix */
import { process, isSerialized, byteLength, serialize } from "./serial.js?v=1.3.25";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const input = $("input");
const actionBtn = $("run");
const clearBtn = $("clear");

// Enable the action and Clear buttons only when the box has content. An empty
// box means nothing to run and nothing to clear, so both are disabled (dimmed,
// dashed edge, not-allowed cursor).
function syncControls() {
  const hasContent = input.value.trim().length > 0;
  actionBtn.disabled = !hasContent;
  clearBtn.disabled = !hasContent;
}
input.addEventListener("input", syncControls);
const results = $("results");
const summary = $("summary");
const blocks = $("blocks");
const replaceFields = $("replace-fields");

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function syncMode() {
  replaceFields.style.display = currentMode() === "repair" ? "none" : "flex";
}

function highlight(before, after) {
  // Show the output; if it differs from input, it changed.
  return esc(after);
}

function run() {
  syncControls();
  const text = input.value;
  if (!text.trim()) { results.hidden = true; return; }
  results.hidden = false;

  const mode = currentMode();
  const out = process(text, {
    mode,
    find: $("find").value,
    replace: $("replace").value,
    regex: $("regex").checked
  });

  let changed = 0, serialized = 0, failed = 0, repaired = 0;
  blocks.innerHTML = out.results.map((r, idx) => {
    if (r.kind === "serialized") serialized++;
    if (!r.ok) failed++;
    if (r.output !== r.input) changed++;
    if (r.repaired) repaired += r.repaired;

    const valid = isSerialized(r.output.trim());
    let badge, tone;
    if (!r.ok) { badge = "COULD NOT PROCESS"; tone = "phantom"; }
    else if (mode === "repair") { badge = r.repaired ? `REPAIRED ${r.repaired}` : "ALREADY VALID"; tone = r.repaired ? "warn" : "ok"; }
    else if (r.kind === "serialized") { badge = valid ? "SERIALIZED, SAFE" : "CHECK"; tone = valid ? "ok" : "warn"; }
    else { badge = "PLAIN TEXT"; tone = "default"; }

    const meta = !r.ok ? esc(r.error || "Could not process this value")
      : r.kind === "serialized" && valid
      ? `valid serialized data, ${byteLength(r.output)} bytes`
      : r.kind === "plain" ? "not serialized, plain replace applied"
      : r.error ? esc(r.error) : "";

    return `<div class="sblock">
      <div class="sblock-head"><span class="verdict ${tone}">${badge}</span><span>${esc(meta)}</span></div>
      <div class="sblock-body">
        <button class="copy-one primary" type="button" data-i="${idx}">Copy</button>
        <pre id="out-${idx}">${highlight(r.input, r.output)}</pre>
      </div>
    </div>`;
  }).join("");

  const chips = [];
  if (mode === "repair") {
    if (failed) chips.push(`<span class="chip red"><strong>${failed}</strong> could not be repaired safely</span>`);
    if (repaired) chips.push(`<span class="chip amber"><strong>${repaired}</strong> length prefix${repaired === 1 ? "" : "es"} repaired</span>`);
    if (!failed && !repaired) chips.push(`<span class="chip ok">Nothing to repair, the data was already valid</span>`);
  } else {
    if (changed) chips.push(`<span class="chip green"><strong>${changed}</strong> value${changed === 1 ? "" : "s"} changed</span>`);
    else if (!failed) chips.push(`<span class="chip">No matches for that search term</span>`);
    if (serialized) chips.push(`<span class="chip"><strong>${serialized}</strong> serialized, lengths recalculated</span>`);
    if (failed) chips.push(`<span class="chip red"><strong>${failed}</strong> could not be processed</span>`);
  }
  summary.innerHTML = chips.join("");

  for (const btn of blocks.querySelectorAll(".copy-one")) {
    btn.addEventListener("click", async () => {
      const pre = $("out-" + btn.dataset.i);
      try { await navigator.clipboard.writeText(pre.textContent); } catch { /* ignore */ }
      const prev = btn.textContent; btn.textContent = "Copied ✓";
      setTimeout(() => { btn.textContent = prev; }, 1400);
    });
  }
}

for (const el of document.querySelectorAll('input[name="mode"]')) {
  el.addEventListener("change", () => { syncMode(); run(); });
}
$("run").addEventListener("click", run);
$("find").addEventListener("input", run);
$("replace").addEventListener("input", run);
$("regex").addEventListener("change", run);
input.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
});

function loadSample() {
  document.querySelector('input[name="mode"][value="replace"]').checked = true;
  syncMode();
  // Build the sample from the serializer so every length prefix is correct.
  const str = (v) => ({ type: "str", v });
  const sample = {
    type: "array",
    items: [
      [str("home"), str("http://old.example")],
      [str("siteurl"), str("http://old.example")],
      [str("about"), str("http://old.example/about-us")]
    ]
  };
  input.value = serialize(sample);
  $("find").value = "http://old.example";
  $("replace").value = "https://new-and-longer.example.org";
  run();
}
$("sample").addEventListener("click", () => { loadSample(); input.scrollIntoView({ behavior: "smooth", block: "center" }); });

const pasteBtn = $("paste");
const pasteLabel = pasteBtn.textContent;
let pasteFlashTimer = 0;
let waitingForPaste = false;
function flashPaste(msg) {
  pasteBtn.textContent = msg;
  clearTimeout(pasteFlashTimer);
  pasteFlashTimer = setTimeout(() => { pasteBtn.textContent = pasteLabel; }, 2600);
}
pasteBtn.addEventListener("click", async () => {
  // Read the clipboard on every device. On iOS the system shows its Paste
  // confirmation bubble at the tap point; confirming it fills the box and
  // processes in one motion. That bubble is the minimum iOS allows before
  // a page may read the clipboard.
  try {
    const text = await navigator.clipboard.readText();
    if (text) { input.value = text; run(); return; }
    flashPaste("Clipboard is empty");
    return;
  } catch { /* declined or unsupported, fall back to a manual paste */ }
  waitingForPaste = true;
  input.focus();
  input.select(); // a manual paste then replaces the old content
  flashPaste(matchMedia("(pointer: coarse)").matches
    ? "Long-press the box, then Paste"
    : (navigator.platform?.includes("Mac") ? "Press ⌘V to paste" : "Press Ctrl+V to paste"));
});
// If the clipboard read was declined, processing still runs the moment a
// manual paste lands in the box.
input.addEventListener("paste", () => {
  if (!waitingForPaste) return;
  waitingForPaste = false;
  clearTimeout(pasteFlashTimer);
  pasteBtn.textContent = pasteLabel;
  setTimeout(run, 0); // let the pasted text land first
});

clearBtn.addEventListener("click", () => { input.value = ""; results.hidden = true; syncControls(); input.focus(); });
syncControls();

syncMode();
if (new URLSearchParams(location.search).has("demo")) loadSample();

const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() {
  const label = document.documentElement.dataset.theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("data-tip", label);
}
let themeFadeTimer = 0;
themeToggle.addEventListener("click", () => {
  // Crossfade the page in one composited pass where the browser supports
  // view transitions; text then cannot re-ease its inherited color and lag
  // behind the page. Elsewhere, fall back to fading only non-inherited
  // colors so text switches in one clean step.
  if (document.startViewTransition) {
    document.documentElement.classList.add("vt-active");
    const vt = document.startViewTransition(() => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      syncThemeIcon();
    });
    vt.finished.finally(() => document.documentElement.classList.remove("vt-active"));
    return;
  }
  document.documentElement.classList.add("theme-fading");
  clearTimeout(themeFadeTimer);
  themeFadeTimer = setTimeout(() => document.documentElement.classList.remove("theme-fading"), 500);
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeIcon();
});
syncThemeIcon();

// Scroll spy: the active menu item is the last section whose heading sits
// at or above the reading line just below the sticky header. Computed from
// the scroll position rather than an IntersectionObserver band, because a
// menu jump lands the heading at the top of the viewport, outside any
// mid-viewport band, which left the highlight stuck on a section the page
// merely scrolled past.
const navAnchors = [...document.querySelectorAll(".nav-links a")];
const navSections = navAnchors.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
navSections.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
function syncActiveLink() {
  const nav = document.querySelector(".site-nav");
  const line = (nav ? nav.offsetHeight : 0) + 40;
  let current = null;
  for (const sec of navSections) {
    if (sec.getBoundingClientRect().top <= line) current = sec;
  }
  // At the very bottom the last section is current even when the page is
  // too short to lift its heading up to the line.
  if (navSections.length && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) {
    current = navSections[navSections.length - 1];
  }
  for (const a of navAnchors) {
    const on = !!current && a.hash === "#" + current.id;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
}
let spyRaf = 0;
addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(() => { spyRaf = 0; syncActiveLink(); }); }, { passive: true });
addEventListener("resize", syncActiveLink, { passive: true });
syncActiveLink();

const toTop = document.getElementById("to-top");
if (toTop) {
  addEventListener("scroll", () => { toTop.classList.toggle("show", scrollY > 600); }, { passive: true });
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

const scene = document.querySelector(".bg-scene");
if (scene && matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let rafId = 0;
  addEventListener("mousemove", (e) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      scene.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
      scene.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
    });
  }, { passive: true });
}
if (scene && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let scrollRaf = 0;
  const applyScroll = () => { scrollRaf = 0; scene.style.setProperty("--sy", String(scrollY)); };
  addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(applyScroll); }, { passive: true });
  applyScroll();
}

// The bar is a brand row plus a menu band, and the band wraps on narrow
// screens, so the anchor offset is measured rather than hardcoded.
const siteNav = document.querySelector(".site-nav");
if (siteNav) {
  const setNavHeight = () => document.documentElement.style.setProperty("--nav-h", siteNav.offsetHeight + "px");
  addEventListener("resize", setNavHeight, { passive: true });
  setNavHeight();
}

// Cursor dust: tiny chartreuse sparks trail the pointer and burn out about
// a second after it rests. Everything lives on one fixed canvas: spawning
// is distance-based so speed sets density, the animation loop stops the
// moment the last spark dies, and touch or reduced-motion visitors never
// pay for any of it.
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  // width/height 100% is load-bearing: a canvas is a replaced element, so
  // inset alone does not stretch it and it would lay out at its intrinsic
  // dpr-scaled size, drawing every spark dpr times too far from the cursor.
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2100;pointer-events:none;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size);

  // One pre-rendered glow sprite per theme: drawImage per spark is far
  // cheaper than building a fresh radial gradient every frame.
  const sprite = (core) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const halo = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    halo.addColorStop(0, "rgba(171, 207, 55, 0.55)");
    halo.addColorStop(0.4, "rgba(171, 207, 55, 0.16)");
    halo.addColorStop(1, "rgba(171, 207, 55, 0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = core;
    g.beginPath();
    g.arc(32, 32, 4.5, 0, 7);
    g.fill();
    return c;
  };
  // The pale core glows against the night theme; light mode gets a deeper
  // green core so the dust stays visible on cream.
  const dust = { dark: sprite("#d7ef7a"), light: sprite("#7e9c26") };

  const sparks = [];
  const MAX = 90;
  let raf = 0, prev = 0, lastX = -1, lastY = -1, carry = 0;

  const spawn = (x, y, dx, dy) => {
    if (sparks.length >= MAX) return;
    const a = Math.random() * Math.PI * 2;
    const push = 4 + Math.random() * 16;
    sparks.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(a) * push + dx * 1.4,
      vy: Math.sin(a) * push + dy * 1.4,
      life: 0,
      ttl: 0.45 + Math.random() * 0.5,
      r: 5 + Math.random() * 9,
      star: Math.random() < 0.25,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 4,
      seed: Math.random() * 40
    });
  };

  const star = (R) => {
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.quadraticCurveTo(R * 0.16, -R * 0.16, R, 0);
    ctx.quadraticCurveTo(R * 0.16, R * 0.16, 0, R);
    ctx.quadraticCurveTo(-R * 0.16, R * 0.16, -R, 0);
    ctx.quadraticCurveTo(-R * 0.16, -R * 0.16, 0, -R);
    ctx.fill();
  };

  const tick = (now) => {
    const t = now / 1000;
    const dt = Math.min(0.05, prev ? t - prev : 0.016);
    prev = t;
    ctx.clearRect(0, 0, w, h);
    const light = document.documentElement.dataset.theme === "light";
    const img = light ? dust.light : dust.dark;
    ctx.fillStyle = light ? "#7e9c26" : "#d7ef7a";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.ttl) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.9;
      s.vy = s.vy * 0.9 + 26 * dt; // the dust settles gently
      const k = 1 - s.life / s.ttl;
      const twinkle = 0.7 + 0.3 * Math.sin(t * 16 + s.seed);
      ctx.globalAlpha = k * k * twinkle;
      const R = s.r * (0.5 + 0.7 * k);
      ctx.drawImage(img, s.x - R, s.y - R, R * 2, R * 2);
      if (s.star) {
        s.rot += s.spin * dt;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        star(R * 0.9);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (sparks.length) raf = requestAnimationFrame(tick);
    else { raf = 0; prev = 0; ctx.clearRect(0, 0, w, h); }
  };

  addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    if (lastX < 0) { lastX = e.clientX; lastY = e.clientY; return; }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    carry += Math.hypot(dx, dy);
    while (carry > 10) {
      carry -= 10;
      spawn(e.clientX, e.clientY, dx, dy);
    }
    if (sparks.length && !raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();


// Offline support: a small service worker caches the page shell so the
// tool opens without a connection after the first visit.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is optional */ });
  });
}

console.info(
  "%cBuilt by Jayden Yoon ZK%c https://github.com/JaydenYoonZK",
  "background:#abcf37;color:#101400;font-weight:700;padding:2px 8px;border-radius:999px",
  "color:inherit"
);

// The footer's copyright year keeps itself current.
const yearEl = document.getElementById("copyright-year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// FAQ accordions: the button carries the disclosure state, so keyboard
// and screen reader users get the expand and collapse for free.
document.querySelectorAll(".faq-q button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const open = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
});
