const HOME_NEWS_LIMIT = 4;
const HOME_REC_LIMIT = 3;

const HOME_CAT_LABELS = {
  research: {
    zh: '考据',
    en: 'Research',
    thumbZh: '游戏<br>考据',
    thumbEn: 'Research'
  },
  interview: {
    zh: '采访',
    en: 'Interview',
    thumbZh: '独家<br>采访',
    thumbEn: 'Interv.'
  },
  news: {
    zh: '资讯',
    en: 'News',
    thumbZh: '资讯',
    thumbEn: 'News'
  }
};

const carouselStates = {};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function articleUrl(id) {
  return 'article.html?id=' + encodeURIComponent(id);
}

function formatCarouselDate(dateStr, lang) {
  const d = new Date(dateStr + 'T12:00:00');
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getEmbeddedArticlesData() {
  const data = window.ARCHIVE_ARTICLES_DATA;
  if (!data || !Array.isArray(data.articles)) return null;
  return data.articles;
}

async function fetchHomeArticles() {
  const urls = [
    new URL('data/articles.json', window.location.href).href,
    new URL('./data/articles.json', window.location.href).href
  ];

  let lastError = null;
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetch(urls[i], { cache: 'no-store' });
      if (!res.ok) {
        lastError = new Error('HTTP ' + res.status);
        continue;
      }
      const data = await res.json();
      return (data.articles || []).sort(function(a, b) {
        return b.date.localeCompare(a.date);
      });
    } catch (err) {
      lastError = err;
    }
  }

  const embedded = getEmbeddedArticlesData();
  if (embedded) {
    return embedded.slice().sort(function(a, b) {
      return b.date.localeCompare(a.date);
    });
  }

  throw lastError || new Error('articles.json not found');
}

function pickNewsArticles(articles) {
  return articles.filter(function(a) { return a.category === 'news'; }).slice(0, HOME_NEWS_LIMIT);
}

function pickRecArticles(articles) {
  const picked = [];
  const seen = {};

  articles.filter(function(a) { return a.featured; }).forEach(function(article) {
    if (picked.length >= HOME_REC_LIMIT) return;
    picked.push(article);
    seen[article.id] = true;
  });

  articles.forEach(function(article) {
    if (picked.length >= HOME_REC_LIMIT) return;
    if (seen[article.id]) return;
    if (article.category === 'interview' || article.category === 'research') {
      picked.push(article);
      seen[article.id] = true;
    }
  });

  return picked.slice(0, HOME_REC_LIMIT);
}

function catMeta(category) {
  return HOME_CAT_LABELS[category] || HOME_CAT_LABELS.news;
}

function renderSlideThumb(article, thumbClass, useInnerWrapper) {
  const category = article.category || 'news';
  const cover = article.cover && typeof resolveArticleImage === 'function'
    ? resolveArticleImage(article.id, article.cover)
    : '';

  if (cover) {
    return (
      '<div class="' + thumbClass + ' has-cover-img tag-cat-' + category + '">' +
        '<img src="' + escapeHtml(cover) + '" alt="" loading="lazy" decoding="async">' +
      '</div>'
    );
  }

  const meta = catMeta(category);
  if (useInnerWrapper) {
    return (
      '<div class="' + thumbClass + '">' +
        '<div class="rec-slide-cover-inner tag-cat-' + category + '">' +
          '<span class="lang-zh-inline">' + meta.thumbZh + '</span>' +
          '<span class="lang-en-inline">' + meta.thumbEn + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  return (
    '<div class="' + thumbClass + ' tag-cat-' + category + '">' +
      '<span class="lang-zh-inline">' + meta.thumbZh + '</span>' +
      '<span class="lang-en-inline">' + meta.thumbEn + '</span>' +
    '</div>'
  );
}

function renderMainCover(article) {
  return renderSlideThumb(article, 'rec-slide-cover', true);
}

function renderMainSlide(article, isActive) {
  const meta = catMeta(article.category);
  return (
    '<a class="rec-slide' + (isActive ? ' active' : '') + '" href="' + articleUrl(article.id) + '">' +
      renderMainCover(article) +
      '<div class="rec-slide-info">' +
        '<span class="rec-cat-tag tag-cat-' + article.category + '">' +
          '<span class="lang-zh-inline">' + meta.zh + '</span>' +
          '<span class="lang-en-inline">' + meta.en + '</span>' +
        '</span>' +
        '<div class="rec-slide-title">' +
          '<span class="lang-zh-inline">' + escapeHtml(article.title) + '</span>' +
          '<span class="lang-en-inline">' + escapeHtml(article.title) + '</span>' +
        '</div>' +
        '<div class="rec-slide-meta">' +
          '<span class="lang-zh-inline">' + formatCarouselDate(article.date, 'zh') + '</span>' +
          '<span class="lang-en-inline">' + formatCarouselDate(article.date, 'en') + '</span>' +
        '</div>' +
      '</div>' +
    '</a>'
  );
}

function renderSideSlide(article, isActive) {
  const meta = catMeta(article.category);
  return (
    '<a class="rec-slide' + (isActive ? ' active' : '') + '" href="' + articleUrl(article.id) + '">' +
      renderSlideThumb(article, 'rec-slide-thumb', false) +
      '<div class="rec-slide-info">' +
        '<div class="rec-slide-title">' +
          '<span class="lang-zh-inline">' + escapeHtml(article.title) + '</span>' +
          '<span class="lang-en-inline">' + escapeHtml(article.title) + '</span>' +
        '</div>' +
        '<div class="rec-slide-meta">' +
          '<span class="lang-zh-inline">' + meta.zh + ' · ' + formatCarouselDate(article.date, 'zh') + '</span>' +
          '<span class="lang-en-inline">' + meta.en + ' · ' + formatCarouselDate(article.date, 'en') + '</span>' +
        '</div>' +
      '</div>' +
    '</a>'
  );
}

function renderEmptySlide(messageZh, messageEn) {
  return (
    '<div class="carousel-empty">' +
      '<span class="lang-zh-inline">' + messageZh + '</span>' +
      '<span class="lang-en-inline">' + messageEn + '</span>' +
    '</div>'
  );
}

function initCarousel(rootId, dotsId) {
  const root = document.getElementById(rootId);
  const dotsEl = document.getElementById(dotsId);
  if (!root || !dotsEl) return;

  const state = { index: 0, timer: null };
  const slides = function() {
    return root.querySelectorAll('.rec-slide');
  };

  function buildDots() {
    dotsEl.innerHTML = '';
    slides().forEach(function(_, i) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rec-carousel-dot' + (i === state.index ? ' active' : '');
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 条');
      dot.addEventListener('click', function() { go(i); });
      dotsEl.appendChild(dot);
    });
    dotsEl.style.display = slides().length > 1 ? '' : 'none';
  }

  function go(index) {
    const list = slides();
    if (!list.length) return;
    state.index = ((index % list.length) + list.length) % list.length;
    list.forEach(function(slide, i) {
      slide.classList.toggle('active', i === state.index);
    });
    dotsEl.querySelectorAll('.rec-carousel-dot').forEach(function(dot, i) {
      dot.classList.toggle('active', i === state.index);
    });
  }

  function move(step) {
    go(state.index + step);
    restart();
  }

  function restart() {
    if (state.timer) clearInterval(state.timer);
    if (slides().length > 1) {
      state.timer = setInterval(function() { move(1); }, 6000);
    }
  }

  carouselStates[rootId] = { move: move };
  buildDots();
  go(0);
  restart();

  root.querySelectorAll('.rec-carousel-btn').forEach(function(btn) {
    btn.style.display = slides().length > 1 ? '' : 'none';
  });
}

async function bootHomeCarousels() {
  const newsTrack = document.querySelector('#newsCarousel .rec-carousel-track');
  const recTrack = document.querySelector('#recCarousel .rec-carousel-track');
  if (!newsTrack || !recTrack) return;

  try {
    const articles = await fetchHomeArticles();
    const news = pickNewsArticles(articles);
    const rec = pickRecArticles(articles);

    newsTrack.innerHTML = news.length
      ? news.map(function(article, index) { return renderMainSlide(article, index === 0); }).join('')
      : renderEmptySlide('暂无资讯动态', 'No news yet');

    recTrack.innerHTML = rec.length
      ? rec.map(function(article, index) { return renderSideSlide(article, index === 0); }).join('')
      : renderEmptySlide('暂无推荐内容', 'Nothing to recommend yet');
  } catch (err) {
    console.error('Failed to load home carousels:', err);
    newsTrack.innerHTML = renderEmptySlide('资讯加载失败', 'Failed to load news');
    recTrack.innerHTML = renderEmptySlide('推荐加载失败', 'Failed to load picks');
  }

  if (typeof applySiteLangVisibility === 'function' && typeof getSiteLang === 'function') {
    applySiteLangVisibility(getSiteLang());
  }

  initCarousel('newsCarousel', 'newsCarouselDots');
  initCarousel('recCarousel', 'recCarouselDots');
}

window.moveNewsCarousel = function(step) {
  carouselStates.newsCarousel && carouselStates.newsCarousel.move(step);
};

window.moveRecCarousel = function(step) {
  carouselStates.recCarousel && carouselStates.recCarousel.move(step);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeCarousels);
} else {
  bootHomeCarousels();
}
