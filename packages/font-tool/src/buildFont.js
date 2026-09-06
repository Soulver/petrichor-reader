import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(here, "../python/remap_subset.py");

export function findMasterFont(fontsMasterDir) {
  const preferred = [
    "NotoSansSC-Regular.otf",
    "NotoSansSC-Regular.ttf",
    "NotoSansSC-Regular.woff",
    "NotoSansSC-Regular.woff2",
  ];
  for (const name of preferred) {
    const full = path.join(fontsMasterDir, name);
    if (fs.existsSync(full) && fs.statSync(full).size > 100_000) {
      return full;
    }
  }
  return null;
}

function pythonBin() {
  return process.env.READER_PYTHON || process.env.PYTHON || "python3";
}

export function buildWoff2(job) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin(), [SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`remap_subset.py exited ${code}: ${stderr}`));
      }
    });
    child.stdin.write(JSON.stringify(job));
    child.stdin.end();
  });
}
