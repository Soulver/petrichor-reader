import crypto from "node:crypto";

export function normalizeUpdatedAt(value) {
  if (value == null || value === "") {
    return "";
  }
  return String(value);
}

export function contentRevision(title, body) {
  return crypto.createHash("sha1").update(`${title || ""}\n${body || ""}`).digest("hex").slice(0, 16);
}

export function chapterRevision(chapter) {
  const updatedAt = normalizeUpdatedAt(chapter?.updatedAt);
  if (updatedAt) {
    return updatedAt;
  }
  return contentRevision(chapter?.title, chapter?.body);
}

export function fontCacheKey(chapter) {
  return `${chapter.id}\x1e${chapterRevision(chapter)}`;
}

export function evictOtherRevisions(cache, chapterId, keepKey) {
  const prefix = `${chapterId}\x1e`;
  for (const key of cache.keys()) {
    if (key !== keepKey && key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
