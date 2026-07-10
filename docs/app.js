import { process, isSerialized, byteLength, serialize } from "./serial.js?v=20260710l";

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
    chips.push(repaired
      ? `<span class="chip amber"><strong>${repaired}</strong> length prefix${repaired === 1 ? "" : "es"} repaired</span>`
      : `<span class="chip ok">Nothing to repair, the data was already valid</span>`);
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
    document.startViewTransition(() => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      syncThemeIcon();
    });
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
