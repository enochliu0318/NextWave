# 后浪 NextWave

> 信仰的后浪，青春的发声

面向青少年的文学发表静态网站，基于 [Hugo](https://gohugo.io/) 构建，通过 Git + Markdown 管理内容，部署至 Cloudflare Pages。

## 栏目

| 目录 | 栏目 |
|------|------|
| `content/poetry/` | 诗歌 |
| `content/prose/` | 散文 |
| `content/fiction/` | 小说 |

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
date: 2026-07-28
draft: false
description: "摘要（可选，用于列表页展示）"
---
```

- 将 `draft` 设为 `false` 才会正式发布
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
│   └── about.md             # 关于页面
├── layouts/                 # 页面模板
├── static/css/style.css     # 样式
├── hugo.toml                # 站点配置
└── README.md
```

## 许可证

内容版权归各作者所有。站点代码可自由使用与修改。
