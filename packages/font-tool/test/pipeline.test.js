import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { findMasterFont } from "../src/buildFont.js";
import { decodeText, mappingFromJson } from "../src/mapText.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const pkgRoot = path.resolve(here, "..");

test("pipeline: preview has no original sentence; map reverses internally", async (t) => {
  const master = findMasterFont(path.join(repoRoot, "fonts/master"));
  if (!master) {
    t.skip("master font not downloaded yet");
    return;
  }

  execFileSync(process.execPath, [path.join(pkgRoot, "src/cli.js")], {
    cwd: pkgRoot,
    stdio: "inherit",
  });

  const chapter = fs
    .readFileSync(path.join(repoRoot, "fixtures/chapters/sample.txt"), "utf8")
    .replace(/^\uFEFF/, "");
  const firstLine = chapter.trim().split(/\n/)[0];
  const preview = fs.readFileSync(
    path.join(repoRoot, "fixtures/preview.html"),
    "utf8",
  );
  const mapJson = JSON.parse(
    fs.readFileSync(path.join(pkgRoot, "output/map.json"), "utf8"),
  );
  const woff2 = fs.statSync(path.join(pkgRoot, "output/subset.woff2"));

  assert.ok(woff2.size > 1000);
  assert.equal(preview.includes(firstLine), false);
  assert.match(preview, /font-family: "pr-sess-preview"/);
  assert.equal(preview.includes("Noto"), false);
  assert.equal(preview.includes("Source"), false);

  const encodedMatch = preview.match(/<div class="chapter">([\s\S]*?)<\/div>/);
  assert.ok(encodedMatch);
  const encoded = encodedMatch[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
  const decoded = decodeText(encoded, mappingFromJson(mapJson));
  assert.equal(decoded, chapter);

  const readerWeb = path.join(repoRoot, "packages/reader-web");
  const webFiles = fs.existsSync(readerWeb)
    ? fs.readdirSync(readerWeb, { recursive: true })
    : [];
  for (const rel of webFiles) {
    const full = path.join(readerWeb, rel);
    if (!fs.statSync(full).isFile()) continue;
    const src = fs.readFileSync(full, "utf8");
    assert.equal(src.includes("decodeText"), false);
  }
});
