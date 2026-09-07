import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createServer } from "../src/server.js";
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
          updateTime: "2026-09-07 12:00:00",
          createTime: "2026-09-01 08:00:00",
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
    assert.equal(article.updatedAt, "2026-09-07 12:00:00");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("reader refetches remote article so later updateTime is visible", async () => {
  let fetches = 0;
  let updateTime = "1";
  const cms = http.createServer((req, res) => {
    fetches += 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        data: {
          id: "99",
          articleTitle: "远程章",
          articleContent: `<p>正文${updateTime}</p>`,
          updateTime,
        },
      }),
    );
  });
  await new Promise((resolve) => cms.listen(0, "127.0.0.1", resolve));
  const articleUrl = `http://127.0.0.1:${cms.address().port}/article/byId`;
  const reader = createServer({ articleByIdUrl: articleUrl });
  await new Promise((resolve) => reader.listen(0, "127.0.0.1", resolve));
  const port = reader.address().port;

  function ticket() {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/v1/reader/ticket",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }),
          );
        },
      );
      req.on("error", reject);
      req.write(JSON.stringify({ chapterId: "99" }));
      req.end();
    });
  }

  try {
    const first = await ticket();
    assert.equal(first.status, 200);
    updateTime = "2";
    const second = await ticket();
    assert.equal(second.status, 200);
    assert.equal(fetches, 2);
  } finally {
    await new Promise((resolve) => reader.close(resolve));
    await new Promise((resolve) => cms.close(resolve));
  }
});
