import { createServer } from "./server.js";
import { loadConfig } from "./config.js";

const config = loadConfig({
  articleByIdUrl:
    process.env.READER_ARTICLE_BY_ID_URL ??
    "http://www.missimylan.info:8082/article/byId",
});
const host = process.env.READER_LISTEN_HOST ?? "127.0.0.1";
const server = createServer(config);

server.listen(config.port, host, () => {
  console.log(`reader-api http://${host}:${config.port}`);
});
