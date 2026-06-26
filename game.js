let currentGame = null;
let allArticlesIndex = [];

const ARCHIVE_CATEGORY_LABELS = {
  research: { zh: '考据', en: 'Research' },
  interview: { zh: '采访', en: 'Interview' },
  news: { zh: '资讯', en: 'News' }
};

function archiveCatLabel(category) {
  const labels = ARCHIVE_CATEGORY_LABELS[category];
  return labels ? labels[currentLang] : category;
}

function formatArchiveDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (currentLang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
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

function getArticlesForGame(gameId) {
  return allArticlesIndex.filter(article => {
    return (article.games || []).some(id => String(id) === String(gameId));
  });
}

function renderDescriptionHtml(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

function renderRelatedArticles(gameId) {
  const section = document.getElementById('gameRelatedArticles');
  const list = document.getElementById('gameRelatedList');
  if (!section || !list) return;

  const related = getArticlesForGame(gameId);
  if (!related.length) {
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  list.innerHTML = related.map(article => {
    return (
      '<a class="game-related-card" href="' + articleUrl(article.id) + '">' +
        '<span class="game-related-cat cat-' + escapeHtml(article.category) + '">' +
          escapeHtml(archiveCatLabel(article.category)) +
        '</span>' +
        '<span class="game-related-title">' + escapeHtml(article.title) + '</span>' +
        '<span class="game-related-date">' + escapeHtml(formatArchiveDate(article.date)) + '</span>' +
      '</a>'
    );
  }).join('');

  section.classList.remove('hidden');
}

function renderGameDetail() {
  const wrap = document.getElementById('gameDetail');
  const empty = document.getElementById('gameNotFound');
  if (!wrap) return;

  if (!currentGame) {
    wrap.classList.add('hidden');
    empty?.classList.remove('hidden');
    document.getElementById('gameRelatedArticles')?.classList.add('hidden');
    document.title = currentLang === 'en'
      ? 'Game Not Found — Weird Games Club'
      : '未找到游戏 — Weird Games Club';
    return;
  }

  wrap.classList.remove('hidden');
  empty?.classList.add('hidden');

  const title = gameText(currentGame, 'title');
  document.title = title + ' — Weird Games Club';

  if (typeof setSiteMeta === 'function') {
    setSiteMeta({
      path: 'game.html?id=' + currentGame.id,
      title: title + ' — Weird Games Club',
      description: gameText(currentGame, 'excerpt')
    });
  }

  const labelEl = document.getElementById('gameDetailLabel');
  if (labelEl) {
    const listed = isGameListed(currentGame);
    labelEl.innerHTML = listed
      ? '<span class="lang-zh-inline">合作收录</span><span class="lang-en-inline">Supported</span>'
      : '<span class="lang-zh-inline">档案关联</span><span class="lang-en-inline">In the Archives</span>';
  }

  const mediaEl = document.getElementById('gameDetailMedia');
  const titleEl = document.getElementById('gameDetailTitle');
  const descEl = document.getElementById('gameDetailDesc');
  const steamEl = document.getElementById('gameSteamLink');

  if (mediaEl) {
    mediaEl.innerHTML = renderCoverHtml(currentGame, 'game-detail-cover');
  }
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (descEl) {
    descEl.innerHTML = renderDescriptionHtml(gameText(currentGame, 'description'));
  }
  if (steamEl) {
    steamEl.href = currentGame.steamUrl || '#';
    steamEl.classList.toggle('is-disabled', !currentGame.steamUrl);
  }

  renderRelatedArticles(currentGame.id);
}

window.gamesRerenderDetail = renderGameDetail;

async function bootGamePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  try {
    await loadAllGames();
  } catch (err) {
    console.warn('Using embedded games for detail page:', err);
  }

  try {
    allArticlesIndex = await fetchArticlesIndex();
  } catch (err) {
    console.warn('Article index unavailable for related archives:', err);
    allArticlesIndex = [];
  }

  currentGame = findGameById(id);
  renderGameDetail();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGamePage);
} else {
  bootGamePage();
}
