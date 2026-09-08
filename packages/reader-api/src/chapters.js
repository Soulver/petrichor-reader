import fs from "node:fs";
import path from "node:path";

export function loadChapters(repoRoot) {
  const dir = path.join(repoRoot, "fixtures/chapters");
  const indexPath = path.join(dir, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const byId = new Map();

  for (const entry of index.chapters) {
    const filePath = path.join(dir, entry.file);
    const body = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    const updatedAt = String(fs.statSync(filePath).mtimeMs);
    byId.set(entry.id, {
      id: entry.id,
      title: entry.title,
      body,
      updatedAt,
    });
  }

  return byId;
}
