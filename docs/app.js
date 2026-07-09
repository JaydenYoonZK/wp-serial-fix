import { process, isSerialized, byteLength, serialize } from "./serial.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
    if (!r.ok) { badge = "COULD NOT PARSE"; tone = "phantom"; }
    else if (mode === "repair") { badge = r.repaired ? `REPAIRED ${r.repaired}` : "ALREADY VALID"; tone = r.repaired ? "warn" : "ok"; }
    else if (r.kind === "serialized") { badge = valid ? "SERIALIZED, SAFE" : "CHECK"; tone = valid ? "ok" : "warn"; }
    else { badge = "PLAIN TEXT"; tone = "default"; }

    const meta = r.kind === "serialized" && valid
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
    chips.push(changed
      ? `<span class="chip green"><strong>${changed}</strong> value${changed === 1 ? "" : "s"} changed</span>`
      : `<span class="chip">No matches for that search term</span>`);
    if (serialized) chips.push(`<span class="chip"><strong>${serialized}</strong> serialized, lengths recalculated</span>`);
    if (failed) chips.push(`<span class="chip red"><strong>${failed}</strong> could not be parsed</span>`);
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
pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) { input.value = text; run(); return; }
  } catch { /* permission denied */ }
  input.focus();
  const prev = pasteBtn.textContent;
  pasteBtn.textContent = navigator.platform?.includes("Mac") ? "Press ⌘V, then Process" : "Press Ctrl+V, then Process";
  setTimeout(() => { pasteBtn.textContent = prev; }, 2400);
});

clearBtn.addEventListener("click", () => { input.value = ""; results.hidden = true; syncControls(); input.focus(); });
syncControls();

syncMode();
if (new URLSearchParams(location.search).has("demo")) loadSample();

const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() {
  themeToggle.textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀️";
}
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeIcon();
});
syncThemeIcon();

const navAnchors = [...document.querySelectorAll(".nav-links a")];
const navSections = navAnchors.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
const sectionSpy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const a of navAnchors) a.classList.toggle("active", a.hash === "#" + entry.target.id);
  }
}, { rootMargin: "-30% 0px -60% 0px" });
navSections.forEach(sec => sectionSpy.observe(sec));

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
