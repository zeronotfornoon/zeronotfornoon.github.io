(function (global) {
  'use strict';

  const TOKEN_KEY = 'wgcAuthToken';
  const USER_KEY = 'wgcAuthUser';

  function config() {
    return global.WGC_CONFIG || {};
  }

  function apiBase() {
    const base = (config().apiBase || '').replace(/\/$/, '');
    return base;
  }

  function enabled() {
    return !!apiBase();
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function saveSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    } catch (e) { /* ignore */ }
  }

  async function apiFetch(path, options) {
    if (!enabled()) {
      throw new Error('WGC API 未配置：请加载 js/wgc-config.js');
    }
    const url = apiBase() + path;
    const headers = new Headers(options && options.headers);
    if (!headers.has('Content-Type') && options && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    const token = getToken();
    if (token) headers.set('Authorization', 'Bearer ' + token);
    const res = await fetch(url, Object.assign({}, options, { headers }));
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = { ok: false, error: 'invalid_json' };
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function requestEmailCode(email) {
    return apiFetch('/v1/auth/email/request', {
      method: 'POST',
      body: JSON.stringify({ email: email })
    });
  }

  async function verifyEmailCode(email, code, profile) {
    const data = await apiFetch('/v1/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        code: code,
        displayName: profile && profile.displayName,
        avatarKey: profile && profile.avatarKey
      })
    });
    if (data.token) saveSession(data.token, data.user);
    return data;
  }

  async function fetchMe() {
    return apiFetch('/v1/auth/me', { method: 'GET' });
  }

  async function setSubscription(subscribed) {
    const data = await apiFetch('/v1/me/subscription', {
      method: 'POST',
      body: JSON.stringify({ subscribed: !!subscribed })
    });
    const user = getUser() || {};
    user.notifyOptIn = !!(data && data.subscribed);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) { /* ignore */ }
    return data;
  }

  async function fetchWilds() {
    return apiFetch('/v1/me/wilds', { method: 'GET' });
  }

  async function migrateWildsFromLocal(localState) {
    return apiFetch('/v1/me/wilds/migrate', {
      method: 'POST',
      body: JSON.stringify({ state: localState })
    });
  }

  async function giftArticle(articleId, item, qty, turnstileToken) {
    const headers = {};
    if (turnstileToken) headers['X-Turnstile-Token'] = turnstileToken;
    headers['Idempotency-Key'] = crypto.randomUUID();
    return apiFetch('/v1/articles/' + encodeURIComponent(articleId) + '/gift', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ item: item, qty: qty || 1 })
    });
  }

  async function fetchArticleGifts(articleId) {
    return apiFetch('/v1/articles/' + encodeURIComponent(articleId) + '/gifts', {
      method: 'GET'
    });
  }

  async function fetchGiftLeaderboard(limit) {
    const q = limit ? '?limit=' + encodeURIComponent(limit) : '';
    return apiFetch('/v1/leaderboard/articles' + q, { method: 'GET' });
  }

  global.WGCApi = {
    enabled: enabled,
    getToken: getToken,
    getUser: getUser,
    clearSession: clearSession,
    requestEmailCode: requestEmailCode,
    verifyEmailCode: verifyEmailCode,
    fetchMe: fetchMe,
    setSubscription: setSubscription,
    fetchWilds: fetchWilds,
    migrateWildsFromLocal: migrateWildsFromLocal,
    giftArticle: giftArticle,
    fetchArticleGifts: fetchArticleGifts,
    fetchGiftLeaderboard: fetchGiftLeaderboard
  };
})(typeof window !== 'undefined' ? window : globalThis);