const ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function htmlToPlain(html) {
  if (!html) {
    return "";
  }
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, ent) => {
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
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const body = htmlToPlain(
    [article.articleHead, article.articleContent, article.articleTail]
      .filter(Boolean)
      .join("\n\n"),
  );
  if (!body) {
    return null;
  }
  return { id: articleId, title: title || articleId, body };
}
