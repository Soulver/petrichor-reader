"""Subset a master font and remap listed glyphs onto PUA codepoints."""

import json
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

TOFU = 0x25A1


def _set_family_names(font, family, ps_name):
    name = font["name"]
    pairs = [
        (1, family),
        (2, "Regular"),
        (3, "%s;petrichor-reader" % ps_name),
        (4, "%s Regular" % family),
        (6, ps_name),
        (16, family),
        (17, "Regular"),
    ]
    for name_id, value in pairs:
        written = False
        for plat_id, enc_id, lang_id in ((3, 1, 0x409), (1, 0, 0)):
            try:
                name.setName(value, name_id, plat_id, enc_id, lang_id)
                written = True
            except Exception:
                continue
        if not written:
            name.setName(value, name_id, 3, 1, 0x409)


def _replace_cmap(font, mapping):
    table = font["cmap"]
    max_cp = max(mapping) if mapping else 0
    subtables = []

    def add(fmt, plat, enc):
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


def build(job):
    font = TTFont(job["masterPath"], lazy=False)
    original_cmap = font.getBestCmap() or {}

    passthrough = set(int(cp) for cp in job.get("passthrough", []))
    passthrough.add(0x20)

    needed = set(passthrough)
    needed.add(TOFU)

    glyph_from = {}
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
    drop = getattr(options, "drop_tables", None)
    if isinstance(drop, set):
        drop.add("DSIG")
    elif drop is not None:
        options.drop_tables = list(drop) + ["DSIG"]

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=needed)
    subsetter.subset(font)

    cmap = font.getBestCmap() or {}
    tofu_name = cmap.get(TOFU, ".notdef")
    order = font.getGlyphOrder()

    new_map = {}
    for cp in passthrough:
        if cp in cmap:
            new_map[cp] = cmap[cp]

    for item in job["mappings"]:
        src = int(item["from"])
        dst = int(item["to"])
        gname = glyph_from[src]
        if gname is None:
            new_map[dst] = tofu_name
        elif src in cmap:
            new_map[dst] = cmap[src]
        elif gname in order:
            new_map[dst] = gname
        else:
            new_map[dst] = tofu_name

    _replace_cmap(font, new_map)
    _set_family_names(font, job["fontFamily"], job["psName"])

    font.flavor = "woff2"
    font.save(job["outputPath"])
    font.close()


def main():
    job = json.load(sys.stdin)
    build(job)


if __name__ == "__main__":
    main()
