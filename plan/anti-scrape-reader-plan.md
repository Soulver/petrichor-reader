# 小说阅读器防爬计划（开源独立项目）

本文是后续实施的唯一对照文档。每次开工先读本文件，按阶段顺序做，不要跳过未完成阶段的验收。

**当前约束（2026-09-05 已拍板，不要再按旧版「多租户收费」理解）：**

- 整套代码计划 **完全免费开源**
- **不考虑收费章节 / VIP / 登录才能读**
- 现阶段只要 **接到自己的 `petrichor_foreground` 能用**
- 阅读器必须是 **电脑上的独立项目**，博客仓库只做嵌入，不把混淆逻辑焊进去
- 母版字体用 **网上免费、允许修改再分发** 的开源字体（见第 3 节），不需你购买授权

---

## 0. 目标与非目标

**目标：** 阻止爬虫通过 HTML、DOM `innerText`、章节 JSON 直接拿到可读正文。代码独立成仓，用尽量少的改动嵌进本站。

**非目标：** 不防 OCR、截图、人眼抄、解析 woff2 还原映射。不做禁右键/禁复制。不做前端 AES。不做多站点后台、siteSecret、付费墙。

**手段：** 明文只在阅读器服务端。对外 = PUA 码位 + 配套子集 woff2。本站用 iframe 嵌入，宿主 DOM 无正文。

## 0.1 角色标记

| 标记 | 含义 |
|---|---|
| `[AI]` | 有磁盘权限即可写代码、下开源字体、起本地服务 |
| `[人]` | 必须你确认、打开浏览器看、或提供现有文章库 |
| `[混]` | AI 做好后你看一眼或选路径 |

---

## 1. 已冻结架构

独立项目（建议目录，可改）：

`D:\Program Files\Projects\petrichor-reader`

本站 `petrichor_foreground` **只引用** 它，不复制混淆实现。

```
petrichor_foreground（宿主）
  article_detail 里一个 div + embed.js
        │
        ▼
petrichor-reader
  embed.js  →  iframe → 阅读器页面（同项目静态资源）
                        → 阅读器 API（同项目后端）
                        → 按章生成的 woff2
                        → 章节明文（先用文件/sqlite，再接你的库）
```

开发期三个本地端口（实施时可微调，写进独立项目 README）：

| 进程 | 建议端口 | 作用 |
|---|---|---|
| 阅读器 API | `3980` | ticket、混淆正文、字体 |
| 阅读器前端 | `3981` | `/read` 与 `embed.js` |
| 现有博客 | 原 `vue-cli` 端口 | 只当宿主 |

**读一章：**

1. 博客页加载 `http://localhost:3981/embed.js`，创建 iframe → `http://localhost:3981/read?chapterId=`
2. iframe 向 `3980` 换短时票（绑定章节 + 会话，**不需要登录、不要 siteKey 也可先做**；若做 siteKey 则写死一个 `pk_dev` 方便以后开源给别人用）
3. 带票取正文：明文→PUA，按本章用字生成 woff2
4. 返回 `bodyGlyphs`（及可选 `titleGlyphs`）、`fontUrl`、`fontFamily`
5. 字体失败则「内容无法显示」，**禁止回退明文**
6. `postMessage` 只传高度，不传正文

**接口原则：**

- 正文 CORS **只允许** 阅读器页 origin（`http://localhost:3981`），博客 origin 直接打 API 必须失败
- 目录标题、书名、简介、评论：**继续明文**（本站现有页）
- 生成字体的 `font-family` **不得** 再用「Source」「Noto Sans」等 OFL 保留名，用 `pr-sess-xxxx`

## 1.1 已拍板默认值（可直接编码）

| 项 | 值 |
|---|---|
| 许可（代码） | MIT（独立项目 `LICENSE`） |
| 许可（母版字体） | SIL OFL 1.1，生成字体须改名 |
| 收费/登录墙 | 无 |
| 多站点管理后台 | 不做；最多一个开发用 `pk_dev` |
| 目录标题 | 明文 |
| ticket TTL | 5 分钟 |
| 缺字 | 方框 |
| 生产独立域名 | 现阶段不做；本机 localhost 即可 |
| Redis | 不做；内存 Map |

---

## 2. 独立项目目录（全部在新仓库，不在博客里摊开）

```
petrichor-reader/
  LICENSE                 MIT
  README.md               含嵌入本站步骤
  packages/font-tool/     映射 + 子集 woff2
  packages/reader-api/    Node API
  packages/reader-web/    阅读器页 + embed.js
  fonts/master/           母版字体（gitignore 大文件也可；脚本可下载）
  fonts/OFL.txt           母版许可证副本
  fixtures/chapters/      开发用明文样章
```

博客仓库只允许改：`article_detail`（或实际展示正文的页）、必要时 `public/index.html` 或组件里引入 embed。

---

## 3. 母版中文字体（免费，已选定推荐）

防爬必须 **改 cmap / 放到 PUA / 再分发 woff2**，所以只能选 **允许修改、允许再分发** 的开源字体。下面都是 **SIL Open Font License 1.1**，可免费用于开源项目。

### 3.1 推荐采用（阶段 1 默认）

**Noto Sans SC（思源黑体简体区域子集，Google / Adobe）**

- 和思源黑体是同一套泛 CJK 开源黑体
- 简体子集，比完整思源/Noto CJK 小，适合当母版
- 许可：[OFL](https://scripts.sil.org/OFL)
- 官方包：  
  [Noto Sans SC 区域子集 ZIP（Sans 2.004）](https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/18_NotoSansSC.zip)  
  仓库说明：<https://github.com/notofonts/noto-cjk>
- 实施时用包内 **Regular** 静态 OTF/TTF（不要一上来用可变字体，Windows 上 CFF2 可变字体有坑）

OFL 限制（必须遵守）：修改后的字体 **不能继续叫** Noto / Source 等保留名；我们输出 `pr-sess-*` 即可。保留 `OFL.txt` 和版权声明。

### 3.2 备选（不必下载，除非推荐包不好用）

| 字体 | 许可 | 说明 |
|---|---|---|
| [思源黑体 Source Han Sans](https://github.com/adobe-fonts/source-han-sans) | OFL | 与 Noto CJK 同源；完整包更大。简体 Regular 即可 |
| [霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenKai) | OFL | 更像书刊，适合小说阅读观感 |
| [思源宋体 Source Han Serif](https://github.com/adobe-fonts/source-han-serif) | OFL | 宋体阅读 |

**不要用：** 微软雅黑、华文黑体、方正/汉仪未授权包、网上下载的「免费商用」但禁止改字库的字体。改 PUA 会直接踩授权。

### 3.3 字体相关任务

- `[AI]` 阶段 1 用脚本从 GitHub Release 拉取 `18_NotoSansSC.zip`，解出 Regular，放到 `fonts/master/`，并复制 OFL
- `[人]` 不需要买字体；若公司网络拦 GitHub，把 ZIP 放到 `fonts/master/` 并告诉 AI
- `[AI]` 生成 woff2 时写入新 font-family，附 `OFL.txt`

---

## 4. 阶段 0 — 开独立项目壳

**目标：** 新目录存在，博客仓库仍只当宿主说明。

### 任务

1. `[混]` 确认新项目路径：默认 `D:\Program Files\Projects\petrichor-reader`（你若要改路径，开工前说一声）
2. `[AI]` `git init`、MIT `LICENSE`、README（含目标、非目标、本地端口、嵌入预告）
3. `[AI]` 按第 2 节建空包目录与 `.gitignore`（`node_modules`、生成的 woff2、可选忽略巨大母版 zip）
4. `[人]` 无需买域名、无需云账号

### 完成标准

- 独立仓库能单独打开，不依赖先改博客才能运行阶段 1–3

---

## 5. 阶段 1 — 字体流水线

**目标：** 样章文本 → `map.json` + `subset.woff2` → preview.html 人眼可读、源码无原文。

### 任务

1. `[AI]` 下载并安置 Noto Sans SC Regular（第 3.1 节）
2. `[AI]` `packages/font-tool`：输入文本 → 真字映射到 U+E000 起 → 子集 woff2；空白/标点策略固定
3. `[AI]` `fixtures/preview.html`
4. `[AI]` 测试：输出不含原句；映射在工具内部可逆（可逆逻辑 **不进** 阅读器前端包）
5. `[混]` 你打开 preview.html 看是否正常；禁用字体后应乱码

### 完成标准

- 不启动博客也能演示防爬字体

**禁止：** 改 `article_detail`、做登录。

---

## 6. 阶段 2 — 阅读器 API（本机）

### 任务

1. `[AI]` Node 服务 `packages/reader-api`，端口 3980
2. `[AI]` 开发数据：`fixtures/chapters/` 或 sqlite，先 **不要** 接博客后端
3. `[AI]` `POST /v1/reader/ticket`、`GET /v1/reader/chapter`、`GET /v1/fonts/:id.woff2`、`GET /v1/reader/meta`
4. `[AI]` 响应无章节汉字；CORS 仅 3981
5. `[AI]` 按 IP 限流（本地可放宽）
6. `[人]` 本阶段不提供生产库

### 完成标准

- curl 无明文；错误票/错误 Origin 失败

---

## 7. 阶段 3 — 阅读器页

### 任务

1. `[AI]` `packages/reader-web`，端口 3981，`/read`
2. `[AI]` 拉票、挂 `@font-face`、渲染 PUA、字号与深浅背景
3. `[AI]` 字体失败不回退明文；明文不进 storage/日志
4. `[混]` 你浏览器读 fixture 一章

### 完成标准

- Elements 里是 PUA + 自定义 font-family

---

## 8. 阶段 4 — embed.js（为独立项目准备，本站也能用）

即使暂时只有你一个宿主，也要把嵌入做进独立项目，开源时别人才能用。

### 任务

1. `[AI]` `embed.js`：扫描 `[data-petrichor-reader]`，iframe 打开 `/read?chapterId=`
2. `[AI]` 高度 `postMessage`
3. `[AI]` 独立项目内放 `examples/host.html`（另一端口或 file 说明用 localhost 宿主）模拟外站
4. `[AI]` README「如何嵌入」一节写清（见第 10 节，随代码更新 URL）
5. `[混]` 你打开 examples 与阅读器，确认宿主 innerText 无正文

**本阶段仍不改博客**，避免和独立项目进度缠在一起。

---

## 9. 阶段 5 — 嵌入 `petrichor_foreground`

**目标：** 你自己的书海/文章正文走阅读器；评论、写书、列表不动。

### 任务

1. `[AI]` 在 `article_detail`（当前章节正文页）去掉正文 `v-html` 全文，改为：

```html
<script src="http://localhost:3981/embed.js"></script>
<div data-petrichor-reader :data-chapter-id="articleId"></div>
```

   以当时真实组件字段名为准（`articleId` / 路由 query 等）。

2. `[AI]` 开发环境把 `3981` 写成可配置（`.env` 如 `VUE_APP_READER_EMBED`），生产以后再换域名
3. `[混]` **真实文章：** 若要读库里的小说而不是 fixture，你需要提供现有文章接口或表结构，AI 才能让 `reader-api` 按同一 `articleId` 取明文。未提供前：阅读器只显示 fixture，或 API 做「开发代理」——你确认可以后再接
4. `[AI]` 目录、评论、编辑入口保持现有行为
5. `[混]` 你走：书列表 → 详情 → 章节 → 看评论

### 完成标准

- 本机博客里能读一章（fixture 或真文）
- 博客「查看源代码」无正文
- 独立项目仍可单独 git 发布

---

## 10. 嵌入说明书（给本站 / 将来开源用户）

独立项目 README 必须包含下列用法（阶段 4 由 AI 写入，阶段 5 按本站改一处即可）。

**最小接入：**

```html
<script src="http://localhost:3981/embed.js" async></script>
<div data-petrichor-reader data-chapter-id="章节ID"></div>
```

**本站 Vue 2：** 在章节页 `mounted` 前保证 DOM 有该节点；若 `embed.js` 先于节点加载，脚本需支持扫描或 `MutationObserver`（阶段 4 做成可重复扫描，避免时序坑）。

**注意：**

- 宿主不要自己请求章节明文接口再塞进页面
- 本地请同时启动 `reader-api` 与 `reader-web`
- 以后若博客和阅读器不同源，浏览器才真正隔离；开发期 3981 vs 博客端口 **已经是不同源**，这是期望行为

---

## 11. 阶段 6 — 开源打磨（可后置）

1. `[AI]` README：架构、OFL 说明、保留字体名、如何换母版字体
2. `[AI]` 一键 `yarn`/`npm` 脚本：装依赖、拉字体、起 3980+3981
3. `[人]` 你决定何时把 `petrichor-reader` 推到 GitHub（AI 不默认 push）
4. `[人]` 若以后要公网：你自己配域名和 HTTPS；本计划不阻塞本地完成

---

## 12. 验收清单

1. curl 章节 API 无章节汉字
2. 宿主查看源代码无正文
3. 宿主 `document.body.innerText` 无正文
4. iframe 内为 PUA + 自定义 font-family
5. 屏蔽 woff2 后不是真文
6. 伪造/过期 ticket、从博客 origin 调 API 失败
7. `[人]` 抽一章阅读观感可接受

---

## 13. 明确不做

- Canvas 绘字、禁复制、前端加密包一层
- VIP、登录墙、站点申请后台、Redis、生产 DNS
- 把阅读器做成 npm 组件注入宿主 DOM（破坏隔离）
- 使用未授权商业字体

---

## 14. 后续怎么下任务

```
按 docs/anti-scrape-reader-plan.md 做阶段 X 的 [AI] 任务。
新项目路径用默认 petrichor-reader。不要改下一阶段。不要改博客直到阶段 5。
```

**当前进度：**

- **进行中：** 无（下一阶段为 3）
- **已完成：** 阶段 0；阶段 1；阶段 2（reader-api 端口 3980，fixture 章节，CORS 仅 3981）
- **已作废：** 旧版里的收费、多租户 siteSecret、生产子域前置、你必须自备授权字体

---

## 15. 还需要你人力配合的（已缩短）

AI **不能替你完成** 或 **完成了也不算数** 的只剩这些：

1. **点头路径：** 同意新项目建在 `D:\Program Files\Projects\petrichor-reader`（或给另一个空目录）。
2. **浏览器看一眼：** preview / 阅读器 / 嵌入后的博客排版、缺字、iframe 高度。
3. **接真文章（仅阶段 5 需要）：** 现有后端怎么按文章 id 取正文。没有则阶段 5 只能嵌 fixture 或假 id，博客里会「能嵌入但不是库里那一章」。
4. **GitHub 公开发布：** 你自己建远程库并授权 push；AI 默认只在本地建仓。
5. **GitHub 下载失败时：** 手动把 `18_NotoSansSC.zip` 放到 `fonts/master/`。

**不再需要你做的（相对旧计划）：** 买字体、选收费策略、买域名、配 Redis、申请 siteKey、改第三方 CSP、准备 VIP 登录打通。

**AI 可以代劳的：** 建独立项目、下载 OFL 母版、字体工具、API、阅读器、embed.js、阶段 5 改本站章节页、README 嵌入说明。
