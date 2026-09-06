import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.resolve(here, "../public");
export const DEFAULT_PORT = 3981;
export const DEFAULT_API_BASE = "http://127.0.0.1:3980";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function safeJoin(root, rel) {
  const resolved = path.resolve(root, rel);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    return null;
  }
  return resolved;
}

export function createServer(overrides = {}) {
  const apiBase = String(overrides.apiBase ?? process.env.READER_API_PUBLIC_BASE ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const publicDir = overrides.publicDir ?? PUBLIC_DIR;

  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }

    let rel = url.pathname === "/read" || url.pathname === "/" ? "/read.html" : url.pathname;
    const filePath = safeJoin(publicDir, rel.replace(/^\/+/, ""));
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }

    let body = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    if (ext === ".html") {
      body = Buffer.from(
        body.toString("utf8").replaceAll("__API_BASE__", apiBase),
        "utf8",
      );
    }

    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Length": body.length,
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(body);
  });
}
