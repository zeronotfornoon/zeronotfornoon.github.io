---
id: 文章唯一标识-用英文短横线
category: research
featured: false
date: 2026-06-24
author: 小椿
tags:
  - 标签一
  - 标签二
title: 【栏目名】文章标题
excerpt: 列表页显示的摘要，一两句话介绍这篇文章讲什么。
cover: cover.jpg
---

在这里写正文，支持 **Markdown**。

## 图片怎么放

### 1. 封面图（列表页 + 文章顶图）

1. 把图片放到 `images/articles/文章id/` 文件夹  
   例如：`images/articles/my-article-id/cover.jpg`
2. 在上方信息块写：`cover: cover.jpg`  
   也支持完整路径：`cover: images/articles/my-article-id/cover.jpg`

改封面后运行：`powershell -File scripts/build-articles.ps1`

### 2. 正文插图

图片同样放在 `images/articles/文章id/` 下，正文里直接写文件名即可：

```markdown
![游戏主菜单截图](menu.png)

![战斗画面](battle.png)
```

带说明的图片（推荐）：

```html
<figure class="article-figure">
<img src="screenshot.png" alt="游戏截图">
<figcaption>图1：某某游戏的标题界面</figcaption>
</figure>
```

> 正文插图只改 .md 保存即可，不必运行构建脚本。

## 二级标题

段落之间空一行即可。

category 取值：`research`（考据）、`interview`（采访）、`news`（资讯）
