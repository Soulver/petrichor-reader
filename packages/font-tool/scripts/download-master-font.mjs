/**
 * Download Noto Sans SC Regular (static) into fonts/master/.
 * Prefers the official regional-subset OTF; falls back to Fontsource static woff.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const masterDir = path.join(repoRoot, "fonts/master");
const oflPath = path.join(repoRoot, "fonts/OFL.txt");

const OTF_URLS = [
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf",
  "https://ghproxy.net/https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf",
  "https://gh-proxy.com/https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf",
];

const WOFF_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.8/files/noto-sans-sc-chinese-simplified-400-normal.woff",
];

const OFL_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.8/LICENSE",
];

function curlTo(url, dest, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = ["-L", "--fail", "--connect-timeout", "20", "--max-time", "300", ...extraArgs, "-o", dest, url];
    const child = spawn("curl.exe", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl ${code} for ${url}`));
    });
  });
}

async function tryUrls(urls, dest, extraArgs = []) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let lastErr;
  for (const url of urls) {
    try {
      console.log(`GET ${url}`);
      await curlTo(url, dest, extraArgs);
      const size = fs.statSync(dest).size;
      if (size < 50_000) {
        throw new Error(`file too small: ${size}`);
      }
      console.log(`saved ${dest} (${size} bytes)`);
      return dest;
    } catch (err) {
      lastErr = err;
      console.warn(String(err.message || err));
    }
  }
  throw lastErr ?? new Error("no urls");
}

async function main() {
  fs.mkdirSync(masterDir, { recursive: true });
  const otfDest = path.join(masterDir, "NotoSansSC-Regular.otf");
  try {
    const resume = fs.existsSync(otfDest) ? ["-C", "-"] : [];
    await tryUrls(OTF_URLS, otfDest, resume);
  } catch {
    console.warn("Official OTF unavailable; falling back to Fontsource static woff.");
    await tryUrls(WOFF_URLS, path.join(masterDir, "NotoSansSC-Regular.woff"));
  }

  if (!fs.existsSync(oflPath) || fs.statSync(oflPath).size < 100) {
    await tryUrls(OFL_URLS, oflPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
