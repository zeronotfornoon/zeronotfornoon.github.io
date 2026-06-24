import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API_URL = 'https://afdian.com/api/open/query-sponsor';
const userId = process.env.AFDIAN_USER_ID;
const token = process.env.AFDIAN_TOKEN;
const outPath = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'sponsors.json');

if (!userId || !token) {
  console.error('Missing AFDIAN_USER_ID or AFDIAN_TOKEN');
  process.exit(1);
}

function sign(paramsJson, ts) {
  const raw = `${token}params${paramsJson}ts${ts}user_id${userId}`;
  return createHash('md5').update(raw, 'utf8').digest('hex');
}

async function querySponsorPage(page) {
  const paramsJson = JSON.stringify({ page });
  const ts = Math.floor(Date.now() / 1000);
  const body = { user_id: userId, params: paramsJson, ts, sign: sign(paramsJson, ts) };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (json.ec !== 200) throw new Error(json.em || `ec=${json.ec}`);
  return json.data;
}

function formatSponsor(item) {
  const name = item.user?.name || item.user?.user_id || '匿名资助人';
  const amount = item.all_sum_amount ? `累计 ¥${item.all_sum_amount}` : '';
  return { name, amount, all_sum_amount: item.all_sum_amount || '' };
}

async function fetchAllSponsors() {
  const all = [];
  let page = 1;
  let totalPage = 1;
  while (page <= totalPage) {
    const data = await querySponsorPage(page);
    totalPage = data.total_page || 1;
    const list = data.list || [];
    list.forEach((item) => all.push(formatSponsor(item)));
    page += 1;
    if (list.length === 0) break;
  }
  return all;
}

const list = await fetchAllSponsors();
const output = { updated_at: new Date().toISOString(), count: list.length, list };
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Wrote ${list.length} sponsors to ${outPath}`);
