import assert from "node:assert/strict";
import test from "node:test";
import { buildMapping } from "../../font-tool/src/mapText.js";
import { containsHan } from "../src/config.js";
import {
  chapterBodyHasContent,
  collectVisibleText,
  encodeRichHtml,
  normalizeChapterBody,
} from "../src/richText.js";

test("plain text becomes paragraphs and line breaks", () => {
  const html = normalizeChapterBody("上句\n下句\n\n下一段");
  assert.match(html, /<p>/);
  assert.match(html, /<br>/);
  assert.equal(html.includes("<script"), false);
  assert.equal(collectVisibleText(html).includes("上句"), true);
  assert.equal(collectVisibleText(html).includes("下一段"), true);
});

test("keeps bold italic image and drops script", () => {
  const html = normalizeChapterBody(
    '<p>甲<strong>乙</strong><em>丙</em></p><p><img src="https://pic.example/a.png" alt="图题"></p>' +
      '<script>alert(1)</script><p><img src="javascript:alert(1)"></p>' +
      '<p><a href="https://example.com">链</a></p>',
  );
  assert.match(html, /<strong>乙<\/strong>/);
  assert.match(html, /<em>丙<\/em>/);
  assert.match(html, /<img src="https:\/\/pic.example\/a.png"/);
  assert.match(html, /alt="图题"/);
  assert.match(html, /<a href="https:\/\/example.com" rel="noopener noreferrer">链<\/a>/);
  assert.equal(html.includes("script"), false);
  assert.equal(html.includes("javascript"), false);
  assert.equal(chapterBodyHasContent(html), true);
});

test("encodeRichHtml only remaps text and alt", () => {
  const src = normalizeChapterBody(
    '<p>春江<strong>潮水</strong></p><img src="https://pic.example/a.png" alt="明月">',
  );
  const { forward } = buildMapping(collectVisibleText(src));
  const encoded = encodeRichHtml(src, forward);
  assert.match(encoded, /<p>/);
  assert.match(encoded, /<strong>/);
  assert.match(encoded, /<img src="https:\/\/pic.example\/a.png"/);
  assert.equal(containsHan(collectVisibleText(encoded)), false);
  assert.equal(encoded.includes("春江"), false);
  assert.equal(encoded.includes("明月"), false);
  assert.equal(encoded.includes("https://pic.example/a.png"), true);
});
