const CATEGORY_LABELS = {
  research: { zh: '考据', en: 'Research' },
  interview: { zh: '采访', en: 'Interview' },
  news: { zh: '资讯', en: 'News' }
};

const STRIP_META = {
  interview: {
    zh: '最新采访',
    en: 'Latest Interviews',
    emptyZh: '采访整理中……',
    emptyEn: 'Interviews brewing…'
  },
  research: {
    zh: '考据笔记',
    en: 'Research Notes',
    emptyZh: '考据笔记酝酿中……',
    emptyEn: 'Research notes brewing…'
  },
  news: {
    zh: '资讯动态',
    en: 'News & Updates',
    emptyZh: '资讯动态酝酿中……',
    emptyEn: 'News brewing…'
  }
};

const PAGE_SIZE = 6;
let allArticles = [];
let filteredArticles = [];
let currentFilter = 'all';
let currentTag = '';
let visibleCount = PAGE_SIZE;
let currentLang = 'zh';

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

function articleHasTag(article, tag) {
  const needle = normalizeTag(tag);
  if (!needle) return true;
  return (article.tags || []).some(item => normalizeTag(item) === needle);
}

function catLabel(category) {
  const labels = CATEGORY_LABELS[category];
  return labels ? labels[currentLang] : category;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (currentLang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatStatsDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (currentLang === 'en') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function articleUrl(id) {
  return 'article.html?id=' + encodeURIComponent(id);
}

function archiveTagUrl(tag) {
  return 'archive.html?tag=' + encodeURIComponent(normalizeTag(tag));
}

function countByCategory(category) {
  return allArticles.filter(a => a.category === category).length;
}

function renderTagsHtml(tags) {
  return (tags || []).map(tag => {
    const safeTag = normalizeTag(tag);
    const activeClass = currentTag && normalizeTag(currentTag) === safeTag ? ' is-active' : '';
    return (
      '<button type="button" class="article-tag' + activeClass + '" data-tag="' + escapeHtml(safeTag) + '">' +
        '#' + escapeHtml(safeTag) +
      '</button>'
    );
  }).join('');
}

function renderHeroStats(articles) {
  const el = document.getElementById('heroStats');
  if (!el) return;

  if (!articles.length) {
    el.textContent = currentLang === 'en' ? 'Loading archive…' : '档案加载中……';
    return;
  }

  const total = articles.length;
  const interviews = countByCategory('interview');
  const research = countByCategory('research');
  const latest = formatStatsDate(articles[0].date);

  if (currentLang === 'en') {
    el.innerHTML =
      '<span>' + total + ' entries</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>' + interviews + ' interviews</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>' + research + ' research</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>Updated ' + latest + '</span>';
    return;
  }

  el.innerHTML =
    '<span>' + total + ' 篇档案</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>' + interviews + ' 篇采访</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>' + research + ' 篇考据</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>最新更新 ' + latest + '</span>';
}

function updateArchiveCount() {
  document.querySelectorAll('.archive-count').forEach(el => {
    el.textContent = String(allArticles.length);
  });
}

function renderTagBanner() {
  const banner = document.getElementById('tagFilterBanner');
  const label = document.getElementById('tagFilterLabel');
  if (!banner || !label) return;

  if (!currentTag) {
    banner.classList.add('hidden');
    label.textContent = '';
    return;
  }

  banner.classList.remove('hidden');
  if (currentLang === 'en') {
    label.innerHTML = 'Tag: <strong>#' + escapeHtml(currentTag) + '</strong> · ' + filteredArticles.length + ' result(s)';
    return;
  }
  label.innerHTML = '标签：<strong>#' + escapeHtml(currentTag) + '</strong> · 共 ' + filteredArticles.length + ' 篇';
}

function syncUrl() {
  const url = new URL(window.location.href);
  if (currentTag) {
    url.searchParams.set('tag', currentTag);
  } else {
    url.searchParams.delete('tag');
  }
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function refreshArticlesView() {
  visibleCount = PAGE_SIZE;

  filteredArticles = allArticles.filter(article => {
    const catOk = currentFilter === 'all' || article.category === currentFilter;
    const tagOk = !currentTag || articleHasTag(article, currentTag);
    return catOk && tagOk;
  });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === currentFilter);
  });

  renderTagBanner();
  renderCategorySections();
  renderFeed();
  syncUrl();
}

function renderFeatured(articles) {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const featured = articles.filter(a => a.featured).slice(0, 3);
  if (!featured.length) {
    document.getElementById('featuredSection')?.classList.add('hidden');
    return;
  }

  document.getElementById('featuredSection')?.classList.remove('hidden');
  grid.className = 'featured-grid featured-count-' + featured.length;

  featured.forEach((article, i) => {
    const card = document.createElement('article');
    const isHero = featured.length === 3 && i === 0;
    card.className = 'featured-card' + (isHero ? ' featured-card-hero' : '');

    const showExcerpt = featured.length === 1 || isHero;
    const tagsHtml = renderTagsHtml(article.tags);

    card.innerHTML =
      '<a class="featured-card-link" href="' + articleUrl(article.id) + '">' +
        coverThumbHtml(article, 'featured-thumb', catLabel(article.category), currentLang) +
        '<div class="featured-body">' +
          '<span class="article-cat cat-' + article.category + '">' + catLabel(article.category) + '</span>' +
          '<h3 class="featured-title">' + escapeHtml(article.title) + '</h3>' +
          (showExcerpt ? '<p class="featured-excerpt">' + escapeHtml(article.excerpt) + '</p>' : '') +
          '<div class="article-meta">' +
            '<span>' + escapeHtml(article.author) + '</span>' +
            '<span class="meta-sep">·</span>' +
            '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
          '</div>' +
        '</div>' +
      '</a>' +
      (tagsHtml ? '<div class="featured-card-tags feed-tags">' + tagsHtml + '</div>' : '');

    grid.appendChild(card);
  });
}

function renderStripCard(article) {
  const card = document.createElement('a');
  card.className = 'strip-card';
  card.href = articleUrl(article.id);
  card.innerHTML =
    coverThumbHtml(article, 'strip-card-thumb', catLabel(article.category), currentLang) +
    '<div class="strip-card-body">' +
      '<span class="article-cat cat-' + article.category + '">' + catLabel(article.category) + '</span>' +
      '<h3 class="strip-card-title">' + escapeHtml(article.title) + '</h3>' +
      '<div class="strip-card-meta">' +
        '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
      '</div>' +
    '</div>';
  return card;
}

function renderCategoryStrip(category) {
  const meta = STRIP_META[category];
  const section = document.createElement('section');
  section.className = 'category-strip';
  section.dataset.category = category;

  const items = allArticles.filter(a => a.category === category).slice(0, 3);
  const title = currentLang === 'en' ? meta.en : meta.zh;
  const emptyText = currentLang === 'en' ? meta.emptyEn : meta.emptyZh;

  section.innerHTML =
    '<div class="category-strip-head">' +
      '<h2 class="category-strip-title">' + title + '</h2>' +
      '<span class="category-strip-count">' + items.length + '</span>' +
    '</div>';

  const row = document.createElement('div');
  row.className = 'category-strip-row';

  if (!items.length) {
    row.innerHTML = '<div class="category-strip-empty">' + emptyText + '</div>';
  } else {
    items.forEach(article => row.appendChild(renderStripCard(article)));
  }

  section.appendChild(row);
  return section;
}

function renderCategorySections() {
  const wrap = document.getElementById('categorySections');
  const feedSection = document.getElementById('feedSection');
  if (!wrap) return;

  wrap.innerHTML = '';

  if (currentFilter !== 'all' || currentTag) {
    wrap.classList.add('hidden');
    feedSection?.classList.remove('hidden');
    return;
  }

  wrap.classList.remove('hidden');
  feedSection?.classList.add('hidden');

  ['interview', 'research', 'news'].forEach(category => {
    wrap.appendChild(renderCategoryStrip(category));
  });
}

function renderArticleItem(article) {
  const li = document.createElement('li');
  li.className = 'feed-item';
  const tagsHtml = renderTagsHtml(article.tags);

  li.innerHTML =
    '<div class="feed-link">' +
      '<a class="feed-core" href="' + articleUrl(article.id) + '">' +
        coverThumbHtml(article, 'feed-cover', catLabel(article.category), currentLang) +
        '<div class="feed-main">' +
          '<div class="feed-head">' +
            '<span class="article-cat cat-' + article.category + '">' + catLabel(article.category) + '</span>' +
            '<time class="feed-date" datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
          '</div>' +
          '<h3 class="feed-title">' + escapeHtml(article.title) + '</h3>' +
          '<p class="feed-excerpt">' + escapeHtml(article.excerpt) + '</p>' +
          '<div class="feed-foot">' +
            '<span class="feed-author">' + escapeHtml(article.author) + '</span>' +
          '</div>' +
        '</div>' +
        '<span class="feed-arrow" aria-hidden="true">→</span>' +
      '</a>' +
      (tagsHtml ? '<div class="feed-tags-bar">' + tagsHtml + '</div>' : '') +
    '</div>';

  return li;
}

function renderFeed() {
  const list = document.getElementById('feedList');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const emptyState = document.getElementById('emptyState');
  if (!list) return;

  list.innerHTML = '';
  const slice = filteredArticles.slice(0, visibleCount);

  if (!slice.length) {
    emptyState?.classList.remove('hidden');
    if (emptyState) {
      if (currentTag) {
        emptyState.innerHTML = currentLang === 'en'
          ? ('No posts tagged #' + escapeHtml(currentTag))
          : ('暂无标签 #' + escapeHtml(currentTag) + ' 的文章');
      } else {
        emptyState.innerHTML =
          '<span class="lang-zh-inline">暂无文章，野菌还在酝酿中……</span>' +
          '<span class="lang-en-inline">No posts yet — the mushrooms are still brewing…</span>';
        document.querySelectorAll('#emptyState .lang-zh-inline').forEach(el => {
          el.classList.toggle('visible', currentLang === 'zh');
        });
        document.querySelectorAll('#emptyState .lang-en-inline').forEach(el => {
          el.classList.toggle('visible', currentLang === 'en');
        });
      }
    }
    loadMoreBtn?.classList.add('hidden');
    renderTagBanner();
    return;
  }

  emptyState?.classList.add('hidden');
  slice.forEach(article => list.appendChild(renderArticleItem(article)));

  if (visibleCount >= filteredArticles.length) {
    loadMoreBtn?.classList.add('hidden');
  } else {
    loadMoreBtn?.classList.remove('hidden');
  }

  renderTagBanner();
}

function applyFilter(filter) {
  currentFilter = filter;
  currentTag = '';
  refreshArticlesView();
}

function applyTagFilter(tag) {
  const nextTag = normalizeTag(tag);
  if (!nextTag) return;
  currentTag = nextTag;
  currentFilter = 'all';
  refreshArticlesView();
  document.getElementById('feedSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearTagFilter() {
  currentTag = '';
  refreshArticlesView();
}

function getEmbeddedArticlesData() {
  const data = window.ARCHIVE_ARTICLES_DATA;
  if (!data || !Array.isArray(data.articles) || !data.articles.length) return null;
  return data;
}

function getRandomArticlePool() {
  if (allArticles.length) return allArticles;
  const embedded = getEmbeddedArticlesData();
  return embedded ? embedded.articles : [];
}

let randomNavLock = false;

function pickRandomArticle(event) {
  if (randomNavLock) return false;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const pool = getRandomArticlePool();
  if (!pool.length) {
    window.alert(currentLang === 'en'
      ? 'Archive data is unavailable. Open this site via a local server, or refresh the page.'
      : '档案数据不可用。请通过本地服务器打开页面，或刷新后重试。');
    return false;
  }

  randomNavLock = true;
  const article = pool[Math.floor(Math.random() * pool.length)];
  window.location.assign(articleUrl(article.id));
  return false;
}

async function fetchArticlesJson() {
  const urls = [
    new URL('data/articles.json', window.location.href).href,
    new URL('./data/articles.json', window.location.href).href
  ];

  let lastError = null;
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetch(urls[i], { cache: 'no-store' });
      if (!res.ok) {
        lastError = new Error('HTTP ' + res.status + ' for ' + urls[i]);
        continue;
      }
      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }

  const embedded = getEmbeddedArticlesData();
  if (embedded) {
    console.warn('Using embedded archive data fallback:', lastError);
    return embedded;
  }

  throw lastError || new Error('articles.json not found');
}

function initTagFromUrl() {
  const tag = new URLSearchParams(window.location.search).get('tag');
  if (tag) currentTag = normalizeTag(tag);
}

function initFilters() {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => applyFilter(tab.dataset.filter));
  });

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      renderFeed();
    });
  }

  const randomBtn = document.getElementById('randomArchiveBtn');
  if (randomBtn && !randomBtn.dataset.boundRandom) {
    randomBtn.dataset.boundRandom = '1';
    randomBtn.addEventListener('click', pickRandomArticle);
  }

  const clearTagBtn = document.getElementById('clearTagFilter');
  if (clearTagBtn) {
    clearTagBtn.addEventListener('click', clearTagFilter);
  }

  document.addEventListener('click', event => {
    const tagBtn = event.target.closest('.article-tag[data-tag]');
    if (!tagBtn) return;
    event.preventDefault();
    event.stopPropagation();
    applyTagFilter(tagBtn.dataset.tag);
  });
}

async function loadArticles() {
  renderHeroStats([]);

  try {
    const data = await fetchArticlesJson();
    allArticles = (data.articles || []).sort((a, b) => b.date.localeCompare(a.date));
    filteredArticles = [...allArticles];
    renderHeroStats(allArticles);
    updateArchiveCount();
    renderFeatured(allArticles);
    refreshArticlesView();
  } catch (err) {
    console.error('Failed to load articles:', err);
    const heroStats = document.getElementById('heroStats');
    if (heroStats) {
      heroStats.textContent = currentLang === 'en'
        ? 'Failed to load archive data'
        : '档案数据加载失败';
    }
    document.getElementById('emptyState')?.classList.remove('hidden');
  }
}

function onLangChange(lang) {
  currentLang = lang;
  renderHeroStats(allArticles);
  renderFeatured(allArticles);
  refreshArticlesView();
}

function bootArchive() {
  initTagFromUrl();
  initFilters();
  loadArticles();
}

window.archiveOnLangChange = onLangChange;
window.archivePickRandom = pickRandomArticle;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootArchive);
} else {
  bootArchive();
}
