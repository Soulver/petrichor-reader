import crypto from "node:crypto";

export function createTicketStore({ ttlMs, now = () => Date.now() }) {
  const tickets = new Map();
  const fonts = new Map();

  function prune() {
    const t = now();
    for (const [id, row] of tickets) {
      if (row.expiresAt <= t) {
        tickets.delete(id);
      }
    }
    for (const [id, row] of fonts) {
      if (row.expiresAt <= t) {
        fonts.delete(id);
      }
    }
  }

  function issue(chapterId, sessionId) {
    prune();
    const ticket = crypto.randomBytes(24).toString("base64url");
    const fontId = crypto.randomBytes(16).toString("hex");
    const expiresAt = now() + ttlMs;
    tickets.set(ticket, {
      ticket,
      chapterId,
      sessionId,
      fontId,
      expiresAt,
    });
    return tickets.get(ticket);
  }

  function get(ticket) {
    prune();
    const row = tickets.get(ticket);
    if (!row || row.expiresAt <= now()) {
      tickets.delete(ticket);
      return null;
    }
    return row;
  }

  function putFont(fontId, record) {
    fonts.set(fontId, record);
  }

  function getFont(fontId) {
    prune();
    const row = fonts.get(fontId);
    if (!row || row.expiresAt <= now()) {
      fonts.delete(fontId);
      return null;
    }
    return row;
  }

  return { issue, get, putFont, getFont, prune };
}
