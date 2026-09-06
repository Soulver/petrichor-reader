# -*- coding: utf-8 -*-
"""Generate software copyright identification materials (docx)."""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "软著申请材料"
SOFTWARE = "基于动态子集字体与Unicode私有区码位映射的网页小说防采集阅读系统"
VERSION = "V1.0"
HEADER = f"{SOFTWARE} {VERSION}"

SOURCE_FILES = [
    "packages/font-tool/src/policy.js",
    "packages/font-tool/src/mapText.js",
    "packages/font-tool/src/buildFont.js",
    "packages/font-tool/src/cli.js",
    "packages/font-tool/python/remap_subset.py",
    "packages/font-tool/scripts/download-master-font.mjs",
    "packages/reader-api/src/config.js",
    "packages/reader-api/src/chapters.js",
    "packages/reader-api/src/rateLimit.js",
    "packages/reader-api/src/tickets.js",
    "packages/reader-api/src/remoteArticle.js",
    "packages/reader-api/src/obfuscate.js",
    "packages/reader-api/src/server.js",
    "packages/reader-api/src/index.js",
    "packages/reader-web/src/server.js",
    "packages/reader-web/src/index.js",
    "packages/reader-web/public/read.html",
    "packages/reader-web/public/read.css",
    "packages/reader-web/public/read.js",
    "packages/reader-web/public/embed.js",
    "examples/serve.mjs",
    "examples/host.html",
    "packages/font-tool/test/mapText.test.js",
    "packages/font-tool/test/pipeline.test.js",
    "packages/reader-api/test/api.test.js",
    "packages/reader-api/test/remoteArticle.test.js",
    "packages/reader-web/test/page.test.js",
]


def set_run_font(run, east="宋体", ascii_font="Times New Roman", size=12, bold=False):
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = ascii_font
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), ascii_font)
    rFonts.set(qn("w:hAnsi"), ascii_font)
    rFonts.set(qn("w:eastAsia"), east)


def set_paragraph_format(p, before=0, after=6, line=22, first_line=None):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = Pt(line)
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    if first_line is not None:
        pf.first_line_indent = Cm(first_line)


def add_page_number(paragraph):
    run1 = paragraph.add_run("第 ")
    set_run_font(run1, size=9)
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    r2 = paragraph.add_run()
    r2._element.append(fld1)
    r3 = paragraph.add_run()
    r3._element.append(instr)
    r4 = paragraph.add_run()
    r4._element.append(fld2)
    run5 = paragraph.add_run(" 页")
    set_run_font(run5, size=9)


def setup_header_footer(section, extra=""):
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = hp.add_run(HEADER + extra)
    set_run_font(run, east="宋体", size=9)
    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_page_number(fp)


def setup_page(doc, top=2.5, bottom=2.5, left=2.5, right=2.5):
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(top)
    section.bottom_margin = Cm(bottom)
    section.left_margin = Cm(left)
    section.right_margin = Cm(right)
    section.header_distance = Cm(1.2)
    section.footer_distance = Cm(1.2)
    setup_header_footer(section)
    return section


def add_title(doc, text, size=16):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_format(p, before=6, after=10, line=28)
    run = p.add_run(text)
    set_run_font(run, east="黑体", ascii_font="Arial", size=size, bold=True)


def add_heading_cn(doc, text, level=1):
    size = 14 if level == 1 else 13 if level == 2 else 12
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    set_paragraph_format(p, before=10, after=6, line=24)
    run = p.add_run(text)
    set_run_font(run, east="黑体", ascii_font="Arial", size=size, bold=True)


def add_body(doc, text, indent=True):
    p = doc.add_paragraph()
    set_paragraph_format(p, before=0, after=6, line=22, first_line=0.74 if indent else 0)
    run = p.add_run(text)
    set_run_font(run, size=12)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph()
    set_paragraph_format(p, before=0, after=3, line=22, first_line=0)
    pf = p.paragraph_format
    pf.left_indent = Cm(0.74)
    run = p.add_run("• " + text)
    set_run_font(run, size=12)


def add_pre(doc, text):
    for line in text.splitlines() or [""]:
        p = doc.add_paragraph()
        set_paragraph_format(p, before=0, after=0, line=16, first_line=0)
        run = p.add_run(line if line else " ")
        set_run_font(run, east="宋体", ascii_font="Consolas", size=9)


def spec_paragraphs():
    return [
        ("title", "计算机软件著作权登记说明书"),
        ("h1", "引言"),
        ("p", "本文档旨在为“基于动态子集字体与Unicode私有区码位映射的网页小说防采集阅读系统”（以下简称“本软件”或“Petrichor Reader”）申请中华人民共和国国家版权局计算机软件著作权登记提供全面、详尽的技术与功能说明。作为核心证明材料，本文档将系统性地阐述该软件的开发背景、设计目标、功能构成、技术架构、核心算法实现、宿主嵌入协议、操作流程以及关键创新点，以期完整、清晰地呈现本软件的独创性、工程完备性与实用价值。"),
        ("p", "本软件是作者针对公开网页小说正文易被自动化程序通过超文本标记语言（HTML）、文档对象模型（DOM）的 innerText / textContent 接口以及章节接口响应体直接提取这一现实问题，独立设计与开发的原创性成果。文档将重点围绕以下几个方面展开："),
        ("bullet", "开发背景与目标：阐明为何不能依赖前端加密、禁止复制或混淆脚本等常见手段，而必须把明文留在阅读器服务端，对外仅输出私有区码位与配套子集字体。"),
        ("bullet", "功能设计与实现：详述字体流水线、阅读票协议、混淆正文接口、阅读器页面、宿主嵌入脚本以及远程稿件接入等模块如何构成完整业务闭环。"),
        ("bullet", "技术架构与算法：深入剖析字符到 Unicode 私有使用区（Private Use Area，PUA）的稳定映射、基于 fontTools 的 cmap 重写与 woff2 子集化、短时阅读票与字体句柄绑定、同源策略与跨源资源共享（CORS）锁定、iframe 隔离与高度回传等实现细节。"),
        ("bullet", "独创性与价值：凝练本软件在“字形可见、码位不可读、宿主无正文、失败即关闭”这一工程范式上的贡献，证明其并非对现有阅读器或字体库的简单拼接。"),
        ("h1", "一、软件概述与开发背景"),
        ("h2", "1.1 软件全称与版本号"),
        ("p", "软件全称：基于动态子集字体与Unicode私有区码位映射的网页小说防采集阅读系统"),
        ("p", "软件简称：Petrichor Reader（雨后尘阅读器）"),
        ("p", "版本号：V1.0"),
        ("p", "软件分类建议：应用软件 / 网络应用软件（阅读展示与内容防护）。开发的硬件环境为通用微型计算机；运行的硬件环境为通用微型计算机或云服务器；开发该软件的操作系统为 Microsoft Windows 10；软件开发环境 / 开发工具为 Visual Studio Code、Node.js 18 及以上、Python 3.10 及以上；该软件的运行平台 / 操作系统为 Windows、Linux 或 macOS 上的 Node.js 运行时，客户端为现代浏览器；源程序量以实际提交的鉴别材料页数为准；开发目的为原创；开发方式为独立开发；权利取得方式为原始取得。"),
        ("h2", "1.2 开发背景与目的"),
        ("p", "背景分析。随着网络文学与个人站点长文发布的普及，章节正文普遍以 HTML 明文或 JSON 明文的形式直接写入浏览器。搜索引擎爬虫、站点镜像工具、浏览器扩展以及针对 DOM 的批量脚本均可在毫秒级内获得与读者所见完全一致的文本。传统应对手段存在明显瓶颈："),
        ("bullet", "前端禁止右键、禁止复制：仅干扰交互，无法阻止查看源代码、开发者工具或无头浏览器读取节点文本。"),
        ("bullet", "传输层对称加密后在浏览器解密：密钥与算法必然随脚本下发，自动化程序只需复现同一解密过程即可还原明文。"),
        ("bullet", "对 CSS 做简单字符替换而不改字体 cmap：人眼与爬虫看到的仍是同一 Unicode 标量值，复制即可得到原文。"),
        ("bullet", "将阅读逻辑耦合进博客前端仓库：防护实现与内容管理系统生命周期绑定，难以独立演进、独立部署，也难以开源复用。"),
        ("p", "与此同时，中文正文对字体授权极为敏感。若对商业字体擅自改写码位表并再分发，将直接构成授权违约。因此本软件在字体母版上选用 SIL Open Font License 1.1 许可的 Noto Sans SC（思源黑体简体区域子集），在生成子集字体时强制改写家族名与 PostScript 名，避免继续使用 Noto、Source 等保留名称。"),
        ("p", "开发目的。本项目旨在实现一套与宿主站点解耦的阅读子系统，使“人眼可读、机器直接采集不可得”成为默认输出形态，具体目标包括："),
        ("bullet", "明文仅存在于阅读器服务端内存与受控稿件源；对外接口不返回汉字、字母、数字及标点的原始码位。"),
        ("bullet", "按章节用字动态生成映射表，将可见字符映射至以 U+E000 起始的 BMP 私有区，超出 BMP 容量时延续至补充私有区。"),
        ("bullet", "按映射结果裁剪母版字形并重写 cmap，输出 woff2；空白类字符按 JavaScript 正则 \\s 原样保留，以维持换行与段落结构。"),
        ("bullet", "阅读器页面通过 FontFace 加载专用字体后方可排版；字体失败时仅提示“内容无法显示”，禁止回退明文。"),
        ("bullet", "宿主站点仅引入一段嵌入脚本与占位节点，正文绘制发生在同源 iframe 内；跨窗口消息只传递高度，不传递正文。"),
        ("bullet", "正文接口的 CORS 仅允许阅读器前端源；博客源直接请求必须失败，避免宿主页面成为明文泄漏面。"),
        ("h2", "1.3 主要功能简介"),
        ("p", "本软件 V1.0 围绕上述目的，设计并实现下列相互衔接的功能："),
        ("bullet", "字符映射与子集字体生成：根据章节文本构建稳定的“原字符→PUA 码位”映射，调用 Python 侧 fontTools 完成子集化、cmap 替换、名称表改写与 woff2 封装。"),
        ("bullet", "阅读票签发与校验：以密码学安全的随机阅读票绑定章节标识、会话标识与字体资源标识，默认五分钟过期，过期即失效。"),
        ("bullet", "混淆正文与字体分发：持票方可获取 titleGlyphs、bodyGlyphs、fontFamily 与 fontUrl；字体文件以一次性资源标识提供，不把映射表下发给浏览器。"),
        ("bullet", "阅读器用户界面：提供字号调节、深浅背景切换；偏好仅存于 localStorage，不持久化章节文本。"),
        ("bullet", "宿主嵌入：embed.js 扫描 data-petrichor-reader 节点，创建 iframe 打开 /read；以 MutationObserver 兼容 Vue 等框架在挂载阶段插入节点的时序。"),
        ("bullet", "远程稿件适配：可按文章编号向既有文章服务拉取 HTML，剥离标签后转为纯文本再进入混淆流水线；本地亦支持样章夹具。"),
        ("bullet", "访问控制：基于源的 CORS 白名单、可选站点密钥、按客户端地址的滑动窗口限流。"),
        ("h1", "二、系统运行环境要求"),
        ("h2", "2.1 硬件环境"),
        ("p", "本软件以通用计算设备为运行载体，深度学习加速器并非必需。推荐配置如下："),
        ("bullet", "中央处理器：x86_64 或 ARM64 多核处理器，建议 2 核及以上。"),
        ("bullet", "内存：最低 2 GB，推荐 4 GB 及以上，以容纳 Node.js 进程、Python 子进程及章节字体缓存。"),
        ("bullet", "存储：系统盘预留不少于 2 GB；母版字体（Noto Sans SC Regular）单独占用约数十兆字节，生成的按章 woff2 随用字规模变化。"),
        ("bullet", "网络：阅读器前端与应用程序接口须能被访客浏览器访问；生产环境建议经反向代理提供统一源。"),
        ("h2", "2.2 软件环境"),
        ("bullet", "操作系统：Windows 10/11、主流 Linux 发行版或 macOS。"),
        ("bullet", "运行时：Node.js 18 及以上（ES 模块）；Python 3.10 及以上，依赖 fonttools 及 brotli（woff2 写出）。"),
        ("bullet", "浏览器：Google Chrome（推荐）、Microsoft Edge、Firefox、Safari；Internet Explorer 不作为目标平台。"),
        ("bullet", "反向代理（可选）：Nginx，用于将 /v1/ 转发至阅读器接口进程，将其余静态资源转发至阅读器前端进程。"),
        ("h2", "2.3 开发语言与工具"),
        ("bullet", "服务端与工具链：JavaScript（Node.js）、Python 3。"),
        ("bullet", "浏览器端：原生 JavaScript、HTML5、CSS3，不依赖前端框架。"),
        ("bullet", "字体处理：fontTools.ttLib、fontTools.subset，输出 flavor 为 woff2。"),
        ("bullet", "开发与版本管理：Visual Studio Code、Git。"),
        ("bullet", "宿主示例：独立静态页；生产宿主可为 Vue 2 站点，仅增加占位节点与脚本地址配置。"),
        ("h1", "三、系统功能模块详解"),
        ("h2", "3.1 系统功能结构"),
        ("p", "本软件在仓库内划分为三个可独立测试的包，并与宿主站点保持清晰边界："),
        ("pre", "宿主站点（如博客章节页）\n  仅：embed.js + [data-petrichor-reader][data-chapter-id]\n        │ iframe（同源阅读器前端）\n        ▼\n阅读器前端 packages/reader-web\n  /embed.js  /read  /read.js  /read.css\n        │ HTTP（CORS 仅允许本源）\n        ▼\n阅读器接口 packages/reader-api\n  换票 → 取混淆正文 → 取 woff2\n        │ 子进程\n        ▼\n字体工具 packages/font-tool\n  映射策略 + remap_subset.py\n        │\n        ▼\n稿件源：本地样章 或 远程 /article/byId"),
        ("p", "图 1 系统功能与部署结构示意图。建议申请人在本地同时启动接口进程与前端进程后，对独立阅读页、宿主嵌入页分别截图，作为操作说明附图。"),
        ("h2", "3.2 字符映射与子集字体模块"),
        ("p", "功能描述。该模块是防护能力的根基。它不试图在浏览器中隐藏字符串，而是改变“字符串所使用的 Unicode 标量值”，同时提供一张只在这些新标量值上画出正确字形的字体。于是：在安装了该字体的排版引擎中，读者看到正常汉字；在未加载该字体或仅提取码位的采集程序中，得到的是私有区字符，无法直接当正文使用。"),
        ("p", "处理流程如下。"),
        ("p", "第一步，策略判定。对输入文本逐一枚举用户可见字符。若字符匹配 JavaScript 的 Unicode 空白（含普通空格、制表符、CR/LF、不间断空格、表意空格等），则作为直通字符保留，不进入映射表。其余可见字符（汉字、拉丁字母、数字、中英文标点、符号）均分配私有区码位。"),
        ("p", "第二步，稳定编号。同一章节内，首次出现的需映射字符按出现顺序获得从 0 起的索引。索引 i 映射到码位：若 i 落在 BMP 私有区 [U+E000, U+F8FF]，则码位为 U+E000+i；超出后使用补充私有区 U+F0000 起的码位。该策略保证单章用字在 BMP 内通常足够，同时为极端长文预留扩展。"),
        ("p", "第三步，编码。编码函数按字符逐一输出：直通字符原样写出，其余字符替换为映射后的 PUA 字符。服务端在发出响应前检查编码结果中是否仍含 CJK 统一汉字区码位，若仍含汉字则视为流水线失败，避免“半混淆”泄漏。"),
        ("p", "第四步，子集与 cmap 重写。将“原码位→目标码位”列表连同母版路径、新家族名、PostScript 名及直通码位列表以 JSON 经标准输入交给 Python 脚本。脚本使用 TTFont 读取母版，收集所需原码位与豆腐字形（U+25A1），以 Subsetter 裁剪，再以 format 4 或 format 12 子表替换 cmap：直通码位仍指向空白等原字形，映射项将目标 PUA 码位指向原汉字字形；母版缺字则指向豆腐或 .notdef。名称表写入新的 family / full name / unique name，flavor 设为 woff2 后保存。"),
        ("p", "第五步，许可合规。生成字体家族名使用前缀 pr-sess-，PostScript 名使用 PrSess 前缀，禁止继续使用 Noto、Source 等 OFL 保留名。映射表仅保留在字体工具与服务端，不得打包进阅读器前端。"),
        ("p", "输入：章节标题与正文的 Unicode 文本、母版字体文件。输出：titleGlyphs、bodyGlyphs、fontFamily、woff2 二进制。"),
        ("h2", "3.3 阅读票、会话与字体句柄模块"),
        ("p", "功能描述。若混淆正文与字体 URL 可被任意第三方长期缓存或猜测，采集者仍可建立“票—正文—字体”的稳定流水线。因此本模块引入短时阅读票。"),
        ("p", "签发。客户端提交 chapterId 以及可选 siteKey。服务端解析章节（本地夹具或远程文章）。校验站点密钥（若提供则必须等于配置值）。使用 crypto.randomBytes 生成阅读票（base64url）与字体资源标识（hex），写入内存表，记录 chapterId、sessionId（UUID）与过期时间。默认生存时间为 300 秒。"),
        ("p", "消费。获取章节接口必须携带票（查询参数或请求头）。服务端读取票记录，过期或不存在则返回未授权。通过后执行混淆，并将 woff2 缓冲与同一过期时间写入字体表，响应中的 fontUrl 指向 /v1/fonts/{fontId}.woff2。"),
        ("p", "清理。每次签发或查询时修剪过期项。字体与票使用独立映射，避免票字符串直接等于字体文件名，降低日志侧信道风险。"),
        ("p", "输入：章节标识。输出：ticket、sessionId、expiresAt；后续持票获得混淆载荷与字体。"),
        ("h2", "3.4 阅读器接口模块"),
        ("p", "功能描述。该模块以 Node.js 原生 http 实现，不引入重量级框架，便于审计与裁剪。主要路径如下。"),
        ("bullet", "OPTIONS 预检：对白名单 Origin 返回允许的方法与头部。"),
        ("bullet", "GET /v1/reader/meta：返回票有效期、站点密钥名及本地样章目录（不含正文）。"),
        ("bullet", "POST /v1/reader/ticket：换票。"),
        ("bullet", "GET /v1/reader/chapter：持票取混淆正文与字体 URL。"),
        ("bullet", "GET /v1/fonts/:id.woff2：返回 font/woff2，缓存策略为 private、短 max-age。"),
        ("p", "源控制。若请求携带 Origin 且不在允许列表中，立即 403。允许列表默认仅含阅读器前端源。由此，博客前端源即使知道接口地址，浏览器亦不会把成功响应交给该源的脚本。"),
        ("p", "限流。按客户端地址（优先 X-Forwarded-For 首段）统计每分钟请求数，超过阈值返回 429，抑制暴力换票。"),
        ("p", "章节解析。优先读取 fixtures/chapters 索引；未命中且配置了 READER_ARTICLE_BY_ID_URL 时，以 application/x-www-form-urlencoded 向远程服务提交 id，解析返回 JSON 中的文章字段。将章节号与标题拼接为显示标题，将文首、正文、文尾 HTML 去标签后合并。HTML 实体（含数字与十六进制形式）还原为字符，连续空行压缩。解析结果按章缓存于内存，避免重复打远程。"),
        ("p", "失败语义。母版缺失、Python 子进程失败或编码后仍含汉字时，接口返回 503 且错误码表明字体不可用，前端不得展示任何疑似明文。"),
        ("h2", "3.5 阅读器页面模块"),
        ("p", "功能描述。/read 页面是唯一被允许持票拉正文的用户界面。页面启动后读取查询参数 chapterId，向接口换票，再持票取章。校验响应中必须同时存在 fontUrl、fontFamily 与 bodyGlyphs。随后使用 FontFace 以 display:block 加载 woff2，加入 document.fonts 成功后，将 titleGlyphs 与 bodyGlyphs 写入文本节点，并设置对应 font-family。任何一步失败均调用统一失败文案。"),
        ("p", "阅读体验。工具条提供字号增减（限制在 16 至 32 像素）与深浅主题。主题通过 data-theme 与 CSS 变量切换纸色与墨色。这些偏好写入 localStorage，键名与章节内容无关。"),
        ("p", "嵌入适配。若页面处于 iframe 中，为根元素增加 embedded 类以取消最小视口高度，避免把空白撑进宿主。通过 postMessage 向父窗口发送类型为 petrichor-reader:resize 的消息，载荷仅含数值高度。ResizeObserver 在排版变化时再次上报。父窗口脚本校验 event.origin 必须等于阅读器源，且仅当 event.source 对应当前 iframe 时才改高度。"),
        ("h2", "3.6 宿主嵌入模块"),
        ("p", "功能描述。embed.js 以立即执行函数封装，从 currentScript.src 推导阅读器源，从而在开发端口、反代域名与生产域名之间保持可移植。它查找带有 data-petrichor-reader 的元素，读取 data-chapter-id，创建或复用 iframe，将其 src 设为 /read?chapterId=。若脚本早于节点到达文档，则在 DOMContentLoaded 之后启动，并以 MutationObserver 观察子树与属性变化，覆盖单页应用路由切换章节的场景。对外暴露 petrichorReaderScan 供宿主在数据到达后主动扫描。"),
        ("p", "宿主约束。宿主不得再将文章 HTML 以 v-html 等方式写入页面。章节标题、作者、评论、点赞等元数据可继续明文，因为采集防护的对象是正文而非目录信息。"),
        ("h2", "3.7 运维与部署相关功能"),
        ("p", "开发期三个端口分工：接口 3980、阅读器前端 3981、宿主沿用自身端口。生产环境推荐 Nginx 将同一对外源的 /v1/ 与静态资源分别反代到本机回环地址上的两个进程，使浏览器侧阅读器页与接口同源，简化 CORS。环境变量包括监听地址、对外公共基址、允许的 Origin 列表、远程文章接口、站点密钥与票超时。母版字体因体积不纳入版本库，部署时需单独放置。"),
        ("h1", "四、技术架构与核心算法实现"),
        ("h2", "4.1 总体技术架构"),
        ("p", "本软件采用“工具链 / 接口层 / 表现层 / 宿主层”四段结构，强调权限递减：越靠近浏览器的组件越不允许接触明文与映射表。"),
        ("pre", "表现层  reader-web  无映射表、无明文、失败关闭\n接口层  reader-api  明文短暂存在于进程内，CORS 锁源\n工具链  font-tool   唯一允许可逆映射与字体改写\n数据层  样章文件或远程 CMS   明文的权威存储"),
        ("p", "图 2 分层技术架构。接口层使用内存 Map 保存票与字体，不引入 Redis，以降低 V1.0 的运维面；进程重启后未过期票失效，客户端可重新换票。"),
        ("h2", "4.2 核心算法一：面向阅读排版的私有区映射"),
        ("p", "算法思想。采集程序依赖的是码位同一性：若 DOM 中的字符与自然语言文本使用同一 Unicode 标量值，则 innerText 即原文。本算法切断这一同一性，但保留字体渲染所需的“码位→字形”关系。关键约束包括："),
        ("bullet", "布局稳定性：空白直通，避免把换行编码进 PUA 导致预格式文本折叠错误。"),
        ("bullet", "单章局部性：映射按章构建，降低跨章复用同一张表带来的对照攻击便利；V1.0 以章为粒度缓存生成结果。"),
        ("bullet", "缺字可见性：母版没有的字形在 PUA 槽位上画方框，避免静默丢字造成语义残缺却仍被误认为成功防护。"),
        ("bullet", "不可逆下发：解码函数仅供测试与服务端自检，阅读器前端仓库不得包含 inverse map。"),
        ("p", "形式化描述。设章节文本为字符序列 c1…cn。定义谓词 W(c) 表示 c 为空白。设 σ 为从非空白字符到自然数的单射，σ(c) 等于该字符在序列中首次出现的次序（自 0 计）。定义码位函数 π(k)：若 k < 6400（即 U+F8FF−U+E000+1），则 π(k)=0xE000+k，否则 π(k)=0xF0000+(k−6400)。编码函数 E(c)=c 若 W(c)，否则 E(c)=chr(π(σ(c)))。服务端断言 E 的输出不匹配汉字区正则后，方可外发。"),
        ("p", "与简单 Caesar 或固定偏移的区别在于：偏移量不是全局常数，而是由本章用字集合的出现顺序决定；且必须与 cmap 改写同时发布，否则浏览器只能显示 .notdef。采集者若要还原，需要下载 woff2 并解析 cmap 与 glyf/CFF，这已超出“直接取 DOM 文本”的威胁模型。本软件明确不声称防御 OCR、截图与专业字体逆向。"),
        ("h2", "4.3 核心算法二：cmap 重写与按需子集化"),
        ("p", "算法思想。若仅把字符换成 PUA 而不改字体，读者将看到方框。若下发完整母版并把整张 cmap 改到 PUA，体积不可接受且扩大字形对照面。因此必须：只保留本章用到的原字形；把这些字形挂到新的 PUA 码位上；空白码位保持可排版。"),
        ("p", "实现要点。"),
        ("p", "子集阶段。Options 关闭 hinting 与版式特性以减小体积，desubroutinize 以避免 CFF 子例程在改 cmap 后失效，丢弃 DSIG。populate(unicodes=needed) 中 needed 包含直通码位、全部源码位以及豆腐码位。"),
        ("p", "映射阶段。对每一对 (src, dst)，若 src 在子集后的 cmap 中，则 new_map[dst]=cmap[src]；若源字符在母版中本就不存在，则 new_map[dst]=tofu。直通码位从子集 cmap 复制。随后删除旧子表，按最大码位选择 BMP 的 format 4 或 SMP 的 format 12，分别写入 Microsoft 与 Unicode 平台，防止不同浏览器走不同子表而不一致。"),
        ("p", "命名阶段。name ID 1/16 为新家族名，ID 2/17 为 Regular，ID 4 为显示全名，ID 6 为 PostScript 名，ID 3 含 petrichor-reader 标记以便审计。写出 woff2 后由 Node 读入缓冲，绑定到票的 fontId。"),
        ("p", "进程边界。Node 不在进程内解析 OpenType，而是 spawn Python，JSON 任务走 stdin。可用 READER_PYTHON 指定解释器，适应 Windows 上 python 与 python3 并存的环境。"),
        ("h2", "4.4 核心协议：短时票与锁源拉取"),
        ("p", "协议思想。防护不仅是编码问题，也是“谁被允许触发编码”的问题。若博客页能直接请求章节接口，则浏览器网络面板仍可能出现明文，或宿主脚本被注入后成为泄漏点。因此正文 CORS 白名单不含博客源；博客只负责嵌入 iframe。iframe 与接口在生产环境应处于同一对外源或明确列入白名单的阅读器源。"),
        ("p", "时序。嵌入脚本设置 iframe.src → 阅读页 fetch POST /v1/reader/ticket → 201/200 返回票 → fetch GET /v1/reader/chapter?ticket= → JSON（PUA 字符串+字体 URL）→ FontFace.load → 文本节点赋值 → postMessage 高度。票在 TTL 内可读取一次或多次，过期后必须重换；字体 URL 同步过期，阻止长期热链。"),
        ("p", "站点密钥。请求体可带 siteKey。V1.0 默认 pk_dev，便于开源演示；生产可替换。密钥错误则拒绝换票，避免无关站点消耗生成字体的 CPU。"),
        ("h2", "4.5 远程 HTML 纯化"),
        ("p", "既有内容管理系统往往以 HTML 存储章节。阅读器需要的是可映射的纯文本。纯化规则为：将 br、块级结束标签转为换行；删除其余标签；解析命名实体与数字实体；压缩过多空行。标题由章节号字段与标题字段连接。该步骤保证映射算法看到的是读者意义上的正文，而不是标签字符。宿主在取得文章元数据后应清空本地正文字段，避免 Vue 把原文重新插回模板。"),
        ("h1", "五、操作使用说明"),
        ("h2", "5.1 启动阅读器服务"),
        ("p", "在安装 Node.js 与 Python 依赖（pip install -r packages/font-tool/requirements.txt）并放置母版字体后，于项目根目录分别启动："),
        ("pre", "node packages/reader-api/src/index.js\nnode packages/reader-web/src/index.js"),
        ("p", "默认接口监听 http://127.0.0.1:3980，阅读页为 http://127.0.0.1:3981/read?chapterId=sample。请使用浏览器打开，勿以 file 协议打开宿主示例。"),
        ("p", "图 3 独立阅读页运行效果（请申请人自行截取：可见完整样章正文、顶部字号与主题按钮）。"),
        ("h2", "5.2 阅读与显示偏好"),
        ("p", "打开阅读页后，系统自动换票并加载本章字体。点击 A- / A+ 调节字号，点击主题按钮在浅色纸色背景与深色背景之间切换。刷新页面后偏好仍在，正文需重新换票加载。"),
        ("p", "图 4 深色主题下的阅读界面（请截取）。"),
        ("h2", "5.3 验证防护是否生效"),
        ("p", "在阅读页打开开发者工具 Elements 面板，检查标题与正文文本节点：应看到私有区字符而非原文。Network 中章节 JSON 不应出现可读汉字正文。禁用该自定义字体后，页面应变为方框或乱码，且不得自动改回明文。"),
        ("p", "图 5 开发者工具中正文为 PUA 码位的截图（请截取，可对样章原文打码）。"),
        ("h2", "5.4 嵌入宿主站点"),
        ("p", "最小接入为在宿主页面引入阅读器源上的 embed.js，并放置："),
        ("pre", '<script src="https://阅读器域名/embed.js" async></script>\n<div data-petrichor-reader data-chapter-id="章节ID"></div>'),
        ("p", "Vue 宿主可在章节组件挂载时动态插入脚本，并在拿到文章标识后保留占位节点。本地可用 examples/serve.mjs 在独立端口模拟外站，确认宿主查看源代码与 document.body.innerText 均无章节原句。"),
        ("p", "图 6 博客章节页嵌入阅读器后的整体版面（请截取：标题、作者、iframe 正文、评论区）。"),
        ("h2", "5.5 生产反代要点"),
        ("p", "将阅读器公共基址配置为访客可访问的 URL。若站点全站 HTTPS，阅读器必须 HTTPS，否则混合内容会被浏览器拦截。接口进程可仅监听 127.0.0.1，由 Nginx 对外。远程文章接口应指向内容服务的 byId 类接口。"),
        ("h1", "六、软件独创性、特点与总结"),
        ("h2", "6.1 技术创新点"),
        ("p", "面向 DOM 采集威胁模型的“编码与字体共生”方案。本软件不把机密放在浏览器脚本里，而是让浏览器成为“只认字形、不认码位”的排版终端。PUA 映射与 cmap 重写必须同时交付，缺一不可，这一共生关系构成本软件在阅读场景下的核心方法创新。"),
        ("p", "按章子集与许可约束下的字体工程。系统在 SIL OFL 框架内完成改名、再分发与子集化，把开源母版转化为会话级阅读字体，既满足中文覆盖，又控制下发体积，并避免保留名违规。缺字豆腐策略使防护失败可见，而不是静默丢字。"),
        ("p", "锁源、短时票与 iframe 隔离的系统化组合。即便编码正确，若宿主页能直接取接口或把明文写进自身 DOM，防护仍会崩溃。本软件以 CORS 白名单、票绑定字体句柄、嵌入层只传高度、失败关闭四条规则把接口权限和 DOM 权限同时收紧，属于针对 Web 平台特性的工程创新而非单一算法堆砌。"),
        ("p", "与内容站点解耦的嵌入协议。防护实现独立成仓，宿主仅增加标记属性。这一边界使阅读器可开源、可单独部署、可替换宿主，而不把混淆逻辑焊接进博客业务代码。"),
        ("h2", "6.2 软件特点"),
        ("bullet", "防护目标清晰：阻止通过 HTML、innerText 与章节 JSON 直接获得可读正文；不夸大宣传为防截图或防 OCR。"),
        ("bullet", "失败安全：字体或接口异常时不回退明文，避免“偶尔泄漏一次即前功尽弃”。"),
        ("bullet", "部署灵活：开发三端口、生产可反代为单源；可接本地样章或远程 CMS。"),
        ("bullet", "实现可审计：核心路径为少量 JavaScript 与一份 Python 脚本，无闭源二进制字体引擎。"),
        ("bullet", "阅读体验完整：字号、主题、iframe 自适应高度，目录与评论仍由宿主负责。"),
        ("h2", "6.3 总结"),
        ("p", "综上所述，“基于动态子集字体与Unicode私有区码位映射的网页小说防采集阅读系统”是作者独立设计、自主开发的原创性软件成果。它针对公开网页长文易被自动化采集的问题，将字符编码、OpenType 子集化、短时访问凭证与浏览器源隔离组合成可部署的阅读子系统，并提供标准嵌入方式接入既有站点。"),
        ("p", "本软件在私有区映射策略、cmap 级字形挂接、锁源票证协议以及宿主—阅读器解耦等方面具有可说明的独创性，功能闭环完整，适合作为计算机软件著作权登记的技术说明依据。V1.0 以工程可用为目标，明确威胁模型边界，便于后续在不改变核心方法的前提下扩展缓存、观测与多站点配置。"),
        ("p", "（以下为鉴别材料排版用补充说明，便于文档页数满足登记对连续页的一般交存习惯。）"),
        ("p", "补充说明甲：接口错误码一览。origin_not_allowed 表示请求源不在白名单；invalid_json 表示换票体无法解析；invalid_site_key 表示站点密钥不匹配；chapter_not_found 表示本地与远程均无法解析章节；invalid_ticket 表示票缺失或过期；font_unavailable 表示母版或生成失败；rate_limited 表示触发每分钟上限；font_not_found 表示字体句柄不存在或已过期；not_found 与 internal 分别为路径不存在与未捕获异常。全部 JSON 响应带 Cache-Control: no-store，避免中间缓存保存票或 PUA 正文。"),
        ("p", "补充说明乙：阅读器静态服务安全。前端进程将 URL 路径限制在 public 目录内，拒绝 .. 逃逸；仅允许 GET 与 HEAD；HTML 在发出前替换 __API_BASE__ 占位为当前配置的接口公共基址，从而避免在源码中写死内网地址。MIME 仅开放 html、js、css。"),
        ("p", "补充说明丙：夹具与预览。font-tool 命令行可对样章生成 preview.html，人眼应能阅读，查看源代码应为 PUA，禁用自定义字体后应变乱码。该预览用于阶段验收，不作为生产下发物。map.json 仅工具内部可逆，禁止复制到 reader-web。"),
        ("p", "补充说明丁：宿主文章页协作要点。文章详情在拉取 byId 之后应将 articleHead、articleContent、articleTail 置空后再赋给视图模型，防止模板或调试面板输出原文。阅读次数、点赞、评论继续走原有业务接口，与混淆流水线正交。"),
        ("p", "补充说明戊：性能与缓存。同一 chapterId 在进程内缓存生成后的字体缓冲与编码字符串，避免每票都跑 Python。远程文章对象亦按 id 缓存。V1.0 不在多进程间共享该缓存；水平扩展时各进程可重复生成，结果码位顺序因输入文本相同而稳定。"),
        ("p", "补充说明己：直通码位列表与 JSON 任务字段。Node 侧传递 passthrough 至少包含 9、10、13、32、160、0x3000，Python 侧仍会把 0x20 加入集合。mappings 为 {from,to} 整数码位对。outputPath 为章级 woff2 路径。fontFamily 与 psName 必须已去保留名。"),
        ("p", "补充说明庚：测试策略。映射测试断言空白不被编码、汉字进入 PUA、解码仅测试可见。接口测试覆盖错误源、缺票、换票成功后正文无汉字。页面测试覆盖静态服务与占位替换。远程纯化测试覆盖标签、实体与空正文拒绝。"),
        ("p", "补充说明辛：明确非目标。本软件不提供付费墙、用户登录门禁、多租户后台、Redis 会话、禁止复制、前端 AES、验证码或 WAF。将这些需求混入 V1.0 会模糊著作权说明书所描述的作品边界。"),
        ("p", "补充说明壬：术语表。PUA 指 Unicode 私有使用区；cmap 指 OpenType 字符到字形索引表；woff2 指 Web Open Font Format 2；ticket 指短时阅读凭证；siteKey 指可选的站点字符串密钥；embed 指宿主页嵌入脚本；夹具指 fixtures 下的样章。"),
        ("p", "补充说明癸：版本记录。V1.0 实现完整阅读闭环与宿主嵌入，完成远程文章接入与生产反代说明。后续版本若增加功能，应另行办理变更或补充登记，并保持页眉中的软件名称与版本号与申请表一致。"),
    ]


def write_spec(path: Path):
    doc = Document()
    setup_page(doc, top=2.54, bottom=2.54, left=2.54, right=2.54)
    for kind, text in spec_paragraphs():
        if kind == "title":
            add_title(doc, text)
            sub = doc.add_paragraph()
            sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_paragraph_format(sub, after=12, line=22)
            r = sub.add_run(f"{SOFTWARE}\n版本号：{VERSION}")
            set_run_font(r, east="黑体", size=12, bold=True)
        elif kind == "h1":
            add_heading_cn(doc, text, 1)
        elif kind == "h2":
            add_heading_cn(doc, text, 2)
        elif kind == "bullet":
            add_bullet(doc, text)
        elif kind == "pre":
            add_pre(doc, text)
        else:
            add_body(doc, text)
    doc.save(path)


def collect_source_lines():
    lines = []
    for rel in SOURCE_FILES:
        fp = ROOT / rel
        if not fp.exists():
            continue
        text = fp.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")
        lines.append(f"// ===== FILE: {rel} =====")
        for raw in text.split("\n"):
            s = raw.replace("\t", "    ")
            while True:
                lines.append(s[:100])
                s = s[100:]
                if not s:
                    break
        lines.append("")
    return lines


def write_source(path: Path):
    all_lines = collect_source_lines()
    per = 50
    total = len(all_lines)
    pages_all = (total + per - 1) // per
    if pages_all <= 60:
        selected = all_lines
        note = f"程序鉴别材料（全文，共 {total} 行，约 {pages_all} 页）"
    else:
        head = all_lines[: per * 30]
        tail = all_lines[-per * 30 :]
        selected = head + ["", "// ===== 以下为源程序连续后 30 页 =====", ""] + tail
        note = f"程序鉴别材料（一般交存：前 30 页 + 后 30 页；全文约 {pages_all} 页 / {total} 行）"

    doc = Document()
    section = setup_page(doc, top=2.0, bottom=2.0, left=2.0, right=2.0)
    for p in section.header.paragraphs:
        p.clear()
    run = section.header.paragraphs[0].add_run(HEADER + "  源程序")
    set_run_font(run, size=9)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_format(title, after=8, line=20)
    r = title.add_run(note)
    set_run_font(r, east="黑体", size=12, bold=True)

    warn = doc.add_paragraph()
    set_paragraph_format(warn, after=8, line=18)
    wr = warn.add_run("排版说明：每页不少于 50 行；页眉软件名称与版本号与申请表保持一致；有无字母 V 以申请表为准。打印或另存 PDF 时请保持纵向 A4、不要缩放。")
    set_run_font(wr, size=10)

    for i, line in enumerate(selected, 1):
        p = doc.add_paragraph()
        set_paragraph_format(p, before=0, after=0, line=13.2, first_line=0)
        prefix = f"{i:04d}| "
        run = p.add_run(prefix + (line if line else " "))
        set_run_font(run, east="宋体", ascii_font="Consolas", size=8)
        if i % per == 0 and i < len(selected):
            runb = p.add_run()
            brk = OxmlElement("w:br")
            brk.set(qn("w:type"), "page")
            runb._element.append(brk)

    doc.save(path)
    return total, pages_all


def write_checklist(path: Path, src_lines: int, src_pages: int):
    text = f"""软件著作权登记材料清单（对照中国版权保护中心「所需文件」）

软件全称：{SOFTWARE}
版本号：{VERSION}
简称：Petrichor Reader

【官方要求摘要】
申请文件应包括：软件著作权登记申请表、软件的鉴别材料、相关证明文件。纵向排版，文字从左向右。
页眉软件版本号须与申请表一致（有无字母 V 以申请表为准）。

一、本文件夹已生成（可直接改排版后转 PDF 上传）
1. 软件说明书.docx  —— 作为“文档鉴别材料”（设计说明书）。若不足 60 页，按官方规定提交全文。
2. 源程序鉴别材料.docx  —— 源程序按每页 50 行排版。当前统计约 {src_lines} 行、约 {src_pages} 页。
   不足 60 页则提交全文；达到或超过 60 页则脚本已按“前 30 页 + 后 30 页”处理。

二、须在登记系统在线完成（本仓库无法代填）
1. 计算机软件著作权登记申请表（R11）
   在线填报后，在线打印「申请确认签章页」，不得改内容/格式/打印比例，签章后上传 PDF 扫描件。
2. 身份证明
   个人：身份证正反面清晰扫描件（PDF）。
   企业：加载统一社会信用代码的营业执照副本扫描件。
   分公司等非法人：另需上级法人书面授权（官网有模板）。

三、一般独立开发、原始取得时不必提交
委托/合作/下达任务合同、原权利人许可、转让合同、继承证明等。
若实际为职务作品且著作权归单位，请按申请须知第 8 条由单位作为著作权人。

四、申请表填写建议（请按实际情况修改）
软件全称：{SOFTWARE}
软件简称：Petrichor Reader
版本号：V1.0
软件分类：应用软件 → 网络应用软件（或信息安全相关应用，以系统下拉为准）
开发完成日期：【请填写实际完成日，例如 2026-09-06】
发表状态：未发表（若已公开网站则选已发表并填首次发表日）
开发方式：独立开发
权利取得方式：原始取得
原始取得方式：独立开发
软件作品说明：原创
编程语言：JavaScript、Python、HTML、CSS
源程序量：约 {src_lines} 行（以鉴别材料为准）
开发目的：用于在网页环境中展示小说等长文，通过动态子集字体与私有区码位映射降低正文被直接采集的风险，并与宿主站点解耦部署。
主要功能和技术特点：见说明书第一、三、四、六章。
运行支撑环境 / 开发环境：见说明书第二章。

五、需要您自行截图后插入说明书第五章（或作为附件页）
请使用真实运行界面，不要用示意图代替。建议分辨率足够、无个人隐私。
1. 独立阅读页：浏览器打开 http://127.0.0.1:3981/read?chapterId=sample（或线上等价地址），正文可读。
2. 同一页面切换深色主题后的效果。
3. 开发者工具 Elements：选中正文节点，可见 PUA 乱码而非汉字原文。
4. Network 中 /v1/reader/chapter 响应预览：无可读汉字正文。
5. 宿主博客章节页整体：标题/作者/阅读器区域/评论，且宿主 DOM 无 v-html 正文。
6. （可选）禁用自定义字体后出现方框或“内容无法显示”，证明未回退明文。

截图插入后，请把 Word 另存或打印为 PDF 再上传。源程序 Word 同样转为 PDF。
上传格式要求为 pdf；照片须清晰、平铺、无反光、无遮挡。

六、办理路径提醒
登录中国版权保护中心著作权登记系统全程在线办理。
补正通知在用户中心站内信，须 30 日内补正。
"""
    path.write_text(text, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    spec_path = OUT / "软件说明书.docx"
    src_path = OUT / "源程序鉴别材料.docx"
    list_path = OUT / "材料清单与填表参考.txt"
    write_spec(spec_path)
    n, pages = write_source(src_path)
    write_checklist(list_path, n, pages)
    print("wrote", spec_path)
    print("wrote", src_path, "lines", n, "pages", pages)
    print("wrote", list_path)


if __name__ == "__main__":
    main()
