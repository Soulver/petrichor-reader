import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { fetchArticleById, htmlToPlain } from "../src/remoteArticle.js";

test("htmlToPlain strips tags and keeps line breaks", () => {
  const out = htmlToPlain("<p>春江</p><br/>潮水&nbsp;连海平");
  assert.equal(out.includes("<"), false);
  assert.match(out, /春江/);
  assert.match(out, /潮水 连海平/);
});

test("fetchArticleById keeps sanitized HTML body", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        data: {
          id: "9",
          articleChapter: "第一章",
          articleTitle: "标题",
          articleHead: "<p><em>文首</em></p>",
          articleContent: '<p>正文<strong>加重</strong></p><p><img src="https://pic.example/x.png"></p>',
          articleTail: "",
        },
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const article = await fetchArticleById(`http://127.0.0.1:${port}/article/byId`, "9");
    assert.equal(article.id, "9");
    assert.match(article.body, /<em>文首<\/em>/);
    assert.match(article.body, /<strong>加重<\/strong>/);
    assert.match(article.body, /<img src="https:\/\/pic.example\/x.png">/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
