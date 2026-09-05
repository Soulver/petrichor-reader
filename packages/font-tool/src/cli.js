import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWoff2, findMasterFont } from "./buildFont.js";
import {
  buildMapping,
  encodeText,
  mappingToJson,
} from "./mapText.js";
import { FONT_FAMILY_PREFIX } from "./policy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

function htmlEscape(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildPreviewHtml({ fontFamily, encoded, fontUrl }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>petrichor-reader font preview</title>
  <style>
    @font-face {
      font-family: "${fontFamily}";
      src: url("${fontUrl}") format("woff2");
      font-display: block;
    }
    body {
      margin: 2rem auto;
      max-width: 40rem;
      line-height: 1.9;
      font-size: 20px;
      color: #1a1a1a;
      background: #f6f1e7;
    }
    .hint { font-family: sans-serif; font-size: 14px; color: #555; }
    .chapter {
      font-family: "${fontFamily}", serif;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <p class="hint">人眼应能读正文。查看源代码应只有 PUA 码位，没有原句。禁用此自定义字体后应变乱码/方框。</p>
  <div class="chapter">${htmlEscape(encoded)}</div>
</body>
</html>
`;
}

async function main() {
  const chapterPath = path.join(repoRoot, "fixtures/chapters/sample.txt");
  const outputDir = path.join(here, "../output");
  const fixturesDir = path.join(repoRoot, "fixtures");
  const fontsMasterDir = path.join(repoRoot, "fonts/master");
  const masterPath = findMasterFont(fontsMasterDir);
  if (!masterPath) {
    throw new Error(
      "Missing master font. Run: node packages/font-tool/scripts/download-master-font.mjs",
    );
  }

  const text = fs.readFileSync(chapterPath, "utf8").replace(/^\uFEFF/, "");
  const { forward } = buildMapping(text);
  const encoded = encodeText(text, forward);
  const fontFamily = `${FONT_FAMILY_PREFIX}preview`;
  const psName = "PrSessPreview";

  fs.mkdirSync(outputDir, { recursive: true });
  const woff2Path = path.join(outputDir, "subset.woff2");
  const mapPath = path.join(outputDir, "map.json");

  const mappings = [];
  for (const [from, to] of forward) {
    mappings.push({
      from: from.codePointAt(0),
      to: to.codePointAt(0),
    });
  }

  await buildWoff2({
    masterPath,
    outputPath: woff2Path,
    fontFamily,
    psName,
    mappings,
    passthrough: [9, 10, 13, 32, 160, 0x3000],
  });

  fs.writeFileSync(mapPath, JSON.stringify(mappingToJson(forward), null, 2), "utf8");

  const previewAssets = path.join(fixturesDir, "preview-assets");
  fs.mkdirSync(previewAssets, { recursive: true });
  fs.copyFileSync(woff2Path, path.join(previewAssets, "subset.woff2"));

  const previewHtml = buildPreviewHtml({
    fontFamily,
    encoded,
    fontUrl: "./preview-assets/subset.woff2",
  });
  fs.writeFileSync(path.join(fixturesDir, "preview.html"), previewHtml, "utf8");

  const originalSnippet = text.trim().split(/\n/)[0];
  if (encoded.includes(originalSnippet) || previewHtml.includes(originalSnippet)) {
    throw new Error("Encoded preview still contains the original first line.");
  }

  console.log(`master: ${masterPath}`);
  console.log(`woff2:  ${woff2Path}`);
  console.log(`map:    ${mapPath} (tool-internal; do not ship to reader-web)`);
  console.log(`preview: ${path.join(fixturesDir, "preview.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
