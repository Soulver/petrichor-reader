import fs from "node:fs";
import path from "node:path";
import { buildMapping, encodeText } from "../../font-tool/src/mapText.js";
import { buildWoff2, findMasterFont } from "../../font-tool/src/buildFont.js";
import { FONT_FAMILY_PREFIX } from "../../font-tool/src/policy.js";
import { containsHan } from "./config.js";
import { evictOtherRevisions, fontCacheKey } from "./revision.js";
import { collectVisibleText, encodeRichHtml, normalizeChapterBody } from "./richText.js";

export function createObfuscator({
  repoRoot,
  generatedDir,
  masterPath: masterPathOverride,
  buildFont = buildWoff2,
} = {}) {
  let masterPath = masterPathOverride ?? null;
  fs.mkdirSync(generatedDir, { recursive: true });
  const cache = new Map();

  function resolveMaster() {
    if (masterPath) {
      return masterPath;
    }
    masterPath = findMasterFont(path.join(repoRoot, "fonts/master"));
    if (!masterPath) {
      throw new Error("master font missing");
    }
    return masterPath;
  }

  async function forChapter(chapter) {
    const key = fontCacheKey(chapter);
    const hit = cache.get(key);
    if (hit) {
      return hit;
    }

    const title = chapter.title || "";
    const html = normalizeChapterBody(chapter.body);
    const visible = collectVisibleText(html);
    const combined = title ? `${title}\n${visible}` : visible;
    const { forward } = buildMapping(combined);
    const titleGlyphs = title ? encodeText(title, forward) : "";
    const bodyGlyphs = encodeRichHtml(html, forward);

    if (containsHan(collectVisibleText(bodyGlyphs)) || containsHan(titleGlyphs)) {
      throw new Error("encoded payload still contains han");
    }

    const fontFamily = `${FONT_FAMILY_PREFIX}${chapter.id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 24) || "ch"}`;
    const psName = `PrSess${chapter.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "Ch"}`;
    const outputPath = path.join(generatedDir, `${chapter.id}.woff2`);

    const mappings = [];
    for (const [from, to] of forward) {
      mappings.push({
        from: from.codePointAt(0),
        to: to.codePointAt(0),
      });
    }

    await buildFont({
      masterPath: resolveMaster(),
      outputPath,
      fontFamily,
      psName,
      mappings,
      passthrough: [9, 10, 13, 32, 160, 0x3000],
    });

    const buffer = fs.readFileSync(outputPath);
    const record = { fontFamily, titleGlyphs, bodyGlyphs, buffer, revision: key };
    evictOtherRevisions(cache, chapter.id, key);
    cache.set(key, record);
    return record;
  }

  return { forChapter, masterPath };
}
