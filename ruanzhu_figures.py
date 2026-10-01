# -*- coding: utf-8 -*-
"""Diagrams for section 4 of the software copyright specification."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CJK = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
LATIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LATIN_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

INK = (32, 40, 48)
MUTED = (78, 88, 98)
LINE = (62, 78, 94)
NAVY = (36, 64, 92)
TEAL = (28, 92, 102)
BROWN = (122, 84, 36)
PAPER = (252, 251, 248)
CARD = (255, 255, 255)
BAND = (236, 241, 245)
BAND2 = (232, 240, 238)
BAND3 = (244, 238, 228)
RULE = (196, 186, 168)


def _font(size: int, *, cjk: bool = True, bold: bool = False) -> ImageFont.FreeTypeFont:
    if cjk:
        return ImageFont.truetype(CJK, size, index=0)
    return ImageFont.truetype(LATIN_B if bold else LATIN, size)


def _text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> float:
    return draw.textlength(text, font=font)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: float) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        buf = ""
        for ch in para:
            trial = buf + ch
            if _text_w(draw, trial, font) <= max_w:
                buf = trial
            else:
                if buf:
                    lines.append(buf)
                buf = ch
        lines.append(buf)
    return lines


def _round(draw, xy, r, fill, outline, width=2):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def _center(draw, xy, text, font, fill):
    x0, y0, x1, y1 = xy
    w = _text_w(draw, text, font)
    h = font.size
    draw.text(((x0 + x1 - w) / 2, (y0 + y1 - h) / 2 - 2), text, font=font, fill=fill)


def _arrow_v(draw, x, y0, y1, fill=LINE):
    draw.line((x, y0, x, y1 - 10), fill=fill, width=3)
    draw.polygon([(x - 7, y1 - 12), (x + 7, y1 - 12), (x, y1)], fill=fill)


def _arrow_h(draw, x0, x1, y, fill=LINE):
    draw.line((x0, y, x1 - 12, y), fill=fill, width=3)
    draw.polygon([(x1 - 14, y - 7), (x1 - 14, y + 7), (x1, y)], fill=fill)


def _save(img: Image.Image, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)
    return path


def fig_architecture(path: Path) -> Path:
    w, h = 1600, 980
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    title_f = _font(36)
    sub_f = _font(22)
    box_f = _font(28)
    small_f = _font(22)
    d.text((48, 28), "信任边界：权限随靠近浏览器而递减", font=title_f, fill=INK)
    d.text((48, 78), "明文与可逆映射不得越过接口层进入浏览器或宿主 DOM", font=sub_f, fill=MUTED)

    layers = [
        (BAND, NAVY, "T3  宿主域", "embed.js + 占位节点", "只创建 iframe，postMessage 只收高度，不含正文"),
        (CARD, TEAL, "T2  字形域", "reader-web  /read", "仅持有 PUA 字符串、font-family 与一次性 woff2"),
        (BAND2, (24, 78, 72), "T1  凭证域", "reader-api", "进程内短暂明文；CORS 锁源；票与字体句柄绑定"),
        (BAND3, BROWN, "T0  构造域", "font-tool + 稿件源", "出现序映射 σ、码位函数 π、cmap 重挂与子集化"),
    ]
    y = 140
    box_h = 150
    for i, (fill, accent, name, mod, desc) in enumerate(layers):
        _round(d, (70, y, 1530, y + box_h), 16, fill, LINE, 2)
        d.rectangle((70, y, 86, y + box_h), fill=accent)
        d.text((120, y + 22), name, font=box_f, fill=accent)
        d.text((430, y + 26), mod, font=box_f, fill=INK)
        d.text((120, y + 86), desc, font=small_f, fill=MUTED)
        if i < len(layers) - 1:
            _arrow_v(d, 800, y + box_h, y + box_h + 48)
            labels = ["iframe  /read?chapterId", "HTTPS   CORS 仅允许阅读器源", "stdin JSON   Python 子进程"]
            d.text((830, y + box_h + 8), labels[i], font=small_f, fill=MUTED)
        y += box_h + 48
    return _save(img, path)


def fig_mapping_flow(path: Path) -> Path:
    w, h = 1600, 1180
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    d.text((48, 24), "出现序私有区映射流水线", font=_font(36), fill=INK)
    d.text((48, 74), "同一章节内，非空白字符按首次出现顺序编号，再经 π 落入 PUA", font=_font(22), fill=MUTED)

    def box(x, y, bw, bh, text, fill=CARD, accent=NAVY):
        _round(d, (x, y, x + bw, y + bh), 14, fill, LINE, 2)
        d.rectangle((x, y, x + 12, y + bh), fill=accent)
        lines = _wrap(d, text, _font(24), bw - 48)
        total = len(lines) * 34
        yy = y + (bh - total) / 2
        for line in lines:
            tw = _text_w(d, line, _font(24))
            d.text((x + (bw - tw) / 2 + 6, yy), line, font=_font(24), fill=INK)
            yy += 34

    box(560, 130, 480, 80, "输入  C = c1 c2 … cn")
    _arrow_v(d, 800, 210, 268)
    box(430, 268, 740, 90, "谓词  W(c) ？\nJavaScript /\\s/u 空白")
    # yes / no
    d.line((500, 358, 280, 430), fill=LINE, width=3)
    d.line((1100, 358, 1320, 430), fill=LINE, width=3)
    d.text((300, 368), "是", font=_font(22), fill=TEAL)
    d.text((1180, 368), "否", font=_font(22), fill=BROWN)
    box(80, 430, 400, 100, "直通\nE(c) = c", fill=BAND2, accent=TEAL)
    box(1120, 430, 420, 100, "查出现序表 σ", fill=BAND3, accent=BROWN)
    _arrow_v(d, 1330, 530, 600)
    box(1120, 600, 420, 120, "首次出现：σ(c)=k\n再次出现：复用 k", fill=BAND3, accent=BROWN)
    _arrow_v(d, 1330, 720, 790)
    box(1080, 790, 480, 110, "π(k) → PUA 码位\nE(c) = chr(π(k))", fill=CARD, accent=NAVY)
    # merge
    d.line((280, 530, 280, 980), fill=LINE, width=3)
    d.line((1330, 900, 1330, 980), fill=LINE, width=3)
    d.line((280, 980, 800, 980), fill=LINE, width=3)
    d.line((1330, 980, 800, 980), fill=LINE, width=3)
    _arrow_v(d, 800, 980, 1030)
    box(300, 1030, 1000, 110, "断言编码结果不含汉字区码位\n通过后方可外发；否则返回 503", fill=(255, 246, 240), accent=(160, 72, 48))
    return _save(img, path)


def fig_formulas(path: Path) -> Path:
    w, h = 1600, 980
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    d.text((48, 24), "码位函数与外发条件", font=_font(36), fill=INK)
    d.text((48, 76), "符号与 packages/font-tool/src/policy.js、mapText.js 一致", font=_font(22), fill=MUTED)

    blocks = [
        ("1  私有区容量", [
            ("latin", "N = (0xF8FF - 0xE000) + 1 = 6400"),
            ("cjk", "基本多文种平面私有区为 U+E000 至 U+F8FF；用尽后从 U+F0000 继续"),
        ]),
        ("2  出现序单射", [
            ("latin", "sigma(c) = count of distinct non-space chars before first c"),
            ("cjk", "sigma 只在本章文本上定义。空白不占号，跨章不共用同一张表"),
        ]),
        ("3  码位函数", [
            ("latin", "pi(k) = 0xE000 + k            when 0 <= k < N"),
            ("latin", "pi(k) = 0xF0000 + (k - N)     when k >= N"),
        ]),
        ("4  编码与验收", [
            ("latin", "E(c) = c                     when W(c)"),
            ("latin", "E(c) = character(pi(sigma(c)))    otherwise"),
            ("latin", "accept only when E(title) and E(body) contain no Han"),
            ("cjk", "汉字判定区间为 U+3400 至 U+9FFF，与服务端正则一致"),
        ]),
    ]
    y = 130
    latin = _font(26, cjk=False)
    zh = _font(24)
    for head, lines in blocks:
        bh = 36 + 22 + len(lines) * 40 + 18
        _round(d, (48, y, 1552, y + bh), 12, CARD, LINE, 2)
        d.rectangle((48, y, 64, y + bh), fill=NAVY)
        d.text((84, y + 14), head, font=_font(24), fill=NAVY)
        yy = y + 62
        for kind, line in lines:
            d.text((84, yy), line, font=latin if kind == "latin" else zh, fill=INK)
            yy += 40
        y += bh + 16
    return _save(img, path)


def fig_cmap(path: Path) -> Path:
    w, h = 1600, 1040
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    d.text((48, 24), "子集化与 cmap 重挂", font=_font(36), fill=INK)
    d.text((48, 74), "只保留本章用到的字形，并把字形挂到目标 PUA 码位", font=_font(22), fill=MUTED)

    steps = [
        ("1", "读取母版", "TTFont(master)\n记录 original cmap"),
        ("2", "收集码位", "直通码位并上源码位\n再并上豆腐 U+25A1"),
        ("3", "子集", "hinting 关闭\ndesubroutinize\n丢弃 DSIG"),
        ("4", "重挂字形", "dst → glyph(src)\n缺字 → 豆腐 / .notdef\n空白码位保持直通"),
        ("5", "选择子表", "max ≤ U+FFFF → format 4\n否则 format 12\nMicrosoft 与 Unicode 各一份"),
        ("6", "封装", "改 family / PostScript 名\nflavor = woff2\n绑定到 fontId"),
    ]
    positions = [
        (60, 150), (580, 150), (1100, 150),
        (60, 560), (580, 560), (1100, 560),
    ]
    bw, bh = 440, 280
    num_f = _font(32, cjk=False, bold=True)
    head_f = _font(28)
    body_f = _font(24)
    for (num, head, body), (x, y) in zip(steps, positions):
        _round(d, (x, y, x + bw, y + bh), 16, CARD, LINE, 2)
        d.ellipse((x + 24, y + 24, x + 84, y + 84), fill=NAVY)
        tw = _text_w(d, num, num_f)
        d.text((x + 54 - tw / 2, y + 36), num, font=num_f, fill=(255, 255, 255))
        d.text((x + 104, y + 36), head, font=head_f, fill=INK)
        yy = y + 120
        for line in body.split("\n"):
            d.text((x + 32, yy), line, font=body_f, fill=MUTED)
            yy += 40
    # arrows row 1
    _arrow_h(d, 500, 580, 290)
    _arrow_h(d, 1020, 1100, 290)
    # down from 3 to 4 via a turn is messy; draw small captions instead
    d.text((500, 470), "按从左到右、再下一行的顺序执行", font=_font(22), fill=MUTED)
    return _save(img, path)


def fig_sequence(path: Path) -> Path:
    w, h = 1760, 1280
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    d.text((40, 20), "短时票拉取时序", font=_font(36), fill=INK)
    d.text((40, 72), "票 192 bit，字体句柄 128 bit，默认有效期 300 秒；过期后字体地址一并失效", font=_font(22), fill=MUTED)

    cols = [
        (160, "宿主"),
        (580, "阅读页"),
        (1040, "接口"),
        (1540, "字体进程"),
    ]
    head_f = _font(26)
    for x, name in cols:
        _round(d, (x - 100, 130, x + 100, 188), 10, NAVY, NAVY, 1)
        tw = _text_w(d, name, head_f)
        d.text((x - tw / 2, 142), name, font=head_f, fill=(255, 255, 255))
        d.line((x, 188, x, 1220), fill=(186, 196, 206), width=2)

    events = [
        (0, 1, "iframe 打开 /read?chapterId"),
        (1, 2, "POST /v1/reader/ticket"),
        (2, 2, "解析章节\n签发 ticket 与 fontId"),
        (2, 1, "返回 ticket 与过期时间"),
        (1, 2, "GET /v1/reader/chapter?ticket"),
        (2, 3, "映射、汉字断言、JSON 任务"),
        (3, 2, "返回 woff2"),
        (2, 1, "返回私有区正文与字体地址"),
        (1, 1, "FontFace 加载成功后\n写入文本节点"),
        (1, 0, "postMessage，载荷只有高度"),
    ]
    y = 250
    ev_f = _font(22)
    for src, dst, label in events:
        x0 = cols[src][0]
        x1 = cols[dst][0]
        if src == dst:
            lines = []
            for part in label.split("\n"):
                lines.extend(_wrap(d, part, ev_f, 360))
            box_w = 390
            box_h = 20 + len(lines) * 32
            _round(d, (x0 + 18, y, x0 + 18 + box_w, y + box_h), 10, CARD, TEAL, 2)
            yy = y + 10
            for line in lines:
                d.text((x0 + 32, yy), line, font=ev_f, fill=INK)
                yy += 32
            y += box_h + 36
            continue
        mid_y = y + 8
        if x1 > x0:
            _arrow_h(d, x0, x1, mid_y)
        else:
            d.line((x0, mid_y, x1 + 14, mid_y), fill=LINE, width=3)
            d.polygon([(x1 + 16, mid_y - 7), (x1 + 16, mid_y + 7), (x1, mid_y)], fill=LINE)
        tw = _text_w(d, label, ev_f)
        lx = (x0 + x1) / 2 - tw / 2
        d.rectangle((lx - 6, y - 30, lx + tw + 6, y - 2), fill=PAPER)
        d.text((lx, y - 28), label, font=ev_f, fill=INK)
        y += 86
    return _save(img, path)


def fig_purify(path: Path) -> Path:
    w, h = 1600, 420
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    d.text((40, 20), "远程 HTML 纯化", font=_font(36), fill=INK)
    d.text((40, 72), "映射算法的输入是读者意义上的正文，不是标签字符", font=_font(22), fill=MUTED)
    steps = ["CMS HTML", "br / 块级结束\n→ 换行", "删除其余标签", "还原命名实体\n与数字实体", "压缩连续空行", "纯文本\n进入 σ / π"]
    bw, bh = 210, 150
    gap = 40
    x = 36
    y = 160
    f = _font(22)
    for i, text in enumerate(steps):
        fill = BAND3 if i in (0, len(steps) - 1) else CARD
        _round(d, (x, y, x + bw, y + bh), 12, fill, LINE, 2)
        lines = text.split("\n")
        total = len(lines) * 32
        yy = y + (bh - total) / 2
        for line in lines:
            tw = _text_w(d, line, f)
            d.text((x + (bw - tw) / 2, yy), line, font=f, fill=INK)
            yy += 32
        if i < len(steps) - 1:
            _arrow_h(d, x + bw, x + bw + gap, y + bh / 2)
        x += bw + gap
    return _save(img, path)


def build_figures(directory: Path) -> dict[str, Path]:
    directory.mkdir(parents=True, exist_ok=True)
    return {
        "arch": fig_architecture(directory / "fig-4-1-architecture.png"),
        "map": fig_mapping_flow(directory / "fig-4-2-mapping.png"),
        "formula": fig_formulas(directory / "fig-4-3-formulas.png"),
        "cmap": fig_cmap(directory / "fig-4-4-cmap.png"),
        "seq": fig_sequence(directory / "fig-4-5-sequence.png"),
        "html": fig_purify(directory / "fig-4-6-html.png"),
    }
