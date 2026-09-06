import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.READER_HOST_PORT ?? 3982);
const hostFile = path.join(here, "host.html");

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname !== "/" && url.pathname !== "/host.html") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const body = fs.readFileSync(hostFile);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  res.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`example host http://127.0.0.1:${port}/host.html`);
});
