let currentGame = null;

function findGameById(id) {
  const needle = String(id || '').trim();
  if (!needle) return null;
  if (allGames.length) {
    return allGames.find(game => game.id === needle) || null;
  }
  const embedded = getEmbeddedGamesData();
  if (!embedded) return null;
  return embedded.games.find(game => game.id === needle) || null;
}

function renderDescriptionHtml(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

function renderGameDetail() {
  const wrap = document.getElementById('gameDetail');
  const empty = document.getElementById('gameNotFound');
  if (!wrap) return;

  if (!currentGame) {
    wrap.classList.add('hidden');
    empty?.classList.remove('hidden');
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

  currentGame = findGameById(id);
  renderGameDetail();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGamePage);
} else {
  bootGamePage();
}
