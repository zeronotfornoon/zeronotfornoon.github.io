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
    /(<img\s[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi,
    (match, before, src, after) => before + resolveArticleImage(articleId, src) + after
  );

  return result;
}

function coverThumbHtml(article, thumbClass, labelText) {
  const cover = article.cover ? resolveArticleImage(article.id, article.cover) : '';
  const label = labelText ? '<span class="featured-thumb-label">' + labelText + '</span>' : '';

  if (cover) {
    return (
      '<div class="' + thumbClass + ' has-cover">' +
        '<img src="' + cover + '" alt="" loading="lazy" decoding="async">' +
        label +
      '</div>'
    );
  }

  return '<div class="' + thumbClass + '">' + label + '</div>';
}

if (typeof window !== 'undefined') {
  window.resolveArticleImage = resolveArticleImage;
  window.resolveBodyImages = resolveBodyImages;
  window.coverThumbHtml = coverThumbHtml;
}

if (typeof module !== 'undefined') {
  module.exports = { resolveArticleImage, resolveBodyImages, coverThumbHtml };
}
