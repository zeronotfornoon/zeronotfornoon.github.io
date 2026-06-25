/**
 * 统一构建：档案索引 + 各页 fallback 数据
 *
 * 用法：node scripts/build.mjs
 *
 * - articles/*.md  → data/articles.json + js/archive-data.js
 * - data/games.json → js/games-data.js
 */

import { buildArticles } from './build-articles.mjs';
import { buildGames } from './build-games.mjs';

const articles = buildArticles();
const games = buildGames();

console.log('');
console.log('构建完成：');
console.log('  档案 ' + articles.count + ' 篇 → ' + articles.outFile);
console.log('        fallback → ' + articles.fallbackFile);
console.log('  游戏 ' + games.count + ' 款 → ' + games.sourceFile);
console.log('        fallback → ' + games.fallbackFile);
