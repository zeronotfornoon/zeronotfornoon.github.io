/**
 * 从 data/games.json 生成 js/games-data.js（本地 file:// 打开时的 fallback）
 *
 * 用法：node scripts/build-games.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJson, writeFallbackJs } from './lib/fallback.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'data', 'games.json');
const FALLBACK_FILE = path.join(ROOT, 'js', 'games-data.js');

export function buildGames(root = ROOT) {
  const sourcePath = path.join(root, 'data', 'games.json');
  const fallbackPath = path.join(root, 'js', 'games-data.js');

  if (!fs.existsSync(sourcePath)) {
    throw new Error('找不到 ' + sourcePath);
  }

  const payload = readJson(sourcePath);
  if (!Array.isArray(payload.games)) {
    throw new Error('games.json 必须包含 games 数组');
  }

  writeFallbackJs(fallbackPath, 'GAMES_DATA', payload);

  return {
    count: payload.games.length,
    sourceFile: sourcePath,
    fallbackFile: fallbackPath
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = buildGames();
  console.log('已同步 ' + result.sourceFile + ' → ' + result.fallbackFile + '（' + result.count + ' 款游戏）');
}
