# petrichor-reader

开源小说阅读器：正文只在服务端保存明文，接口与 DOM 中为 PUA 码位 + 配套子集 woff2，用 iframe 嵌入宿主站点。

本仓库与博客前端 **完全独立**。宿主（例如 `petrichor_foreground`）只引入 `embed.js` 和一个占位节点，不复制混淆实现。

## 目标与非目标

- **做：** 挡住通过 HTML、`innerText`、章节 JSON 直接取可读正文。
- **不做：** OCR、截图、人眼抄录、解析字体还原映射、禁复制、前端 AES、付费墙、多租户后台。

母版字体使用 [Noto Sans SC](https://github.com/notofonts/noto-cjk)（SIL OFL 1.1）。生成字体必须改名（如 `pr-sess-*`），不得继续使用 Noto / Source 等保留名。

## 本地端口（开发）

| 进程 | 端口 | 作用 |
|---|---|---|
| 阅读器 API | `3980` | 阅读票、混淆正文、字体文件 |
| 阅读器前端 | `3981` | `/read` 页面与 `embed.js` |
| 宿主博客 | 沿用其自己的端口 | 只嵌入，不实现混淆 |

阶段 1–4 不需要启动博客。阶段 5 再嵌入 `petrichor_foreground`。

## 目录

```
packages/font-tool/     字符映射与子集 woff2（阶段 1）
packages/reader-api/    阅读器 HTTP API（阶段 2）
packages/reader-web/    阅读器页与 embed.js（阶段 3–4）
fonts/master/           母版字体（阶段 1 下载，大文件不进 git）
fixtures/chapters/      开发用样章
examples/               独立宿主示例（阶段 4）
```

## 嵌入（阶段 4 实现后可用）

```html
<script src="http://localhost:3981/embed.js" async></script>
<div data-petrichor-reader data-chapter-id="章节ID"></div>
```

阶段 1 已可在本仓库内演示防爬字体（不必启动博客）：

```bash
pip install -r packages/font-tool/requirements.txt
node packages/font-tool/scripts/download-master-font.mjs   # 若 fonts/master 里还没有 Regular
node packages/font-tool/src/cli.js
```

然后用浏览器打开 `fixtures/preview.html`。人眼应能读样章；查看源代码应是 PUA 码位；禁用 `pr-sess-preview` 字体后应变乱码。映射表在 `packages/font-tool/output/map.json`，只给工具内部可逆，不要放进阅读器前端。

空白（JS `\s`）原样保留；汉字、字母、数字、标点映射到 U+E000 起的 PUA；母版缺字用方框。生成字体家族名使用 `pr-sess-*`，不得再用 Noto / Source。

## 阅读器 API（阶段 2）

```bash
node packages/reader-api/src/index.js
```

监听 `http://127.0.0.1:3980`。明文只存在于服务端的 `fixtures/chapters/`。CORS 只允许阅读器页 `http://localhost:3981`（以及 `127.0.0.1:3981`）；从博客 origin 直接打接口会失败。开发用 `siteKey` 为 `pk_dev`（可省略）。ticket 5 分钟过期。

```bash
# 换票（curl 无 Origin 可用于自检；不要期望响应里出现章节汉字）
curl -s http://127.0.0.1:3980/v1/reader/ticket -H "Content-Type: application/json" -d "{\"chapterId\":\"sample\"}"

# 带票取正文（应只有 PUA / URL / font-family）
curl -s "http://127.0.0.1:3980/v1/reader/chapter?ticket=TICKET"

# 错误 Origin 应失败
curl -s http://127.0.0.1:3980/v1/reader/ticket -H "Origin: http://localhost:8080" -H "Content-Type: application/json" -d "{\"chapterId\":\"sample\"}"
```

## 许可

- 本仓库代码：MIT（见 `LICENSE`）
- 母版与生成字体：SIL OFL 1.1（阶段 1 放入 `fonts/OFL.txt`）
