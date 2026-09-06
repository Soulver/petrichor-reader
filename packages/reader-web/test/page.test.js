import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../public");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function get(port, pathName) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: pathName }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          text: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    }).on("error", reject);
  });
}

test("client assets never include decode helpers or fixture prose", () => {
  for (const name of ["read.js", "read.html", "read.css", "embed.js"]) {
    const src = fs.readFileSync(path.join(publicDir, name), "utf8");
    assert.equal(src.includes("decodeText"), false);
    assert.equal(src.includes("春江潮水连海平"), false);
    assert.equal(src.includes("map.json"), false);
  }
  const js = fs.readFileSync(path.join(publicDir, "read.js"), "utf8");
  assert.match(js, /内容无法显示/);
  assert.match(js, /FontFace/);
  assert.match(js, /petrichor-reader:resize/);
  assert.equal(js.includes("console.log"), false);
  const embed = fs.readFileSync(path.join(publicDir, "embed.js"), "utf8");
  assert.match(embed, /data-petrichor-reader/);
  assert.match(embed, /MutationObserver/);
});

test("GET /read injects api base and does not embed chapter prose", async () => {
  const server = createServer({ apiBase: "http://127.0.0.1:3980" });
  const port = await listen(server);
  try {
    const res = await get(port, "/read?chapterId=sample");
    assert.equal(res.status, 200);
    assert.match(res.text, /window\.__PETRICHOR_API__ = "http:\/\/127\.0\.0\.1:3980"/);
    assert.equal(res.text.includes("春江潮水连海平"), false);
    assert.match(res.text, /src="\/read\.js"/);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test("GET /embed.js is served", async () => {
  const server = createServer({ apiBase: "http://127.0.0.1:3980" });
  const port = await listen(server);
  try {
    const res = await get(port, "/embed.js");
    assert.equal(res.status, 200);
    assert.match(res.text, /data-petrichor-reader/);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
