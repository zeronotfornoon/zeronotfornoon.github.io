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

let currentLang = 'zh';
let currentArticle = null;
let currentBodyHtml = '';

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
  document.getElementById('articleBody').innerHTML = bodyHtml;

  const tagsEl = document.getElementById('articleTags');
  tagsEl.innerHTML = '';
  const tags = article.tags || [];
  if (tags.length) {
    tagsEl.style.display = '';
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'article-tag';
      span.textContent = '#' + tag;
      tagsEl.appendChild(span);
    });
  } else {
    tagsEl.style.display = 'none';
  }
}

function renderNotFound() {
  currentArticle = null;
  const msg = NOT_FOUND[currentLang];
  document.getElementById('articleCover')?.classList.add('hidden');
  document.getElementById('articleTitle').textContent = msg.title;
  document.getElementById('articleMeta').style.display = 'none';
  document.getElementById('articleTags').innerHTML = '';
  document.getElementById('articleTags').style.display = 'none';
  document.getElementById('articleBody').innerHTML = msg.body;
}

async function loadArticle() {
  const id = getArticleId();
  if (!id) {
    renderNotFound();
    return;
  }

  try {
    const res = await fetch('articles/' + encodeURIComponent(id) + '.md');
    if (!res.ok) {
      renderNotFound();
      return;
    }

    const text = await res.text();
    const { meta, body } = parseArticleMd(text);

    const article = {
      id: meta.id || id,
      category: meta.category || 'news',
      date: meta.date || '',
      author: meta.author || '异味游戏同好会',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      title: meta.title || id,
      excerpt: meta.excerpt || '',
      cover: meta.cover || ''
    };

    const resolvedBody = resolveBodyImages(body, article.id);
    renderArticle(article, renderMarkdown(resolvedBody));
  } catch (err) {
    console.error('Failed to load article:', err);
    renderNotFound();
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
