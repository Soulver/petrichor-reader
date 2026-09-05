"""Subset a master font and remap listed glyphs onto PUA codepoints.

Reads a JSON job from stdin:

{
  "masterPath": "...",
  "outputPath": "...",
  "fontFamily": "pr-sess-preview",
  "psName": "PrSessPreview",
  "mappings": [{"from": 19968, "to": 57344}, ...],
  "passthrough": [9, 10, 13, 32]
}
"""

from __future__ import annotations

import json
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

TOFU = 0x25A1


def _set_family_names(font: TTFont, family: str, ps_name: str) -> None:
    name = font["name"]
    pairs = [
        (1, family),
        (2, "Regular"),
        (3, f"{ps_name};petrichor-reader"),
        (4, f"{family} Regular"),
        (6, ps_name),
        (16, family),
        (17, "Regular"),
    ]
    for name_id, value in pairs:
        written = False
        for plat_id, enc_id, lang_id in (
            (3, 1, 0x409),
            (1, 0, 0),
        ):
            try:
                name.setName(value, name_id, plat_id, enc_id, lang_id)
                written = True
            except Exception:
                continue
        if not written:
            name.setName(value, name_id, 3, 1, 0x409)


def _replace_cmap(font: TTFont, mapping: dict[int, str]) -> None:
    table = font["cmap"]
    max_cp = max(mapping) if mapping else 0
    subtables: list[CmapSubtable] = []

    def add(fmt: int, plat: int, enc: int) -> None:
        sub = CmapSubtable.newSubtable(fmt)
        sub.platformID = plat
        sub.platEncID = enc
        sub.language = 0
        sub.cmap = dict(mapping)
        subtables.append(sub)

    if max_cp > 0xFFFF:
        add(12, 3, 10)
        add(12, 0, 4)
    else:
        add(4, 3, 1)
        add(4, 0, 3)

    table.tables = subtables


def build(job: dict) -> None:
    font = TTFont(job["masterPath"], lazy=False)
    original_cmap = font.getBestCmap() or {}

    passthrough = {int(cp) for cp in job.get("passthrough", [])}
    passthrough.add(0x20)

    needed: set[int] = set(passthrough)
    needed.add(TOFU)

    glyph_from: dict[int, str | None] = {}
    for item in job["mappings"]:
        src = int(item["from"])
        if src in original_cmap:
            glyph_from[src] = original_cmap[src]
            needed.add(src)
        else:
            glyph_from[src] = None
            needed.add(TOFU)

    options = Options()
    options.desubroutinize = True
    options.hinting = False
    options.layout_features = []
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.drop_tables += ["DSIG"]

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=needed)
    subsetter.subset(font)

    cmap = font.getBestCmap() or {}
    tofu_name = cmap.get(TOFU, ".notdef")

    new_map: dict[int, str] = {}
    for cp in passthrough:
        if cp in cmap:
            new_map[cp] = cmap[cp]

    for item in job["mappings"]:
        src = int(item["from"])
        dst = int(item["to"])
        name = glyph_from[src]
        if name is None:
            new_map[dst] = tofu_name
        else:
            new_map[dst] = cmap.get(src, name if name in font.getGlyphOrder() else tofu_name)

    _replace_cmap(font, new_map)
    _set_family_names(font, job["fontFamily"], job["psName"])

    font.flavor = "woff2"
    font.save(job["outputPath"])
    font.close()


def main() -> None:
    job = json.load(sys.stdin)
    build(job)


if __name__ == "__main__":
    main()
