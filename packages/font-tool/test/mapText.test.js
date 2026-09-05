import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMapping,
  decodeText,
  encodeText,
  mappingFromJson,
  mappingToJson,
} from "../src/mapText.js";
import { isPassthroughChar } from "../src/policy.js";

const SAMPLE =
  "春江潮水连海平，海上明月共潮生。\n滟滟随波千万里，何处春江无月明！";

test("whitespace is not mapped; punctuation is mapped", () => {
  assert.equal(isPassthroughChar(" "), true);
  assert.equal(isPassthroughChar("\n"), true);
  assert.equal(isPassthroughChar("　"), true);
  assert.equal(isPassthroughChar("，"), false);
  assert.equal(isPassthroughChar("春"), false);
});

test("encoded text does not contain the original sentence", () => {
  const { forward } = buildMapping(SAMPLE);
  const encoded = encodeText(SAMPLE, forward);
  assert.equal(encoded.includes("春江潮水连海平"), false);
  assert.equal(encoded.includes("海上明月共潮生"), false);
  assert.match(encoded, /\n/);
});

test("mapping is reversible inside the font-tool", () => {
  const { forward } = buildMapping(SAMPLE);
  const encoded = encodeText(SAMPLE, forward);
  assert.equal(decodeText(encoded, forward), SAMPLE);
  const roundTrip = mappingFromJson(mappingToJson(forward));
  assert.equal(decodeText(encoded, roundTrip), SAMPLE);
});
