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

if (typeof window !== 'undefined') {
  window.parseArticleMd = parseArticleMd;
}

if (typeof module !== 'undefined') {
  module.exports = { parseArticleMd };
}
