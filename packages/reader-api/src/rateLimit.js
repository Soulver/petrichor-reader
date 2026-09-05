export function createRateLimiter({ perMin }) {
  const windows = new Map();

  return function check(ip) {
    const now = Date.now();
    const key = ip || "unknown";
    let slot = windows.get(key);
    if (!slot || now - slot.start >= 60_000) {
      slot = { start: now, count: 0 };
      windows.set(key, slot);
    }
    slot.count += 1;
    return slot.count <= perMin;
  };
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}
