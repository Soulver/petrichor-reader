import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { containsHan } from "../src/config.js";
import { createServer } from "../src/server.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function request(port, { method, path, headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method: method || "GET",
        path,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf,
            text: buf.toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function withServer(fn, overrides = {}) {
  const server = createServer(overrides);
  const port = await listen(server);
  try {
    return await fn(port, server);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

const SNIPPET = "春江潮水连海平";

test("ticket + chapter JSON has no han; font is woff2", async () => {
  await withServer(async (port) => {
    const ticketRes = await request(port, {
      method: "POST",
      path: "/v1/reader/ticket",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: "sample", siteKey: "pk_dev" }),
    });
    assert.equal(ticketRes.status, 200);
    const ticketJson = JSON.parse(ticketRes.text);
    assert.equal(containsHan(ticketRes.text), false);

    const chapterRes = await request(port, {
      path: `/v1/reader/chapter?ticket=${encodeURIComponent(ticketJson.ticket)}`,
      headers: { Origin: "http://localhost:3981" },
    });
    assert.equal(chapterRes.status, 200);
    assert.equal(chapterRes.headers["access-control-allow-origin"], "http://localhost:3981");
    assert.equal(chapterRes.text.includes(SNIPPET), false);
    assert.equal(containsHan(chapterRes.text), false);
    const chapter = JSON.parse(chapterRes.text);
    assert.ok(chapter.bodyGlyphs.length > 10);
    assert.match(chapter.bodyGlyphs, /<p>/);
    assert.ok(chapter.titleGlyphs.length > 0);
    assert.match(chapter.fontFamily, /^pr-sess-/);
    assert.equal(chapter.fontFamily.includes("Noto"), false);
    assert.equal(chapter.fontFamily.includes("Source"), false);
    assert.match(chapter.fontUrl, /\/v1\/fonts\/[a-f0-9]+\.woff2$/);

    const fontPath = new URL(chapter.fontUrl).pathname;
    const fontRes = await request(port, {
      path: fontPath,
      headers: { Origin: "http://localhost:3981" },
    });
    assert.equal(fontRes.status, 200);
    assert.equal(fontRes.headers["content-type"], "font/woff2");
    assert.ok(fontRes.body.length > 1000);
    assert.equal(fontRes.body.subarray(0, 4).toString(), "wOF2");
  });
});

test("invalid ticket fails", async () => {
  await withServer(async (port) => {
    const res = await request(port, {
      path: "/v1/reader/chapter?ticket=nope",
    });
    assert.equal(res.status, 401);
    assert.equal(containsHan(res.text), false);
  });
});

test("expired ticket fails", async () => {
  await withServer(
    async (port) => {
      const ticketRes = await request(port, {
        method: "POST",
        path: "/v1/reader/ticket",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: "sample" }),
      });
      const ticket = JSON.parse(ticketRes.text).ticket;
      await new Promise((r) => setTimeout(r, 25));
      const res = await request(port, {
        path: `/v1/reader/chapter?ticket=${encodeURIComponent(ticket)}`,
      });
      assert.equal(res.status, 401);
    },
    { ticketTtlMs: 10 },
  );
});

test("blog origin is rejected", async () => {
  await withServer(async (port) => {
    const res = await request(port, {
      method: "POST",
      path: "/v1/reader/ticket",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:8080",
      },
      body: JSON.stringify({ chapterId: "sample" }),
    });
    assert.equal(res.status, 403);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });
});

test("meta lists fixture chapter ids", async () => {
  await withServer(async (port) => {
    const res = await request(port, { path: "/v1/reader/meta" });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.text);
    assert.equal(json.ticketTtlSec, 300);
    assert.equal(json.siteKey, "pk_dev");
    assert.equal(json.chapters[0].id, "sample");
  });
});
