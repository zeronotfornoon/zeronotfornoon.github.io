const CATEGORY_LABELS = {
  research: { zh: '考据', en: 'Research' },
  interview: { zh: '采访', en: 'Interview' },
  news: { zh: '资讯', en: 'News' }
};

const PAGE_SIZE = 6;
let allArticles = [];
let filteredArticles = [];
let currentFilter = 'all';
let visibleCount = PAGE_SIZE;
let currentLang = 'zh';

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

function articleUrl(id) {
  return 'article.html?id=' + encodeURIComponent(id);
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

  featured.forEach((article, i) => {
    const card = document.createElement('a');
    card.className = 'featured-card' + (i === 0 ? ' featured-card-hero' : '');
    card.href = articleUrl(article.id);

    card.innerHTML =
      coverThumbHtml(article, 'featured-thumb', catLabel(article.category)) +
      '<div class="featured-body">' +
        '<span class="article-cat cat-' + article.category + '">' + catLabel(article.category) + '</span>' +
        '<h3 class="featured-title">' + article.title + '</h3>' +
        (i === 0 ? '<p class="featured-excerpt">' + article.excerpt + '</p>' : '') +
        '<div class="article-meta">' +
          '<span>' + article.author + '</span>' +
          '<span class="meta-sep">·</span>' +
          '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
        '</div>' +
      '</div>';

    grid.appendChild(card);
  });
}

function renderArticleItem(article) {
  const li = document.createElement('li');
  li.className = 'feed-item';

  const tagsHtml = (article.tags || [])
    .map(tag => '<span class="article-tag">#' + tag + '</span>')
    .join('');

  const coverBlock = article.cover
    ? '<div class="feed-cover has-cover"><img src="' +
        resolveArticleImage(article.id, article.cover) +
        '" alt="" loading="lazy" decoding="async"></div>'
    : '';

  li.innerHTML =
    '<a class="feed-link" href="' + articleUrl(article.id) + '">' +
      coverBlock +
      '<div class="feed-main">' +
        '<div class="feed-head">' +
          '<span class="article-cat cat-' + article.category + '">' + catLabel(article.category) + '</span>' +
          '<time class="feed-date" datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
        '</div>' +
        '<h3 class="feed-title">' + article.title + '</h3>' +
        '<p class="feed-excerpt">' + article.excerpt + '</p>' +
        '<div class="feed-foot">' +
          '<span class="feed-author">' + article.author + '</span>' +
          (tagsHtml ? '<div class="feed-tags">' + tagsHtml + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<span class="feed-arrow" aria-hidden="true">→</span>' +
    '</a>';

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
    loadMoreBtn?.classList.add('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  slice.forEach(article => list.appendChild(renderArticleItem(article)));

  if (visibleCount >= filteredArticles.length) {
    loadMoreBtn?.classList.add('hidden');
  } else {
    loadMoreBtn?.classList.remove('hidden');
  }
}

function applyFilter(filter) {
  currentFilter = filter;
  visibleCount = PAGE_SIZE;

  if (filter === 'all') {
    filteredArticles = [...allArticles];
  } else {
    filteredArticles = allArticles.filter(a => a.category === filter);
  }

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  renderFeed();
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
}

async function loadArticles() {
  try {
    const res = await fetch('data/articles.json');
    const data = await res.json();
    allArticles = (data.articles || []).sort((a, b) => b.date.localeCompare(a.date));
    filteredArticles = [...allArticles];
    renderFeatured(allArticles);
    renderFeed();
  } catch (err) {
    console.error('Failed to load articles:', err);
    document.getElementById('emptyState')?.classList.remove('hidden');
  }
}

function onLangChange(lang) {
  currentLang = lang;
  renderFeatured(allArticles);
  applyFilter(currentFilter);
}

window.archiveOnLangChange = onLangChange;

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  loadArticles();
});
