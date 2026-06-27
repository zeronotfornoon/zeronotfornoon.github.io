/**
 * 从爱发电开放 API 拉取赞助人列表，写入 sponsors.json（供 humid-wilds.html 读取）
 *
 * 环境变量：
 *   AFDIAN_USER_ID  爱发电 user_id（开发者后台，不是主页 slug）
 *   AFDIAN_TOKEN    爱发电 API Token
 *   AFDIAN_API_BASE 可选，覆盖 API 根地址（默认依次尝试 ifdian.net / afdian.com）
 *
 * 用法：node scripts/sync-sponsors.mjs [输出路径]
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_VERSION = 2;

const API_BASES = (process.env.AFDIAN_API_BASE
  ? [process.env.AFDIAN_API_BASE.replace(/\/$/, '')]
  : ['https://ifdian.net/api/open', 'https://afdian.com/api/open']
).map((base) => base.replace(/\/$/, ''));

const userId = String(process.env.AFDIAN_USER_ID || '').trim();
const token = String(process.env.AFDIAN_TOKEN || '').trim();
const outPath = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'sponsors.json');

if (!userId || !token) {
  console.error('错误：缺少环境变量 AFDIAN_USER_ID 或 AFDIAN_TOKEN');
  console.error('请在 GitHub 仓库 Settings → Secrets and variables → Actions 里配置这两个 Secret');
  process.exit(1);
}

const REQUEST_TIMEOUT_MS = 30_000;

function sign(paramsJson, ts) {
  const raw = `${token}params${paramsJson}ts${ts}user_id${userId}`;
  return createHash('md5').update(raw, 'utf8').digest('hex');
}

async function postOpenApi(apiBase, page) {
  const paramsJson = JSON.stringify({ page });
  const ts = Math.floor(Date.now() / 1000);
  const body = { user_id: userId, params: paramsJson, ts, sign: sign(paramsJson, ts) };
  const url = `${apiBase}/query-sponsor`;
  console.log(`正在请求 ${url}（第 ${page} 页）…`);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'weirdgamesclub-sync/1.0 (+https://weirdgamesclub.com)',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? `请求超时（${REQUEST_TIMEOUT_MS / 1000}s）` : err.message;
    throw new Error(`${url} 网络错误：${msg}`);
  }

  const text = await res.text();
  const trimmed = text.trimStart();

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error(
      `${url} 返回 HTML 而非 JSON（HTTP ${res.status}）。` +
        'GitHub Actions 海外节点访问 afdian.com 常被拦截，脚本已优先使用 ifdian.net。' +
        ` 片段：${text.slice(0, 120)}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`${url} 返回非 JSON（HTTP ${res.status}）：${text.slice(0, 200)}`);
  }

  if (json.ec !== 200) {
    throw new Error(json.em || `爱发电 API 错误 ec=${json.ec}（${url}）`);
  }

  return json.data;
}

async function querySponsorPage(page) {
  let lastError;

  for (const apiBase of API_BASES) {
    try {
      return await postOpenApi(apiBase, page);
    } catch (err) {
      lastError = err;
      console.warn(`[warn] ${apiBase} 失败：${err.message}`);
    }
  }

  throw lastError || new Error('所有爱发电 API 域名均不可用');
}

function formatSponsor(item) {
  const id = item.user?.name || item.user?.user_id || '匿名资助人';
  return { id: String(id).trim() || '匿名资助人' };
}

async function fetchAllSponsors() {
  const seen = new Set();
  const all = [];
  let page = 1;
  let totalPage = 1;

  while (page <= totalPage) {
    const data = await querySponsorPage(page);
    totalPage = Number(data.total_page) || 1;
    const list = data.list || [];

    list.forEach((item) => {
      const entry = formatSponsor(item);
      if (seen.has(entry.id)) return;
      seen.add(entry.id);
      all.push(entry);
    });

    page += 1;
    if (!list.length) break;
  }

  return all;
}

try {
  console.log(`sync-sponsors v${SCRIPT_VERSION} → ${API_BASES.join(', ')}`);
  const list = await fetchAllSponsors();
  const output = {
    updated_at: new Date().toISOString(),
    count: list.length,
    list,
  };
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`已写入 ${list.length} 位赞助人到 ${outPath}`);
} catch (err) {
  console.error('同步失败：', err.message || err);
  process.exit(1);
}
