import { createServer, DEFAULT_PORT } from "./server.js";

const port = Number(process.env.READER_WEB_PORT ?? DEFAULT_PORT);
const server = createServer();

server.listen(port, "127.0.0.1", () => {
  console.log(`reader-web http://127.0.0.1:${port}/read?chapterId=sample`);
});
