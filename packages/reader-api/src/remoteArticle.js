import { chapterBodyHasContent, collectVisibleText, normalizeChapterBody } from "./richText.js";

/** @deprecated kept for tests that only need visible text */
export function htmlToPlain(html) {
  return collectVisibleText(normalizeChapterBody(html)).replace(/\u00a0/g, " ").trim();
}

export async function fetchArticleById(url, id) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id }),
  });
  if (!res.ok) {
    return null;
  }
  const json = await res.json();
  const article = json && json.data;
  if (!article) {
    return null;
  }
  const articleId = String(article.id || id);
  const title = [article.articleChapter, article.articleTitle]
    .filter(Boolean)
    .join(" - ");
  const body = normalizeChapterBody(
    [article.articleHead, article.articleContent, article.articleTail]
      .filter(Boolean)
      .join(""),
  );
  if (!chapterBodyHasContent(body)) {
    return null;
  }
  return { id: articleId, title: title || articleId, body };
}
