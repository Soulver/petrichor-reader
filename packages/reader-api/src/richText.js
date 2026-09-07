import { encodeText } from "../../font-tool/src/mapText.js";

const LOOKS_HTML = /<\/?[a-zA-Z]/;
const VOID = new Set(["br", "img", "hr"]);
const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
]);
const UNWRAP = new Set(["span", "div", "font", "section", "article"]);
const DROP = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "noscript"]);
const ALIGN = {
  "ql-align-left": "pr-align-left",
  "ql-align-center": "pr-align-center",
  "ql-align-right": "pr-align-right",
  "ql-align-justify": "pr-align-justify",
};
const ENTITIES = {
  nbsp: "\u00a0",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, ent) => {
    const key = ent.toLowerCase();
    if (ENTITIES[key]) {
      return ENTITIES[key];
    }
    if (key.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(key.slice(2), 16) || 32);
    }
    if (key.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(key.slice(1), 10) || 32);
    }
    return match;
  });
}

function escapeText(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text) {
  return escapeText(text).replaceAll('"', "&quot;");
}

function plainToHtml(text) {
  const parts = String(text).replace(/\r\n/g, "\n").split(/\n{2,}/);
  return parts
    .map((para) => `<p>${escapeText(para).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function safeHref(url) {
  const t = String(url || "").trim();
  if (/^https?:\/\//i.test(t) || /^mailto:/i.test(t)) {
    return t;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  return "";
}

function safeSrc(url) {
  const t = String(url || "").trim();
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  return "";
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(raw))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function skipUntil(html, i, needle) {
  const at = html.toLowerCase().indexOf(needle, i);
  return at === -1 ? html.length : at + needle.length;
}

function parseFragment(html) {
  const root = { type: "root", children: [] };
  const stack = [root];
  let i = 0;
  const src = String(html);

  function parent() {
    return stack[stack.length - 1];
  }

  function pushText(value) {
    if (!value) {
      return;
    }
    const kids = parent().children;
    const last = kids[kids.length - 1];
    if (last && last.type === "text") {
      last.value += value;
      return;
    }
    kids.push({ type: "text", value });
  }

  while (i < src.length) {
    if (src.startsWith("<!--", i)) {
      i = skipUntil(src, i + 4, "-->");
      continue;
    }
    if (src[i] !== "<") {
      const next = src.indexOf("<", i);
      const raw = next === -1 ? src.slice(i) : src.slice(i, next);
      pushText(decodeEntities(raw));
      i = next === -1 ? src.length : next;
      continue;
    }

    const close = src.indexOf(">", i + 1);
    if (close === -1) {
      pushText(decodeEntities(src.slice(i)));
      break;
    }
    const rawTag = src.slice(i + 1, close);
    i = close + 1;
    if (!rawTag || rawTag[0] === "!" || rawTag[0] === "?") {
      continue;
    }

    const selfClose = rawTag.endsWith("/");
    const body = selfClose ? rawTag.slice(0, -1).trim() : rawTag.trim();
    const isClose = body[0] === "/";
    const parts = (isClose ? body.slice(1) : body).match(/^([a-zA-Z][a-zA-Z0-9]*)\s*([\s\S]*)$/);
    if (!parts) {
      continue;
    }
    const tag = parts[1].toLowerCase();
    const attrRaw = parts[2] || "";

    if (isClose) {
      for (let s = stack.length - 1; s > 0; s -= 1) {
        if (stack[s].tag === tag) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    if (DROP.has(tag)) {
      if (!VOID.has(tag) && !selfClose) {
        i = skipUntil(src, i, `</${tag}`);
        const end = src.indexOf(">", i);
        i = end === -1 ? src.length : end + 1;
      }
      continue;
    }

    if (UNWRAP.has(tag)) {
      continue;
    }

    if (!ALLOWED.has(tag)) {
      continue;
    }

    const node = { type: "element", tag, attrs: {}, children: [] };
    const parsed = parseAttrs(attrRaw);
    if (tag === "img") {
      const href = safeSrc(parsed.src);
      if (!href) {
        continue;
      }
      node.attrs.src = href;
      if (parsed.alt) {
        node.attrs.alt = parsed.alt;
      }
    } else if (tag === "a") {
      const href = safeHref(parsed.href);
      if (href) {
        node.attrs.href = href;
        node.attrs.rel = "noopener noreferrer";
      }
    }
    if (parsed.class) {
      for (const cls of String(parsed.class).split(/\s+/)) {
        if (ALIGN[cls]) {
          node.attrs.class = ALIGN[cls];
          break;
        }
      }
    }

    parent().children.push(node);
    if (!VOID.has(tag) && !selfClose) {
      stack.push(node);
    }
  }

  return root;
}

function walk(node, visit) {
  if (node.type === "text") {
    visit(node);
    return;
  }
  if (node.attrs?.alt) {
    visit({ type: "attr", key: "alt", node });
  }
  if (node.attrs?.title) {
    visit({ type: "attr", key: "title", node });
  }
  for (const child of node.children || []) {
    walk(child, visit);
  }
}

export function collectVisibleText(html) {
  let out = "";
  walk(parseFragment(html), (item) => {
    if (item.type === "text") {
      out += item.value;
    } else if (item.type === "attr") {
      out += item.node.attrs[item.key] || "";
    }
  });
  return out;
}

function serialize(node) {
  if (node.type === "text") {
    return escapeText(node.value);
  }
  if (node.type === "root") {
    return (node.children || []).map(serialize).join("");
  }
  const attrs = Object.entries(node.attrs || {})
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  if (VOID.has(node.tag)) {
    return `<${node.tag}${attrs}>`;
  }
  const inner = (node.children || []).map(serialize).join("");
  if (node.tag === "a" && !node.attrs.href) {
    return inner;
  }
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

export function normalizeChapterBody(raw) {
  const s = String(raw || "").trim();
  if (!s) {
    return "";
  }
  const html = LOOKS_HTML.test(s) ? s : plainToHtml(s);
  return serialize(parseFragment(html));
}

export function chapterBodyHasContent(html) {
  if (collectVisibleText(html).trim()) {
    return true;
  }
  return /<img\b/i.test(html);
}

export function encodeRichHtml(html, forward) {
  const root = parseFragment(html);
  walk(root, (item) => {
    if (item.type === "text") {
      item.value = encodeText(item.value, forward);
    } else if (item.type === "attr") {
      item.node.attrs[item.key] = encodeText(item.node.attrs[item.key] || "", forward);
    }
  });
  return serialize(root);
}
