/**
 * 文章图片路径解析
 * - cover: cover.jpg  →  images/articles/{id}/cover.jpg
 * - 正文 ![](fig1.png) → images/articles/{id}/fig1.png
 * - 以 http / / / images/ 开头的路径原样保留
 */
function resolveArticleImage(articleId, path) {
  if (!path || !articleId) return path || '';
  const trimmed = String(path).trim();
  if (/^(https?:|\/|images\/|data:)/i.test(trimmed)) return trimmed;
  return 'images/articles/' + articleId + '/' + trimmed.replace(/^\.\//, '');
}

function resolveBodyImages(body, articleId) {
  if (!body || !articleId) return body;

  let result = body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const resolved = resolveArticleImage(articleId, src);
    return '![' + alt + '](' + resolved + ')';
  });

  result = result.replace(
    /(<img\b[^>]*\bsrc=)(["'])([^"']+)\2/gi,
    (match, prefix, quote, src) => prefix + quote + resolveArticleImage(articleId, src) + quote
  );

  return result;
}

const DEFAULT_COVER_LABELS = {
  research: { zh: '考据', en: 'Research' },
  interview: { zh: '采访', en: 'Interview' },
  news: { zh: '资讯', en: 'News' }
};

function defaultCoverMark(category, lang) {
  const labels = DEFAULT_COVER_LABELS[category] || { zh: '档案', en: 'Archive' };
  const text = lang === 'en' ? labels.en : labels.zh;
  return (
    '<span class="thumb-default-mark cat-' + category + '" aria-hidden="true">' +
      '<span class="thumb-default-glyph"></span>' +
      '<span class="thumb-default-text">' + text + '</span>' +
    '</span>'
  );
}

function coverThumbHtml(article, thumbClass, labelText, lang) {
  const cover = article.cover ? resolveArticleImage(article.id, article.cover) : '';
  const label = labelText ? '<span class="featured-thumb-label">' + labelText + '</span>' : '';
  const catClass = article.category ? ' cat-' + article.category : '';

  if (cover) {
    return (
      '<div class="' + thumbClass + ' has-cover' + catClass + '">' +
        '<img src="' + cover + '" alt="" loading="lazy" decoding="async">' +
        label +
      '</div>'
    );
  }

  return (
    '<div class="' + thumbClass + ' has-default' + catClass + '">' +
      defaultCoverMark(article.category, lang || 'zh') +
      label +
    '</div>'
  );
}

if (typeof window !== 'undefined') {
  window.resolveArticleImage = resolveArticleImage;
  window.resolveBodyImages = resolveBodyImages;
  window.coverThumbHtml = coverThumbHtml;
}

if (typeof module !== 'undefined') {
  module.exports = { resolveArticleImage, resolveBodyImages, coverThumbHtml };
}
