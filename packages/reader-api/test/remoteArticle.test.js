import assert from "node:assert/strict";
import test from "node:test";
import { htmlToPlain } from "../src/remoteArticle.js";

test("htmlToPlain strips tags and keeps line breaks", () => {
  const out = htmlToPlain("<p>春江</p><br/>潮水&nbsp;连海平");
  assert.equal(out.includes("<"), false);
  assert.match(out, /春江/);
  assert.match(out, /潮水 连海平/);
});
