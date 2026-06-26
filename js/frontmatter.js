/**
 * 解析带 YAML frontmatter 的 Markdown 文章。
 * 格式见 articles/_template.md
 */
function parseArticleMd(text) {
  const trimmed = text.replace(/^\uFEFF/, '');
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: trimmed.trim() };
  }

  const meta = {};
  let currentKey = null;

  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(stripQuotes(listItem[1].trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;

    currentKey = kv[1];
    const rawVal = kv[2].trim();

    if (rawVal === '') {
      meta[currentKey] = [];
      continue;
    }

    if (rawVal === 'true') meta[currentKey] = true;
    else if (rawVal === 'false') meta[currentKey] = false;
    else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      meta[currentKey] = rawVal
        .slice(1, -1)
        .split(',')
        .map(s => stripQuotes(s.trim()))
        .filter(Boolean);
    } else {
      meta[currentKey] = coerceScalar(stripQuotes(rawVal));
    }
  }

  return { meta, body: match[2].replace(/^\n/, '') };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function coerceScalar(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value;
}

/** 只认 frontmatter 里手写的列表字段，不从正文或标题提取 */
function parseTagsList(raw) {
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,，、]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function parseGamesList(raw) {
  return parseTagsList(raw);
}

/** 规范化文章元数据：tags / games / excerpt / cover 均来自 frontmatter 手写字段 */
function normalizeArticleMeta(meta) {
  const m = meta || {};
  const article = {
    id: m.id || '',
    category: m.category || 'news',
    featured: Boolean(m.featured),
    date: m.date || '',
    author: m.author || '异味游戏同好会',
    tags: parseTagsList(m.tags),
    title: m.title || m.id || '',
    excerpt: String(m.excerpt || m.intro || '').trim(),
    cover: String(m.cover || '').trim()
  };

  const games = parseGamesList(m.games);
  if (games.length) article.games = games;

  return article;
}

if (typeof window !== 'undefined') {
  window.parseArticleMd = parseArticleMd;
  window.parseTagsList = parseTagsList;
  window.parseGamesList = parseGamesList;
  window.normalizeArticleMeta = normalizeArticleMeta;
}

if (typeof module !== 'undefined') {
  module.exports = { parseArticleMd, parseTagsList, parseGamesList, normalizeArticleMeta };
}
