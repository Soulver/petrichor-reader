import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterRevision,
  evictOtherRevisions,
  fontCacheKey,
  normalizeUpdatedAt,
} from "../src/revision.js";

test("chapterRevision prefers updateTime and falls back to content hash", () => {
  assert.equal(normalizeUpdatedAt(""), "");
  assert.equal(chapterRevision({ updatedAt: "2026-09-07 12:00:00", title: "a", body: "b" }), "2026-09-07 12:00:00");
  const a = chapterRevision({ title: "甲", body: "<p>旧</p>" });
  const b = chapterRevision({ title: "甲", body: "<p>新</p>" });
  const c = chapterRevision({ title: "甲", body: "<p>旧</p>" });
  assert.notEqual(a, b);
  assert.equal(a, c);
  assert.equal(a.length, 16);
});

test("font cache keys change when revision changes", () => {
  const first = fontCacheKey({ id: "9", updatedAt: "1" });
  const second = fontCacheKey({ id: "9", updatedAt: "2" });
  assert.notEqual(first, second);
  assert.match(first, /^9/);
});

test("evictOtherRevisions drops stale keys for the same chapter", () => {
  const cache = new Map([
    [fontCacheKey({ id: "9", updatedAt: "1" }), { old: true }],
    [fontCacheKey({ id: "8", updatedAt: "1" }), { keepOther: true }],
  ]);
  const keep = fontCacheKey({ id: "9", updatedAt: "2" });
  cache.set(keep, { fresh: true });
  evictOtherRevisions(cache, "9", keep);
  assert.equal(cache.has(fontCacheKey({ id: "9", updatedAt: "1" })), false);
  assert.equal(cache.get(keep).fresh, true);
  assert.equal(cache.get(fontCacheKey({ id: "8", updatedAt: "1" })).keepOther, true);
});
