import { createServer } from "./server.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const server = createServer(config);

server.listen(config.port, "127.0.0.1", () => {
  console.log(`reader-api http://127.0.0.1:${config.port}`);
});
