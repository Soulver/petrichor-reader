import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadChapters } from "./chapters.js";
import { loadConfig } from "./config.js";
import { createObfuscator } from "./obfuscate.js";
import { clientIp, createRateLimiter } from "./rateLimit.js";
import { fetchArticleById } from "./remoteArticle.js";
import { createTicketStore } from "./tickets.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function sendJson(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(json);
}

function corsHeaders(origin, allowedOrigins) {
  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Reader-Ticket",
      "Access-Control-Max-Age": "600",
    };
  }
  return { Vary: "Origin" };
}

function originDenied(origin, allowedOrigins) {
  return Boolean(origin) && !allowedOrigins.includes(origin);
}

function readBody(req, limit = 32_768) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseUrl(req) {
  return new URL(req.url, "http://127.0.0.1");
}

export function createServer(overrides = {}) {
  const repoRoot =
    overrides.repoRoot ?? path.resolve(here, "../../..");
  const config = loadConfig({ ...overrides, repoRoot });
  const chapters = loadChapters(repoRoot);
  const tickets = createTicketStore({ ttlMs: config.ticketTtlMs });
  const remoteInflight = new Map();

  async function resolveChapter(chapterId) {
    if (chapters.has(chapterId)) {
      return chapters.get(chapterId);
    }
    if (!config.articleByIdUrl) {
      return null;
    }
    if (remoteInflight.has(chapterId)) {
      return remoteInflight.get(chapterId);
    }
    const pending = fetchArticleById(config.articleByIdUrl, chapterId)
      .catch(() => null)
      .finally(() => {
        remoteInflight.delete(chapterId);
      });
    remoteInflight.set(chapterId, pending);
    return pending;
  }

  const obfuscator = createObfuscator({
    repoRoot,
    generatedDir: path.join(here, "../generated-fonts"),
  });
  const allowRequest = createRateLimiter({ perMin: config.rateLimitPerMin });

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const extra = corsHeaders(origin, config.allowedOrigins);

    try {
      if (originDenied(origin, config.allowedOrigins)) {
        sendJson(res, 403, { error: "origin_not_allowed" }, extra);
        return;
      }

      if (req.method === "OPTIONS") {
        res.writeHead(204, extra);
        res.end();
        return;
      }

      if (!allowRequest(clientIp(req))) {
        sendJson(res, 429, { error: "rate_limited" }, extra);
        return;
      }

      const url = parseUrl(req);

      if (req.method === "GET" && url.pathname === "/v1/reader/meta") {
        const list = [...chapters.values()].map((ch) => ({
          id: ch.id,
          title: ch.title,
        }));
        sendJson(
          res,
          200,
          {
            ticketTtlSec: Math.round(config.ticketTtlMs / 1000),
            siteKey: config.siteKey,
            chapters: list,
          },
          extra,
        );
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/reader/ticket") {
        let payload = {};
        try {
          const raw = await readBody(req);
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          sendJson(res, 400, { error: "invalid_json" }, extra);
          return;
        }

        if (payload.siteKey && payload.siteKey !== config.siteKey) {
          sendJson(res, 403, { error: "invalid_site_key" }, extra);
          return;
        }

        const chapterId = String(payload.chapterId || "");
        const found = await resolveChapter(chapterId);
        if (!found) {
          sendJson(res, 404, { error: "chapter_not_found" }, extra);
          return;
        }

        const sessionId = crypto.randomUUID();
        const row = tickets.issue(chapterId, sessionId);
        sendJson(
          res,
          200,
          {
            ticket: row.ticket,
            sessionId: row.sessionId,
            expiresAt: new Date(row.expiresAt).toISOString(),
            chapterId: row.chapterId,
          },
          extra,
        );
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/reader/chapter") {
        const ticket =
          url.searchParams.get("ticket") ||
          req.headers["x-reader-ticket"] ||
          "";
        const row = tickets.get(String(ticket));
        if (!row) {
          sendJson(res, 401, { error: "invalid_ticket" }, extra);
          return;
        }
        const chapter = await resolveChapter(row.chapterId);
        if (!chapter) {
          sendJson(res, 404, { error: "chapter_not_found" }, extra);
          return;
        }

        let packed;
        try {
          packed = await obfuscator.forChapter(chapter);
        } catch (err) {
          console.error("font_unavailable", err && err.message ? err.message : err);
          sendJson(res, 503, { error: "font_unavailable" }, extra);
          return;
        }

        tickets.putFont(row.fontId, {
          buffer: packed.buffer,
          expiresAt: row.expiresAt,
        });

        sendJson(
          res,
          200,
          {
            chapterId: chapter.id,
            titleGlyphs: packed.titleGlyphs,
            bodyGlyphs: packed.bodyGlyphs,
            fontFamily: packed.fontFamily,
            fontUrl: `${config.publicBase}/v1/fonts/${row.fontId}.woff2`,
          },
          extra,
        );
        return;
      }

      const fontMatch = url.pathname.match(/^\/v1\/fonts\/([A-Za-z0-9_-]+)\.woff2$/);
      if (req.method === "GET" && fontMatch) {
        const font = tickets.getFont(fontMatch[1]);
        if (!font) {
          res.writeHead(404, {
            "Content-Type": "application/json; charset=utf-8",
            ...extra,
          });
          res.end(JSON.stringify({ error: "font_not_found" }));
          return;
        }
        res.writeHead(200, {
          "Content-Type": "font/woff2",
          "Cache-Control": "private, max-age=300",
          "Content-Length": font.buffer.length,
          ...extra,
        });
        res.end(font.buffer);
        return;
      }

      sendJson(res, 404, { error: "not_found" }, extra);
    } catch {
      sendJson(res, 500, { error: "internal" }, extra);
    }
  });

  server.locals = { config, chapters };
  return server;
}
