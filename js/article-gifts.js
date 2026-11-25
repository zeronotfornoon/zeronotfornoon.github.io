(function () {
  var articleId = '';
  var turnstileWidgetId = null;
  var turnstileToken = '';

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    var el = $('giftStatus');
    if (el) el.textContent = text || '';
  }

  function articleTitle(id) {
    var list = (window.ARCHIVE_ARTICLES_DATA && window.ARCHIVE_ARTICLES_DATA.articles) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].title;
    }
    return id;
  }

  function renderTotals(totals) {
    totals = totals || {};
    $('giftBranchTotal').textContent = String(totals['树枝'] || 0);
    $('giftBerryTotal').textContent = String(totals['浆果'] || 0);
  }

  function renderBoard(rows) {
    var ol = $('giftBoard');
    if (!ol) return;
    ol.innerHTML = '';
    if (!rows || !rows.length) {
      ol.innerHTML = '<li>还没有人投喂。</li>';
      return;
    }
    rows.forEach(function (row) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = 'article.html?id=' + encodeURIComponent(row.article_id);
      a.textContent = articleTitle(row.article_id);
      li.appendChild(a);
      li.appendChild(document.createTextNode(
        ' · 树枝 ' + (row.branches || 0) + ' · 浆果 ' + (row.berries || 0)
      ));
      ol.appendChild(li);
    });
  }

  async function loadPublic() {
    if (!window.WGCApi || !WGCApi.enabled() || !articleId) return;
    try {
      var totals = await WGCApi.fetchArticleGifts(articleId);
      renderTotals(totals.totals);
      var board = await WGCApi.fetchGiftLeaderboard(8);
      renderBoard(board.leaderboard);
    } catch (err) {
      setStatus(err.message || '榜单加载失败');
    }
  }

  function showLoggedOut() {
    $('giftAuth').classList.remove('hidden');
    $('giftActions').classList.add('hidden');
  }

  function showLoggedIn(user, backpack) {
    $('giftAuth').classList.add('hidden');
    $('giftActions').classList.remove('hidden');
    var name = (user && (user.displayName || user.email)) || '已登录';
    $('giftWho').textContent = name;
    var pack = backpack || {};
    $('giftPack').textContent = '背包：树枝 ' + (pack['树枝'] || 0) + ' · 浆果 ' + (pack['浆果'] || 0);
    var box = $('giftSubscribe');
    if (box) {
      box.checked = !!(user && user.notifyOptIn);
      box.disabled = false;
    }
    ensureTurnstile();
  }

  async function onSubscribeChange() {
    var box = $('giftSubscribe');
    if (!box || !window.WGCApi) return;
    var want = box.checked;
    box.disabled = true;
    try {
      await WGCApi.setSubscription(want);
      setStatus(want ? '已订阅。之后有新文章会发到你的登录邮箱。' : '已取消订阅，之后不会发更新邮件。');
    } catch (err) {
      box.checked = !want;
      setStatus((err.data && err.data.error) || err.message || '订阅设置失败');
    } finally {
      box.disabled = false;
    }
  }

  async function refreshSession() {
    if (!window.WGCApi || !WGCApi.enabled() || !WGCApi.getToken()) {
      showLoggedOut();
      return;
    }
    try {
      var me = await WGCApi.fetchMe();
      await migrateLocalWilds();
      var wilds = await WGCApi.fetchWilds();
      var backpack = (wilds.state && wilds.state.backpack) || {};
      showLoggedIn(me.user, backpack);
    } catch (err) {
      WGCApi.clearSession();
      showLoggedOut();
      setStatus(err.message || '登录已失效，请重新登录');
    }
  }

  async function migrateLocalWilds() {
    try {
      var raw = localStorage.getItem('humidWildsState');
      if (!raw) return;
      await WGCApi.migrateWildsFromLocal(JSON.parse(raw));
    } catch (e) { /* 云端已有背包时会拒绝覆盖，忽略即可 */ }
  }

  function ensureTurnstile() {
    if (turnstileWidgetId != null) return;
    var cfg = window.WGC_CONFIG || {};
    if (!cfg.turnstileSiteKey || cfg.turnstileSiteKey.indexOf('REPLACE') === 0) return;
    if (!window.turnstile) {
      setTimeout(ensureTurnstile, 400);
      return;
    }
    turnstileWidgetId = window.turnstile.render('#wgcTurnstile', {
      sitekey: cfg.turnstileSiteKey,
      callback: function (token) { turnstileToken = token; },
      'expired-callback': function () { turnstileToken = ''; },
      'error-callback': function () { turnstileToken = ''; }
    });
  }

  async function sendCode() {
    var email = $('giftEmail').value.trim();
    setStatus('正在发送验证码…');
    try {
      await WGCApi.requestEmailCode(email);
      setStatus('验证码已发送，请查收邮箱。');
    } catch (err) {
      setStatus((err.data && err.data.hint) || err.message || '发送失败');
    }
  }

  async function login() {
    var email = $('giftEmail').value.trim();
    var code = $('giftCode').value.trim();
    var name = $('giftName').value.trim();
    setStatus('正在登录…');
    try {
      await WGCApi.verifyEmailCode(email, code, { displayName: name });
      setStatus('登录成功。');
      await refreshSession();
    } catch (err) {
      setStatus(err.message || '登录失败');
    }
  }

  async function gift(item) {
    if (!turnstileToken) {
      setStatus('请先完成下方的人机验证。');
      ensureTurnstile();
      return;
    }
    setStatus('正在投喂…');
    try {
      var result = await WGCApi.giftArticle(articleId, item, 1, turnstileToken);
      renderTotals(result.articleTotals);
      turnstileToken = '';
      if (window.turnstile && turnstileWidgetId != null) window.turnstile.reset(turnstileWidgetId);
      setStatus('已投出 1 ' + (item === '树枝' ? '根树枝' : '颗浆果') + '。');
      await refreshSession();
      await loadPublic();
    } catch (err) {
      setStatus((err.data && err.data.error) || err.message || '投喂失败');
    }
  }

  function bind() {
    $('giftSendCode').addEventListener('click', sendCode);
    $('giftLogin').addEventListener('click', login);
    $('giftLogout').addEventListener('click', function () {
      WGCApi.clearSession();
      showLoggedOut();
      setStatus('已退出。');
    });
    var sub = $('giftSubscribe');
    if (sub) sub.addEventListener('change', onSubscribeChange);
    $('giftBranchBtn').addEventListener('click', function () { gift('树枝'); });
    $('giftBerryBtn').addEventListener('click', function () { gift('浆果'); });
  }

  window.ArticleGifts = {
    open: function (id) {
      articleId = id || '';
      loadPublic();
      refreshSession();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
