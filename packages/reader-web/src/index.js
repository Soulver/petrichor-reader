import { createServer, DEFAULT_PORT } from "./server.js";

const port = Number(process.env.READER_WEB_PORT ?? DEFAULT_PORT);
const host = process.env.READER_LISTEN_HOST ?? "127.0.0.1";
const server = createServer();

server.listen(port, host, () => {
  console.log(`reader-web http://${host}:${port}/read?chapterId=sample`);
});
