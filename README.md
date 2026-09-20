# 后浪 NextWave

> 信仰的后浪，青春的发声

面向青少年的文学发表静态网站，基于 [Hugo](https://gohugo.io/) 构建，通过 Git + Markdown 管理内容，部署至 Cloudflare Pages。

## 栏目

| 目录 | 栏目 |
|------|------|
| `content/poetry/` | 诗歌 |
| `content/prose/` | 散文 |
| `content/fiction/` | 小说 |
| `content/non-fiction/` | 纪实 |

## 导航与返回

- 导航栏只列栏目与单页：`诗歌 · 散文 · 小说 · 纪实 ┃ 投稿 · 关于`，之后依次是搜索框、语言切换与主题切换
- 「首页」不再占用菜单项（点左上角站名「后浪 NextWave」即回首页）；「投稿」是次要操作，用一条 1px 细竖线与栏目分组，移动端竖线隐藏
- 文章页与栏目列表页有一个 iOS「液态玻璃」悬浮胶囊按钮，带小箭头图标、只显示「返回」二字（英文 Back），水平对齐站名「后浪」正下方：`position: fixed` 固定悬浮在视口左上（sticky 头部之下），**不随页面滚动**，并压在页头渐变背景之上；文章页回所属栏目列表页，栏目列表页回首页，两页由 `baseof.html` 统一渲染、位置必然一致；文章页原有的底部返回链接已并入该按钮
- 头部高度会随屏宽换行、移动端紧凑态、移动端菜单展开而变化（实测 68.8px ~ 218.8px），故按钮的 `top` 不写死，而是 `calc(var(--header-h, 5.3rem) + 0.7rem)`：由 `header-scroll.js` 用 `ResizeObserver` 实时量测头部高度写入 `--header-h`，按钮因此始终紧贴头部下缘、任何屏宽与状态下都不会被头部玻璃层盖住；菜单展开/收起时按钮平滑跟随头部动画移动。无 JS 时回退 5.3rem（96px），仍完整落在移动端头部之下
- 按钮 z-index 90 低于 sticky 头部（100），滚动时从头部下方穿过，不会盖住导航
- 移动端滚动联动：下滑进入紧凑态并自动收起菜单、回到顶部自动展开；点击汉堡开合菜单会短暂改变头部高度，浏览器随之产生滚动锚定位移，`header-scroll.js` 通过「scrollY 位移 ≈ 头部高度变化」识别并忽略它，避免刚点开的菜单被立刻收回去（否则向下滚动后将无法打开菜单）
- 文案显示「返回」，英文界面为 Back，跟随导航栏 EN/中 按钮联动

## 页脚

- 三栏杂志式布局，两列之间以 1px 竖向细分隔线撑起结构：
  - **品牌区**：站名 + 标语 + 站点简介（来自 `hugo.toml [params].description`）+ 动态作品总数「已收录 N 篇作品」（与首页文章统计同一数据源，构建时自动更新）
  - **栏目**：诗歌、散文、小说、纪实，每栏右侧带该栏目文章数
  - **探索**：投稿、关于、站内搜索、RSS 订阅
- 底栏以细线与上方分隔：左侧版权，右侧「技术支持 mugee · 更新日志」（更新日志链接由 `layouts/changelog/single.html` 直接渲染仓库根 `CHANGELOG.md`，单文件双用）
- 移动端：品牌独占一行，栏目与探索两列并排（分隔线只留两列之间），底栏左对齐堆叠
- 深浅色模式均适配；所有文案挂 `data-i18n-en`，EN/中 切换联动
- `/search/` 页自身不重复显示「站内搜索」入口（其余页面均显示）

## 站内搜索

搜索不再占用导航栏目，而是导航右侧的一个「搜索框」按钮 + 弹出面板，纯前端实现，无需任何后端或第三方服务：

- 点击导航右侧的搜索框（或按 `/`、`Ctrl/⌘ + K`）从顶部弹出搜索面板，任意页面均可使用；移动端在汉堡按钮左侧另有搜索图标，一点即开
- `↑` `↓` 选择结果，`Enter` 打开，`Esc` 关闭；点击遮罩空白处也可关闭
- 面板头部右侧的「关闭」文字胶囊用于退出，输入框内的小圆形图标用于清空输入（有内容时才出现），两者形态不同不会混淆
- 弹层最多展示 8 条；面板底部常驻「前往搜索页 / 查看全部结果」入口，有关键词时自动带上 `?q=`
- `/search/` 独立搜索页另有页脚「站内搜索」入口（静态链接，不依赖 JS），支持按栏目筛选（全部 / 诗歌 / 散文 / 小说 / 纪实）与 `/search/?q=关键词` 直达
- 构建时 Hugo 会根据 `layouts/index.json` 生成 `/index.json` 搜索索引（含标题、作者、栏目、摘要与纯文本正文）
- 访客在浏览器中完成匹配、排序与关键词高亮（`static/js/search.js`）：多关键词（空格分隔，取交集）、标题加权排序
- 中英文界面文案跟随导航栏 EN/中 按钮联动；搜索样式位于 `static/css/style.css` 的「站内搜索」区块

## 本地开发

### 前置要求

- [Hugo Extended](https://gohugo.io/installation/)（推荐 0.128.0 及以上）

### 启动预览

```bash
hugo server -D
```

浏览器访问 http://localhost:1313

### 构建静态文件

```bash
hugo --minify
```

输出目录为 `public/`

## 发表文章

### 1. 创建新文章

在对应栏目目录下新建 Markdown 文件：

```bash
hugo new poetry/my-poem.md
hugo new prose/my-essay.md
hugo new fiction/my-story.md
```

### 2. 编辑 Front Matter

每篇文章头部需包含以下字段：

```yaml
---
title: "文章标题"
author: "作者笔名"
grade: "高三"
date: 2026-07-28
draft: false
description: "摘要（可选，用于列表页展示）"
---
```

- 将 `draft` 设为 `false` 才会正式发布
- `grade` 是作者写作年级（如：初一 / 高一 / 高三 / G10），以纯文字显示在作者与日期之间（列表卡片、文章页与搜索结果）；**留空则不显示**
- 栏目由文件所在目录决定，无需额外字段

### 3. 撰写正文

在 Front Matter 下方用 Markdown 撰写正文。诗歌建议使用短句换行，站点会自动居中排版。

### 4. 提交并推送

```bash
git add .
git commit -m "新增文章：文章标题"
git push
```

推送后 Cloudflare Pages 会自动构建并部署。

## Cloudflare Pages 部署

### 1. 推送代码到 Git 仓库

```bash
git init
git add .
git commit -m "初始化后浪 NextWave 站点"
git remote add origin <你的仓库地址>
git push -u origin main
```

### 2. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择你的 GitHub / GitLab 仓库
4. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| Framework preset | Hugo |
| Build command | `hugo --minify` |
| Build output directory | `public` |

5. 添加环境变量（可选，确保版本一致）：

| 变量名 | 值 |
|--------|-----|
| `HUGO_VERSION` | `0.128.0` |

6. 点击 **Save and Deploy**

### 3. 绑定自定义域名

1. 进入 Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入你的域名（如 `nextwave.example.com`）
3. 若域名已在 Cloudflare 管理，DNS 记录会自动添加
4. 若域名在外部注册商，按提示添加 CNAME 记录指向 `<项目名>.pages.dev`

### 4. 更新 baseURL

部署成功后，编辑 [hugo.toml](hugo.toml)，将 `baseURL` 改为你的实际域名：

```toml
baseURL = "https://你的域名/"
```

提交并推送，确保 sitemap 与内部链接正确。

## 项目结构

```
NextWave/
├── archetypes/default.md    # 新建文章模板
├── content/
│   ├── poetry/              # 诗歌
│   ├── prose/               # 散文
│   ├── fiction/             # 小说
│   ├── non-fiction/         # 纪实
│   └── about.md             # 关于页面
├── layouts/                 # 页面模板
├── static/css/style.css     # 样式
├── hugo.toml                # 站点配置
└── README.md
```

## 许可证

内容版权归各作者所有。站点代码可自由使用与修改。
