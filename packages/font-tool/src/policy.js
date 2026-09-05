/**
 * Frozen whitespace / punctuation policy for glyph remapping.
 *
 * - Whitespace (JS `\s`, including space, tab, CR/LF, NBSP, ideographic space)
 *   is passed through unchanged so layout survives without a mapping.
 * - Every other visible character (letters, digits, CJK, punctuation) is
 *   mapped onto PUA starting at U+E000.
 * - Characters missing from the master font still get a PUA slot; the font
 *   builder paints a box (U+25A1 / .notdef) there.
 */

const PUA_BMP_START = 0xe000;
const PUA_BMP_END = 0xf8ff;
const PUA_SUPP_START = 0xf0000;

export function isPassthroughChar(ch) {
  return /\s/u.test(ch);
}

export function puaCodePoint(index) {
  const bmpSpan = PUA_BMP_END - PUA_BMP_START + 1;
  if (index < bmpSpan) {
    return PUA_BMP_START + index;
  }
  return PUA_SUPP_START + (index - bmpSpan);
}

export const TOFU_CODE_POINT = 0x25a1;
export const FONT_FAMILY_PREFIX = "pr-sess-";
