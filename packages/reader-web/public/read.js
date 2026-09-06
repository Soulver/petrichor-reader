const SIZE_KEY = "pr-reader-font-size";
const THEME_KEY = "pr-reader-theme";
const MIN_SIZE = 16;
const MAX_SIZE = 32;

/** Hardcoded for V1. mode: off | light | dark | both */
const WATERMARK = {
  mode: "both",
  text: "Petrichor",
};

const statusEl = document.getElementById("status");
const chapterEl = document.getElementById("chapter");
const titleEl = document.getElementById("title");
const bodyEl = document.getElementById("body");
const themeBtn = document.getElementById("theme-toggle");
const readerMainEl = document.getElementById("reader-main");
const wmLightEl = document.getElementById("wm-light");
const wmDarkEl = document.getElementById("wm-dark");

function apiBase() {
  return String(window.__PETRICHOR_API__ || "http://127.0.0.1:3980").replace(/\/$/, "");
}

const MSG_TYPE = "petrichor-reader:resize";

function inIframe() {
  return window.parent !== window;
}

function postHeight() {
  if (!inIframe()) {
    return;
  }
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    1,
  );
  window.parent.postMessage({ type: MSG_TYPE, height }, "*");
}

function showStatus(message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  chapterEl.hidden = true;
  postHeight();
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function watermarkTile(text, fill, rotate) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="200">` +
    `<text x="140" y="100" text-anchor="middle" dominant-baseline="middle"` +
    ` fill="${fill}" font-size="18" font-family="sans-serif"` +
    ` transform="rotate(${rotate} 140 100)">${escapeXml(text)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function applyWatermarks() {
  if (!readerMainEl || !wmLightEl || !wmDarkEl) {
    return;
  }
  const mode = WATERMARK.mode;
  const text = String(WATERMARK.text || "").trim();
  const enabled = text && (mode === "light" || mode === "dark" || mode === "both");
  readerMainEl.dataset.wm = enabled ? mode : "off";
  if (!enabled) {
    wmLightEl.style.backgroundImage = "none";
    wmDarkEl.style.backgroundImage = "none";
    return;
  }
  const styles = getComputedStyle(document.documentElement);
  const lightFill = styles.getPropertyValue("--wm-light").trim() || "rgba(0,0,0,0.03)";
  const darkFill = styles.getPropertyValue("--wm-dark").trim() || "rgba(0,0,0,0.08)";
  wmLightEl.style.backgroundImage = watermarkTile(text, lightFill, -28);
  wmDarkEl.style.backgroundImage = watermarkTile(text, darkFill, -28);
}

function applyChrome() {
  const size = Number(localStorage.getItem(SIZE_KEY) || 20);
  const theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  document.documentElement.style.setProperty("--reader-size", `${size}px`);
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "浅色" : "深色";
  applyWatermarks();
  postHeight();
}

function setSize(next) {
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, next));
  localStorage.setItem(SIZE_KEY, String(size));
  applyChrome();
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyChrome();
}

async function loadFont(fontFamily, fontUrl) {
  const face = new FontFace(fontFamily, `url(${fontUrl})`, { display: "block" });
  const loaded = await face.load();
  document.fonts.add(loaded);
}

async function readChapter() {
  const chapterId = new URLSearchParams(location.search).get("chapterId") || "";
  if (!chapterId) {
    showStatus("缺少章节");
    return;
  }

  const ticketRes = await fetch(`${apiBase()}/v1/reader/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId, siteKey: "pk_dev" }),
  });
  if (!ticketRes.ok) {
    showStatus("内容无法显示");
    return;
  }
  const ticketJson = await ticketRes.json();
  const ticket = ticketJson.ticket;
  if (!ticket) {
    showStatus("内容无法显示");
    return;
  }

  const chapterRes = await fetch(
    `${apiBase()}/v1/reader/chapter?ticket=${encodeURIComponent(ticket)}`,
  );
  if (!chapterRes.ok) {
    showStatus("内容无法显示");
    return;
  }
  const payload = await chapterRes.json();
  if (!payload.fontUrl || !payload.fontFamily || !payload.bodyGlyphs) {
    showStatus("内容无法显示");
    return;
  }

  try {
    await loadFont(payload.fontFamily, payload.fontUrl);
  } catch {
    showStatus("内容无法显示");
    return;
  }

  const family = `"${payload.fontFamily}"`;
  titleEl.textContent = payload.titleGlyphs || "";
  bodyEl.textContent = payload.bodyGlyphs;
  titleEl.style.fontFamily = family;
  bodyEl.style.fontFamily = family;
  statusEl.hidden = true;
  chapterEl.hidden = false;
  postHeight();
}

document.getElementById("size-down").addEventListener("click", () => {
  const current = Number(localStorage.getItem(SIZE_KEY) || 20);
  setSize(current - 2);
});
document.getElementById("size-up").addEventListener("click", () => {
  const current = Number(localStorage.getItem(SIZE_KEY) || 20);
  setSize(current + 2);
});
themeBtn.addEventListener("click", toggleTheme);

if (inIframe()) {
  document.documentElement.classList.add("embedded");
}

applyChrome();
readChapter().catch(() => {
  showStatus("内容无法显示");
});

if (typeof ResizeObserver === "function") {
  new ResizeObserver(() => postHeight()).observe(document.documentElement);
}
