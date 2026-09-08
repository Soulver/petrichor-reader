import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createObfuscator } from "../src/obfuscate.js";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-obfuscate-"));
}

test("font cache hits the same revision and rebuilds after updateTime changes", async () => {
  const generatedDir = tempDir();
  let builds = 0;
  const obfuscator = createObfuscator({
    repoRoot: generatedDir,
    generatedDir,
    masterPath: path.join(generatedDir, "master.otf"),
    buildFont: async (job) => {
      builds += 1;
      fs.writeFileSync(job.outputPath, Buffer.from("wOF2fake"));
    },
  });

  const v1 = { id: "9", title: "标题", body: "<p>旧文</p>", updatedAt: "100" };
  const first = await obfuscator.forChapter(v1);
  const second = await obfuscator.forChapter({ ...v1 });
  assert.equal(builds, 1);
  assert.equal(first.bodyGlyphs, second.bodyGlyphs);

  const v2 = { ...v1, body: "<p>新文多一字</p>", updatedAt: "200" };
  const third = await obfuscator.forChapter(v2);
  assert.equal(builds, 2);
  assert.notEqual(first.revision, third.revision);
  assert.notEqual(first.bodyGlyphs, third.bodyGlyphs);
});
