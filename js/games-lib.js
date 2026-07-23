let allGames = [];
let gamesLibLang = 'zh';

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

function isGameListed(game) {
  return game && game.listed !== false;
}

/** incubated | collab | published — default collab for older entries */
function getGameRole(game) {
  const role = String((game && game.role) || '').trim().toLowerCase();
  if (role === 'incubated' || role === 'published' || role === 'collab') return role;
  return 'collab';
}

var GAME_ROLE_META = {
  incubated: {
    zh: '野菌计划',
    en: 'Mushroom Land',
    badgeZh: '野菌计划',
    badgeEn: 'Mushroom Land',
    descZh: '同好会挑选并孵化的异味独游：多为免费游戏、免费本地化；不一定挂名发行，部分仅做本地化与宣传，部分会由同好会发行。爱发电打赏回流用于发行。',
    descEn: 'Weird indies we incubate — often free games with free localization. Not always published by us: some get loc & promo only; some we publish. Afdian tips help fund publishing.'
  },
  collab: {
    zh: '本地化与推广',
    en: 'Localization & Promo',
    badgeZh: '本地化与推广',
    badgeEn: 'Loc & Promo',
    descZh: '与开发者/发行方的商务合作：同好会提供付费本地化，及/或宣传推荐；发行方仍是对方，不是同好会挂名发行。',
    descEn: 'Paid localization and/or promotional partnerships. We translate and/or help promote; the other party remains the publisher of record.'
  },
  published: {
    zh: '同好会发行',
    en: 'Published by Us',
    badgeZh: '同好会发行',
    badgeEn: 'Published',
    descZh: '由异味游戏同好会作为发行方正式上架的作品——厂牌自主发行线。',
    descEn: 'Games published by Weird Games Club as the publisher of record.'
  }
};

var GAME_ROLE_ORDER = ['incubated', 'collab', 'published'];

function getGameRoleMeta(role) {
  return GAME_ROLE_META[role] || GAME_ROLE_META.collab;
}

function getAllGamesPool() {
  if (allGames.length) return allGames;
  const embedded = getEmbeddedGamesData();
  return embedded ? embedded.games : [];
}

function getListedGames(games) {
  return (games || getAllGamesPool()).filter(isGameListed);
}

function getListedGamesByRole(role, games) {
  return getListedGames(games).filter(function(game) {
    return getGameRole(game) === role;
  });
}

function findGameById(id) {
  const needle = String(id || '').trim();
  if (!needle) return null;
  return getAllGamesPool().find(game => game.id === needle) || null;
}

function findGamesByIds(ids) {
  return (ids || [])
    .map(id => findGameById(id))
    .filter(Boolean);
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
  if (gamesLibLang === 'en') {
    return game[enKey] || game[zhKey] || '';
  }
  return game[zhKey] || game[enKey] || '';
}

function getRandomGamePool() {
  return getListedGames();
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
    window.alert(gamesLibLang === 'en'
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
  const count = getListedGames().length;
  document.querySelectorAll('.games-count').forEach(el => {
    el.textContent = String(count);
  });
}

function renderHeroStats() {
  const el = document.getElementById('heroStats');
  if (!el) return;

  const listed = getListedGames();
  if (!listed.length && !getAllGamesPool().length) {
    el.textContent = gamesLibLang === 'en' ? 'Loading games…' : '游戏加载中……';
    return;
  }

  const total = listed.length;
  if (gamesLibLang === 'en') {
    el.innerHTML =
      '<span>' + total + ' title' + (total === 1 ? '' : 's') + '</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>Mushroom Land · Loc &amp; Promo · Publishing</span>';
    return;
  }

  el.innerHTML =
    '<span>' + total + ' 款收录</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>野菌计划 · 本地化与推广 · 同好会发行</span>';
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
  gamesLibLang = lang;
  renderHeroStats();
  if (window.gamesRerenderList) window.gamesRerenderList();
  if (window.gamesRerenderDetail) window.gamesRerenderDetail();
};

window.gamesPickRandom = pickRandomGame;
window.isGameListed = isGameListed;
window.getGameRole = getGameRole;
window.getGameRoleMeta = getGameRoleMeta;
window.GAME_ROLE_ORDER = GAME_ROLE_ORDER;
window.getListedGames = getListedGames;
window.getListedGamesByRole = getListedGamesByRole;
window.findGameById = findGameById;
window.findGamesByIds = findGamesByIds;
