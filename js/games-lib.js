let allGames = [];
let currentLang = 'zh';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEmbeddedGamesData() {
  const data = window.GAMES_DATA;
  if (!data || !Array.isArray(data.games) || !data.games.length) return null;
  return data;
}

function gameUrl(id) {
  return 'game.html?id=' + encodeURIComponent(id);
}

function gameCoverUrl(game) {
  const cover = String(game.cover || '').trim();
  if (!cover) return '';
  if (/^(https?:|\/|images\/|data:)/i.test(cover)) return cover;
  return 'images/games/' + game.id + '/' + cover.replace(/^\.\//, '');
}

function gameText(game, field) {
  const zhKey = field + 'Zh';
  const enKey = field + 'En';
  if (currentLang === 'en') {
    return game[enKey] || game[zhKey] || '';
  }
  return game[zhKey] || game[enKey] || '';
}

function getRandomGamePool() {
  if (allGames.length) return allGames;
  const embedded = getEmbeddedGamesData();
  return embedded ? embedded.games : [];
}

let randomGameLock = false;

function pickRandomGame(event) {
  if (randomGameLock) return false;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const pool = getRandomGamePool();
  if (!pool.length) {
    window.alert(currentLang === 'en'
      ? 'Game data is unavailable. Please refresh the page.'
      : '游戏数据不可用，请刷新页面后重试。');
    return false;
  }

  randomGameLock = true;
  const game = pool[Math.floor(Math.random() * pool.length)];
  window.location.assign(gameUrl(game.id));
  return false;
}

async function fetchGamesJson() {
  const urls = [
    new URL('data/games.json', window.location.href).href,
    new URL('./data/games.json', window.location.href).href
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

  const embedded = getEmbeddedGamesData();
  if (embedded) {
    console.warn('Using embedded games data fallback:', lastError);
    return embedded;
  }

  throw lastError || new Error('games.json not found');
}

async function loadAllGames() {
  const data = await fetchGamesJson();
  allGames = data.games || [];
  return allGames;
}

function updateGameCount() {
  document.querySelectorAll('.games-count').forEach(el => {
    el.textContent = String(allGames.length);
  });
}

function renderHeroStats() {
  const el = document.getElementById('heroStats');
  if (!el) return;

  if (!allGames.length) {
    el.textContent = currentLang === 'en' ? 'Loading games…' : '游戏加载中……';
    return;
  }

  const total = allGames.length;
  if (currentLang === 'en') {
    el.innerHTML =
      '<span>' + total + ' supported game' + (total === 1 ? '' : 's') + '</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>Curated weird picks</span>';
    return;
  }

  el.innerHTML =
    '<span>' + total + ' 款合作游戏</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>异味优选收录</span>';
}

function renderDefaultCoverHtml(game, className) {
  const label = escapeHtml(gameText(game, 'title').slice(0, 2) || '?');
  return (
    '<div class="' + className + ' game-cover-placeholder" aria-hidden="true">' +
      '<span class="game-cover-placeholder-mark">' + label + '</span>' +
    '</div>'
  );
}

function renderCoverHtml(game, className) {
  const src = gameCoverUrl(game);
  if (src) {
    return (
      '<div class="' + className + ' has-cover">' +
        '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" decoding="async">' +
      '</div>'
    );
  }
  return renderDefaultCoverHtml(game, className);
}

window.gamesOnLangChange = function gamesOnLangChange(lang) {
  currentLang = lang;
  renderHeroStats();
  if (window.gamesRerenderList) window.gamesRerenderList();
  if (window.gamesRerenderDetail) window.gamesRerenderDetail();
};

window.gamesPickRandom = pickRandomGame;
