const CATEGORY_LABELS = {
  research: { zh: '考据', en: 'Research' },
  interview: { zh: '采访', en: 'Interview' },
  news: { zh: '资讯', en: 'News' }
};

const NOT_FOUND = {
  zh: {
    title: '文章未找到',
    body: '<p>该文章不存在或已被移除。<a href="archive.html">返回异味档案</a></p>'
  },
  en: {
    title: 'Article Not Found',
    body: '<p>This article does not exist or has been removed. <a href="archive.html">Back to Archives</a></p>'
  }
};

const RELATED_LIMIT = 3;
const TOC_MIN_HEADINGS = 2;
const COPY_RESET_MS = 2000;

let currentLang = 'zh';
let currentArticle = null;
let currentBodyHtml = '';
let allArticlesIndex = [];
let copyResetTimer = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeTag(tag) {
  return String(tag || '').trim();
}

function catLabel(category) {
  const labels = CATEGORY_LABELS[category];
  return labels ? labels[currentLang] : category;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (currentLang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getArticleId() {
  return new URLSearchParams(window.location.search).get('id');
}

function articleUrl(id) {
  return 'article.html?id=' + encodeURIComponent(id);
}

function getEmbeddedArticlesData() {
  const data = window.ARCHIVE_ARTICLES_DATA;
  return data && Array.isArray(data.articles) ? data : null;
}

async function fetchArticlesIndex() {
  const urls = [
    new URL('data/articles.json', window.location.href).href,
    new URL('./data/articles.json', window.location.href).href
  ];

  let lastError = null;
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i], { cache: 'no-store' });
      if (!res.ok) {
        lastError = new Error('HTTP ' + res.status);
        continue;
      }
      const data = await res.json();
      return (data.articles || []).sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
      lastError = err;
    }
  }

  const embedded = getEmbeddedArticlesData();
  if (embedded) {
    return embedded.articles.slice().sort((a, b) => b.date.localeCompare(a.date));
  }

  throw lastError || new Error('articles.json not found');
}

function countSharedTags(current, other) {
  const otherSet = new Set((other.tags || []).map(normalizeTag).filter(Boolean));
  return (current.tags || [])
    .map(normalizeTag)
    .filter(tag => tag && otherSet.has(tag)).length;
}

function getRelatedArticles(current, articles, limit) {
  return (articles || [])
    .filter(item => item.id !== current.id)
    .map(item => ({ article: item, score: countSharedTags(current, item) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.article.date.localeCompare(a.article.date);
    })
    .slice(0, limit)
    .map(item => item.article);
}

function getSharedTags(current, other) {
  const otherSet = new Set((other.tags || []).map(normalizeTag).filter(Boolean));
  return (current.tags || [])
    .map(normalizeTag)
    .filter(tag => tag && otherSet.has(tag));
}

function gameTextForLang(game, field, lang) {
  const zhKey = field + 'Zh';
  const enKey = field + 'En';
  if (lang === 'en') return game[enKey] || game[zhKey] || '';
  return game[zhKey] || game[enKey] || '';
}

function gameBadgeLabel(listed) {
  if (listed) {
    return currentLang === 'en' ? 'Supported' : '合作收录';
  }
  return currentLang === 'en' ? 'Archives' : '档案关联';
}

function mergeArticleFromIndex(article, indexEntry) {
  if (!indexEntry) return article;
  const merged = Object.assign({}, article);
  const mdMetaComplete = Boolean(
    article.title &&
    article.title !== article.id &&
    article.date
  );

  if (!mdMetaComplete) {
    merged.category = indexEntry.category || merged.category;
    merged.featured = indexEntry.featured ?? merged.featured;
    merged.date = indexEntry.date || merged.date;
    merged.author = indexEntry.author || merged.author;
    merged.tags = Array.isArray(indexEntry.tags) ? indexEntry.tags : merged.tags;
    merged.title = indexEntry.title || merged.title;
    merged.excerpt = indexEntry.excerpt || merged.excerpt;
    merged.cover = indexEntry.cover || merged.cover;
    merged.games = Array.isArray(indexEntry.games) ? indexEntry.games : merged.games;
  } else if (Array.isArray(indexEntry.games) && indexEntry.games.length) {
    merged.games = indexEntry.games;
  }

  return merged;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() {
        reject(new Error((label || 'request') + ' timed out'));
      }, ms);
    })
  ]);
}

function renderLoadingError(messageZh, messageEn) {
  document.getElementById('articleTitle').textContent = messageZh;
  document.getElementById('articleMeta').style.display = 'none';
  document.getElementById('articleLead')?.classList.add('hidden');
  document.getElementById('articleTags').style.display = 'none';
  document.getElementById('articleGames')?.classList.add('hidden');
  document.getElementById('articleToc')?.classList.add('hidden');
  document.getElementById('articleShare')?.classList.add('hidden');
  document.getElementById('articleRelated')?.classList.add('hidden');
  document.getElementById('articleBody').innerHTML =
    '<p class="lang-zh-inline">' + escapeHtml(messageZh) + '</p>' +
    '<p class="lang-en-inline">' + escapeHtml(messageEn) + '</p>' +
    '<p><a href="archive.html">返回异味档案</a></p>';
  if (typeof applySiteLangVisibility === 'function' && typeof getSiteLang === 'function') {
    applySiteLangVisibility(getSiteLang());
  }
}

function renderLinkedGames(article) {
  const section = document.getElementById('articleGames');
  const list = document.getElementById('articleGamesList');
  if (!section || !list) return;

  const ids = article.games || [];
  if (!ids.length) {
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  if (typeof findGamesByIds !== 'function') {
    console.warn('Article game links: js/games-lib.js not loaded');
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  const games = findGamesByIds(ids);
  if (!games.length) {
    console.warn(
      'Article game links: no matches in games.json for ids:',
      ids.join(', '),
      '— check js/games-data.js / data/games.json upload'
    );
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  list.innerHTML = games.map(game => {
    const coverHtml = typeof renderCoverHtml === 'function'
      ? renderCoverHtml(game, 'article-game-cover')
      : '<div class="article-game-cover"></div>';

    return (
      '<a class="article-game-card" href="' + gameUrl(game.id) + '">' +
        coverHtml +
        '<div class="article-game-body">' +
          '<span class="article-game-badge">' + escapeHtml(gameBadgeLabel(isGameListed(game))) + '</span>' +
          '<span class="article-game-title">' + escapeHtml(gameTextForLang(game, 'title', currentLang)) + '</span>' +
          '<span class="article-game-excerpt">' + escapeHtml(gameTextForLang(game, 'excerpt', currentLang)) + '</span>' +
        '</div>' +
      '</a>'
    );
  }).join('');

  section.classList.remove('hidden');
}

function headingSlug(text, index) {
  const base = String(text || '').trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .slice(0, 48);
  return base || ('section-' + (index + 1));
}

function buildArticleToc(bodyEl) {
  const tocEl = document.getElementById('articleToc');
  const listEl = document.getElementById('articleTocList');
  if (!bodyEl || !tocEl || !listEl) return;

  const headings = bodyEl.querySelectorAll('h2, h3');
  const usedIds = new Set();
  const items = [];

  headings.forEach((heading, index) => {
    let id = heading.id || headingSlug(heading.textContent, index);
    while (usedIds.has(id)) {
      id = id + '-' + (index + 1);
    }
    usedIds.add(id);
    heading.id = id;

    items.push({
      level: heading.tagName.toLowerCase(),
      text: heading.textContent.trim(),
      id: id
    });
  });

  if (items.length < TOC_MIN_HEADINGS) {
    tocEl.classList.add('hidden');
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = items.map(item => {
    const levelClass = item.level === 'h3' ? ' class="toc-h3"' : '';
    return (
      '<li' + levelClass + '>' +
        '<a href="#' + escapeHtml(item.id) + '">' + escapeHtml(item.text) + '</a>' +
      '</li>'
    );
  }).join('');

  tocEl.classList.remove('hidden');
}

function getArticleShareUrl(article) {
  const path = 'article.html?id=' + encodeURIComponent(article.id);
  if (typeof absoluteUrl === 'function') {
    return absoluteUrl(path);
  }
  try {
    return new URL(path, window.location.href).href;
  } catch (e) {
    return window.location.href;
  }
}

function getShareImageUrl(article) {
  if (!article.cover) return '';
  const imagePath = resolveArticleImage(article.id, article.cover);
  if (/^https?:/i.test(imagePath)) return imagePath;
  if (typeof absoluteUrl === 'function') {
    return absoluteUrl(imagePath);
  }
  try {
    return new URL(imagePath, window.location.href).href;
  } catch (e) {
    return imagePath;
  }
}

function updateShareLinks(article) {
  const shareUrl = encodeURIComponent(getArticleShareUrl(article));
  const shareTitle = encodeURIComponent(article.title || '');
  const shareDesc = encodeURIComponent(article.excerpt || article.title || '');
  const sharePic = encodeURIComponent(getShareImageUrl(article));

  const weiboBtn = document.getElementById('shareWeiboBtn');
  if (weiboBtn) {
    weiboBtn.href =
      'https://service.weibo.com/share/share.php?url=' + shareUrl +
      '&title=' + shareTitle;
  }

  const qqBtn = document.getElementById('shareQqBtn');
  if (qqBtn) {
    qqBtn.href =
      'https://connect.qq.com/widget/shareqq/index.html?url=' + shareUrl +
      '&title=' + shareTitle +
      '&summary=' + shareDesc +
      '&desc=' + shareDesc +
      (sharePic ? '&pics=' + sharePic : '');
  }
}

function resetCopyButton() {
  const btn = document.getElementById('shareCopyBtn');
  if (!btn) return;
  btn.classList.remove('is-copied');
  btn.querySelectorAll('.share-copy-label').forEach(label => {
    if (label.classList.contains('lang-zh-inline')) {
      label.textContent = '复制链接';
    } else if (label.classList.contains('lang-en-inline')) {
      label.textContent = 'Copy link';
    }
  });
}

async function copyArticleLink() {
  const url = currentArticle ? getArticleShareUrl(currentArticle) : window.location.href;
  const btn = document.getElementById('shareCopyBtn');
  let copied = false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      copied = true;
    }
  } catch (e) { /* fallback below */ }

  if (!copied) {
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    copied = document.execCommand('copy');
    document.body.removeChild(input);
  }

  if (btn && copied) {
    btn.classList.add('is-copied');
    btn.querySelectorAll('.share-copy-label').forEach(label => {
      if (label.classList.contains('lang-zh-inline')) {
        label.textContent = '已复制';
      } else if (label.classList.contains('lang-en-inline')) {
        label.textContent = 'Copied';
      }
    });
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(resetCopyButton, COPY_RESET_MS);
  }
}

function openWechatShareModal() {
  if (!currentArticle) return;
  const modal = document.getElementById('wechatShareModal');
  const qr = document.getElementById('wechatShareQr');
  if (!modal || !qr) return;

  const url = getArticleShareUrl(currentArticle);
  qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url);
  qr.alt = currentLang === 'en' ? 'WeChat share QR code' : '微信分享二维码';
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeWechatShareModal() {
  const modal = document.getElementById('wechatShareModal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function initShareControls() {
  const copyBtn = document.getElementById('shareCopyBtn');
  if (copyBtn && !copyBtn.dataset.bound) {
    copyBtn.dataset.bound = '1';
    copyBtn.addEventListener('click', copyArticleLink);
  }

  const wechatBtn = document.getElementById('shareWechatBtn');
  if (wechatBtn && !wechatBtn.dataset.bound) {
    wechatBtn.dataset.bound = '1';
    wechatBtn.addEventListener('click', openWechatShareModal);
  }

  const closeBtn = document.getElementById('wechatShareClose');
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = '1';
    closeBtn.addEventListener('click', closeWechatShareModal);
  }

  const modal = document.getElementById('wechatShareModal');
  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = '1';
    modal.addEventListener('click', event => {
      if (event.target === modal) closeWechatShareModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeWechatShareModal();
    });
  }
}

function renderRelatedArticles(article, articles) {
  const section = document.getElementById('articleRelated');
  const list = document.getElementById('articleRelatedList');
  if (!section || !list) return;

  const related = getRelatedArticles(article, articles, RELATED_LIMIT);
  if (!related.length) {
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  list.innerHTML = related.map(item => {
    const sharedTags = getSharedTags(article, item).slice(0, 3);
    const thumbHtml = typeof coverThumbHtml === 'function'
      ? coverThumbHtml(item, 'related-thumb', '', currentLang)
      : '<div class="related-thumb"></div>';
    const tagsHtml = sharedTags.length
      ? (
        '<div class="related-tags">' +
          sharedTags.map(tag => '<span class="related-tag-pill">#' + escapeHtml(tag) + '</span>').join('') +
        '</div>'
      )
      : '';

    return (
      '<a class="related-card" href="' + articleUrl(item.id) + '">' +
        thumbHtml +
        '<div class="related-body">' +
          '<span class="related-cat cat-' + escapeHtml(item.category) + '">' + escapeHtml(catLabel(item.category)) + '</span>' +
          '<div class="related-title">' + escapeHtml(item.title) + '</div>' +
          '<div class="related-meta">' + escapeHtml(formatDate(item.date)) + '</div>' +
          tagsHtml +
        '</div>' +
      '</a>'
    );
  }).join('');

  section.classList.remove('hidden');
}

function renderMarkdown(body) {
  if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: false });
    return marked.parse(body);
  }
  return body
    .split(/\n{2,}/)
    .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
    .join('');
}

function renderArticle(article, bodyHtml) {
  currentArticle = article;
  currentBodyHtml = bodyHtml;

  document.title = article.title + ' — Weird Games Club';

  if (typeof setSiteMeta === 'function') {
    setSiteMeta({
      path: 'article.html?id=' + encodeURIComponent(article.id),
      title: article.title + ' — Weird Games Club',
      description: article.excerpt || '',
      image: article.cover ? resolveArticleImage(article.id, article.cover) : 'logo2.png',
      type: 'article'
    });
  }

  const coverEl = document.getElementById('articleCover');
  if (coverEl) {
    if (article.cover) {
      const src = resolveArticleImage(article.id, article.cover);
      coverEl.innerHTML = '<img src="' + src + '" alt="">';
      coverEl.classList.remove('hidden');
    } else {
      coverEl.innerHTML = '';
      coverEl.classList.add('hidden');
    }
  }

  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleCat').textContent = catLabel(article.category);
  document.getElementById('articleCat').className = 'article-cat cat-' + article.category;
  document.getElementById('articleAuthor').textContent = article.author;
  document.getElementById('articleDate').textContent = formatDate(article.date);
  document.getElementById('articleDate').setAttribute('datetime', article.date);
  document.getElementById('articleMeta').style.display = '';

  const leadEl = document.getElementById('articleLead');
  if (leadEl) {
    if (article.excerpt) {
      leadEl.textContent = article.excerpt;
      leadEl.classList.remove('hidden');
    } else {
      leadEl.textContent = '';
      leadEl.classList.add('hidden');
    }
  }

  const bodyEl = document.getElementById('articleBody');
  bodyEl.innerHTML = bodyHtml;
  buildArticleToc(bodyEl);

  const tagsEl = document.getElementById('articleTags');
  tagsEl.innerHTML = '';
  const tags = article.tags || [];
  if (tags.length) {
    tagsEl.style.display = '';
    tags.forEach(tag => {
      const link = document.createElement('a');
      link.className = 'article-tag';
      link.href = 'archive.html?tag=' + encodeURIComponent(tag);
      link.textContent = '#' + tag;
      tagsEl.appendChild(link);
    });
  } else {
    tagsEl.style.display = 'none';
  }

  document.getElementById('articleShare')?.classList.remove('hidden');
  updateShareLinks(article);
  renderLinkedGames(article);
  renderRelatedArticles(article, allArticlesIndex);
}

function renderNotFound() {
  currentArticle = null;
  const msg = NOT_FOUND[currentLang];
  document.getElementById('articleCover')?.classList.add('hidden');
  document.getElementById('articleTitle').textContent = msg.title;
  document.getElementById('articleMeta').style.display = 'none';
  document.getElementById('articleLead')?.classList.add('hidden');
  document.getElementById('articleTags').innerHTML = '';
  document.getElementById('articleTags').style.display = 'none';
  document.getElementById('articleGames')?.classList.add('hidden');
  document.getElementById('articleGamesList').innerHTML = '';
  document.getElementById('articleToc')?.classList.add('hidden');
  document.getElementById('articleTocList').innerHTML = '';
  document.getElementById('articleBody').innerHTML = msg.body;
  document.getElementById('articleShare')?.classList.add('hidden');
  document.getElementById('articleRelated')?.classList.add('hidden');
  document.getElementById('articleRelatedList').innerHTML = '';
  closeWechatShareModal();
}

async function fetchArticleText(id) {
  const base = 'articles/' + encodeURIComponent(id) + '.md';
  const opts = { cache: 'no-store' };

  let res = await fetch(base, opts);
  if (res.ok) return res.text();

  res = await fetch(base + '?_=' + Date.now(), opts);
  if (res.ok) return res.text();

  return null;
}

function stripLeadingFrontmatter(text) {
  const trimmed = String(text || '').replace(/^\uFEFF/, '');
  const match = trimmed.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? trimmed.slice(match[0].length) : trimmed;
}

async function loadArticle() {
  const id = getArticleId();
  if (!id) {
    renderNotFound();
    return;
  }

  if (typeof parseArticleMd !== 'function' || typeof resolveBodyImages !== 'function') {
    console.error('Article helpers failed to load');
    renderNotFound();
    return;
  }

  initShareControls();

  const FETCH_TIMEOUT_MS = 12000;

  try {
    try {
      if (typeof loadAllGames === 'function') {
        await withTimeout(loadAllGames(), FETCH_TIMEOUT_MS, 'games.json');
      }
    } catch (gamesErr) {
      console.warn('Games index unavailable for article links:', gamesErr);
    }

    try {
      allArticlesIndex = await withTimeout(fetchArticlesIndex(), FETCH_TIMEOUT_MS, 'articles.json');
    } catch (indexErr) {
      console.warn('Article index unavailable for related posts:', indexErr);
      allArticlesIndex = getEmbeddedArticlesData()?.articles || [];
    }

    const indexEntry = allArticlesIndex.find(function(item) {
      return item.id === id;
    });

    const text = await withTimeout(fetchArticleText(id), FETCH_TIMEOUT_MS, 'article md');
    if (!text) {
      renderNotFound();
      return;
    }

    const { meta, body } = parseArticleMd(text);
    let article = typeof normalizeArticleMeta === 'function'
      ? normalizeArticleMeta({ ...meta, id: meta.id || id })
      : {
          id: meta.id || id,
          category: meta.category || 'news',
          date: meta.date || '',
          author: meta.author || '异味游戏同好会',
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          title: meta.title || id,
          excerpt: meta.excerpt || meta.intro || '',
          cover: meta.cover || ''
        };

    article = mergeArticleFromIndex(article, indexEntry);

    const bodySource = Object.keys(meta).length ? body : stripLeadingFrontmatter(text);
    const resolvedBody = resolveBodyImages(bodySource, article.id);
    let bodyHtml;
    try {
      bodyHtml = renderMarkdown(resolvedBody);
    } catch (mdErr) {
      console.warn('Markdown render failed, using plain fallback:', mdErr);
      bodyHtml = resolvedBody
        .split(/\n{2,}/)
        .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
        .join('');
    }
    renderArticle(article, bodyHtml);
  } catch (err) {
    console.error('Failed to load article:', err);
    if (String(err.message || '').includes('timed out')) {
      renderLoadingError('文章加载超时，请刷新页面或稍后再试。', 'Article load timed out. Please refresh and try again.');
    } else {
      renderNotFound();
    }
  }
}

function onLangChange(lang) {
  currentLang = lang;
  if (currentArticle) {
    renderArticle(currentArticle, currentBodyHtml);
  } else {
    renderNotFound();
  }
}

window.articleOnLangChange = onLangChange;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadArticle);
} else {
  loadArticle();
}
