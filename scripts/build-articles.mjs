/**
 * 扫描 articles/*.md，生成 data/articles.json（列表页索引，不含正文）
 *
 * 用法：node scripts/build-articles.mjs
 * 统一构建：node scripts/build.mjs
 *
 * 发新文章 / 改标题日期分类：编辑 .md 顶部的信息块后运行构建脚本
 * 只改正文：直接保存 .md 即可，详情页即时生效，不必运行脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArticleMd, normalizeArticleMeta } from '../js/frontmatter.js';
import { writeFallbackJs } from './lib/fallback.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const OUT_FILE = path.join(ROOT, 'data', 'articles.json');
const FALLBACK_FILE = path.join(ROOT, 'js', 'archive-data.js');

const SKIP = new Set(['_template.md']);

export function buildArticles(root = ROOT) {
  const articlesDir = path.join(root, 'articles');
  const outFile = path.join(root, 'data', 'articles.json');
  const fallbackFile = path.join(root, 'js', 'archive-data.js');

  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') && !SKIP.has(f));

  const articles = files.map(file => {
    const text = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const { meta } = parseArticleMd(text);

    if (!meta.id) {
      console.warn('跳过 ' + file + '：缺少 id 字段');
      return null;
    }

    const article = normalizeArticleMeta({
      ...meta,
      date: meta.date || '1970-01-01'
    });

    if (!article.excerpt) {
      console.warn('提示 ' + file + '：未填写 excerpt（列表页一句话介绍），请在 frontmatter 手写');
    }
    if (!article.tags.length) {
      console.warn('提示 ' + file + '：未填写 tags（可筛选标签），请在 frontmatter 手写');
    }

    if (!article.cover) delete article.cover;

    return article;
  }).filter(Boolean);

  articles.sort((a, b) => b.date.localeCompare(a.date));

  const payload = { articles };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  writeFallbackJs(fallbackFile, 'ARCHIVE_ARTICLES_DATA', payload);

  return {
    count: articles.length,
    outFile,
    fallbackFile
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = buildArticles();
  console.log('已生成 ' + result.outFile + '，共 ' + result.count + ' 篇文章');
  console.log('已生成 ' + result.fallbackFile);
}
