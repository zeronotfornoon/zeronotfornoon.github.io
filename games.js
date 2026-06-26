function renderGameCards() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!allGames.length) {
    grid.innerHTML =
      '<div class="games-empty">' +
        (currentLang === 'en' ? 'No games yet…' : '暂无合作游戏……') +
      '</div>';
    return;
  }

  const listedGames = getListedGames(allGames);
  if (!listedGames.length) {
    grid.innerHTML =
      '<div class="games-empty">' +
        (currentLang === 'en' ? 'No supported games listed yet…' : '暂无合作游戏……') +
      '</div>';
    return;
  }

  listedGames.forEach(game => {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = gameUrl(game.id);
    card.innerHTML =
      renderCoverHtml(game, 'game-card-cover') +
      '<div class="game-card-body">' +
        '<h2 class="game-card-title">' + escapeHtml(gameText(game, 'title')) + '</h2>' +
        '<p class="game-card-excerpt">' + escapeHtml(gameText(game, 'excerpt')) + '</p>' +
        '<span class="game-card-arrow" aria-hidden="true">→</span>' +
      '</div>';
    grid.appendChild(card);
  });
}

window.gamesRerenderList = renderGameCards;

function initRandomButton() {
  const btn = document.getElementById('randomGameBtn');
  if (btn && !btn.dataset.boundRandom) {
    btn.dataset.boundRandom = '1';
    btn.addEventListener('click', pickRandomGame);
  }
}

async function bootGamesPage() {
  renderHeroStats();
  initRandomButton();

  try {
    await loadAllGames();
    updateGameCount();
    renderHeroStats();
    renderGameCards();
  } catch (err) {
    console.error('Failed to load games:', err);
    const heroStats = document.getElementById('heroStats');
    if (heroStats) {
      heroStats.textContent = currentLang === 'en'
        ? 'Failed to load game data'
        : '游戏数据加载失败';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGamesPage);
} else {
  bootGamesPage();
}
