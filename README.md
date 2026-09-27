# 谜题百科

收集喜爱的纸笔谜题：题型百科与可组合筛选的题库。基于 [Astro](https://astro.build)，部署在 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev      # 开发预览 http://localhost:4321/newpuzzlewiki/
npm run build    # 构建到 dist/
```

## 目录结构

```
src/content/
  genres/<题型id>.md                 题型百科页（规则、技巧）
  puzzles/<题型id>/<谜题id>.yaml      谜题条目
  puzzles/<题型id>/<谜题id>-q.png     题目图片
  puzzles/<题型id>/<谜题id>-a.png     答案图片
scripts/import-puzzles.mjs           批量导入脚本
```

## 添加题型

在 `src/content/genres/` 新建 `<id>.md`，id 用英文小写（如 `heyawake`）：

```markdown
---
name: { zh: 美术馆, ja: 美術館, en: Akari }
aliases: [Light Up]
inventor: Nikoli
category: 数字填入类
summary: 一句话简介
---

## 规则
...
```

## 添加谜题

### 单道

在 `src/content/puzzles/<题型id>/` 放入图片和一个 YAML：

```yaml
title: 数墙 #12
genre: nurikabe          # 必须是已存在的题型 id
question: ./inaba-012-q.png
answer: ./inaba-012-a.png  # 可选
author: 稲葉直貴
source: 稲葉パズル
url: http://inabapuzzle.com/...
difficulty: 3            # 1–5
size: 10x10
tags: [入门, 对称]
date: 2026-09-25
notes: 个人点评
```

### 批量导入

把图片按 `名字-q.png` / `名字-a.png` 成对放进一个文件夹，然后：

```bash
npm run import -- ~/Downloads/inaba-nurikabe --genre nurikabe --prefix inaba \
  --author 稲葉直貴 --source 稲葉パズル --difficulty 3 --tags 入门
```

- 先加 `--dry-run` 看看会做什么。
- 已存在的条目会跳过，可以反复执行。
- 如果你的命名不同，比如 `001.png` / `001_ans.png`，可以用 `--q-suffix "" --a-suffix _ans`。
- 导入后再手动微调各 YAML 的标题、难度、标签。

图片直接放原图即可，构建时会自动压缩成 WebP 并生成缩略图。

## 题库筛选

`/puzzles/` 支持关键词、题型（多选）、难度（多选）、作者、出处、标签（需同时满足）与排序。筛选条件会写进网址，可以直接分享，例如：

```
/puzzles/?genre=nurikabe,sudoku&d=4,5&tag=难题
```

## 部署

仓库 Settings → Pages → Source 选择 **GitHub Actions**，之后推送到 `main` 就会自动部署到
`https://minfang-lin.github.io/newpuzzlewiki/`。

## 从 PDF 题集导入

适用于「一页一个题型：规则 + 例题 + 若干谜题」的题集（如稲葉直貴的本格パズル集）。

```bash
pip install pymupdf
# 1. 按页裁出例题、解答和各道谜题（PDF 不要放进仓库）
python3 scripts/extract-pdf.py 题集.pdf /tmp/extract --pages 1-20
# 2. 为每个题型写好 src/content/genres/<id>.md（规则翻译）
# 3. 在 data/imports/<题集>.json 里登记「页码 → 题型 id」，然后导入
python3 scripts/import-extracted.py /tmp/extract data/imports/inaba-honkaku.json
```

题型页可以在 frontmatter 中加 `example` / `exampleAnswer`（例题图片）和 `links`（外部链接）。
