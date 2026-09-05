import { isPassthroughChar, puaCodePoint } from "./policy.js";

/**
 * Build a stable char → PUA map for `text` and encode it.
 * Decode is for tests / server-side checks only — do not ship it in reader-web.
 */
export function buildMapping(text) {
  const forward = new Map();
  let nextIndex = 0;

  for (const ch of text) {
    if (isPassthroughChar(ch) || forward.has(ch)) {
      continue;
    }
    forward.set(ch, String.fromCodePoint(puaCodePoint(nextIndex)));
    nextIndex += 1;
  }

  return { forward, uniqueCount: nextIndex };
}

export function encodeText(text, forward) {
  let out = "";
  for (const ch of text) {
    out += isPassthroughChar(ch) ? ch : forward.get(ch);
  }
  return out;
}

export function decodeText(encoded, forward) {
  const inverse = new Map();
  for (const [from, to] of forward) {
    inverse.set(to, from);
  }
  let out = "";
  for (const ch of encoded) {
    out += isPassthroughChar(ch) ? ch : inverse.get(ch) ?? ch;
  }
  return out;
}

export function mappingToJson(forward) {
  const chars = {};
  for (const [from, to] of forward) {
    chars[from] = to;
  }
  return {
    version: 1,
    puaStart: "U+E000",
    policy: {
      passthrough: "javascript-unicode-whitespace",
      punctuation: "mapped",
      missingGlyph: "box",
    },
    chars,
  };
}

export function mappingFromJson(json) {
  const forward = new Map(Object.entries(json.chars));
  return forward;
}
