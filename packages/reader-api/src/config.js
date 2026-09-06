export const DEFAULT_PORT = 3980;
export const DEFAULT_PUBLIC_BASE = "http://localhost:3980";
export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3981",
  "http://127.0.0.1:3981",
];
export const DEFAULT_SITE_KEY = "pk_dev";
export const DEFAULT_TICKET_TTL_MS = 5 * 60 * 1000;
export const HAN_RE = /[\u3400-\u9fff]/u;

export function containsHan(text) {
  return HAN_RE.test(text);
}

export function loadConfig(overrides = {}) {
  return {
    port: Number(overrides.port ?? process.env.READER_API_PORT ?? DEFAULT_PORT),
    publicBase: String(
      overrides.publicBase ?? process.env.READER_API_PUBLIC_BASE ?? DEFAULT_PUBLIC_BASE,
    ).replace(/\/$/, ""),
    allowedOrigins: overrides.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS,
    siteKey: overrides.siteKey ?? process.env.READER_SITE_KEY ?? DEFAULT_SITE_KEY,
    ticketTtlMs: Number(
      overrides.ticketTtlMs ?? process.env.READER_TICKET_TTL_MS ?? DEFAULT_TICKET_TTL_MS,
    ),
    rateLimitPerMin: Number(overrides.rateLimitPerMin ?? 240),
    articleByIdUrl: overrides.articleByIdUrl ?? process.env.READER_ARTICLE_BY_ID_URL ?? "",
    repoRoot: overrides.repoRoot,
  };
}
