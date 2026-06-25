const SITE_ORIGIN = 'https://weirdgamesclub.com';
const SITE_LANG_KEY = 'wgcSiteLang';

function normalizeSiteLang(lang) {
  return lang === 'en' ? 'en' : 'zh';
}

function getSiteLang() {
  try {
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (e) { /* ignore */ }
  return 'zh';
}

function saveSiteLang(lang) {
  try {
    localStorage.setItem(SITE_LANG_KEY, normalizeSiteLang(lang));
  } catch (e) { /* ignore */ }
}

(function injectSiteLangCss() {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = getSiteLang();

  const style = document.createElement('style');
  style.id = 'site-lang-css';
  style.textContent = [
    'html[lang="zh"] .lang-zh-inline { display: inline !important; }',
    'html[lang="en"] .lang-en-inline { display: inline !important; }',
    'html[lang="zh"] .lang-zh { display: block !important; }',
    'html[lang="en"] .lang-en { display: block !important; }',
    'html[lang="zh"] .lang-zh-flex { display: flex !important; }',
    'html[lang="en"] .lang-en-flex { display: flex !important; }',
    'html[lang="zh"] .side-char-card .side-char-badge.lang-zh { display: inline-flex !important; }',
    'html[lang="en"] .side-char-card .side-char-badge.lang-en { display: inline-flex !important; }',
    'html[lang="zh"] .nav-card .nav-card-desc.lang-zh { display: block !important; }',
    'html[lang="en"] .nav-card .nav-card-desc.lang-en { display: block !important; }',
    'html[lang="zh"] .nav-card .nav-card-en.lang-zh { display: block !important; }',
    'html[lang="zh"] .lang-en-inline, html[lang="zh"] .lang-en, html[lang="zh"] .lang-en-flex,',
    'html[lang="zh"] .nav-card .nav-card-desc.lang-en, html[lang="zh"] .side-char-card .side-char-badge.lang-en { display: none !important; }',
    'html[lang="en"] .lang-zh-inline, html[lang="en"] .lang-zh, html[lang="en"] .lang-zh-flex,',
    'html[lang="en"] .nav-card .nav-card-desc.lang-zh, html[lang="en"] .nav-card .nav-card-en.lang-zh,',
    'html[lang="en"] .side-char-card .side-char-badge.lang-zh { display: none !important; }'
  ].join('\n');
  document.head.appendChild(style);
})();

const siteLangHooks = [];

function registerSiteLangHook(fn) {
  if (typeof fn !== 'function') return;
  siteLangHooks.push(fn);
  if (window.__siteLangBooted) {
    fn(getSiteLang());
  }
}

function runSiteLangHooks(lang) {
  siteLangHooks.forEach(function(fn) {
    try { fn(lang); } catch (e) { console.error(e); }
  });
}

function applySiteLangVisibility(lang) {
  const normalized = normalizeSiteLang(lang);
  document.documentElement.lang = normalized;

  const isZH = normalized === 'zh';
  const btnZH = document.getElementById('btnZH');
  const btnEN = document.getElementById('btnEN');
  if (btnZH) btnZH.classList.toggle('active', isZH);
  if (btnEN) btnEN.classList.toggle('active', !isZH);
}

function setLang(lang) {
  lang = normalizeSiteLang(lang);
  saveSiteLang(lang);
  applySiteLangVisibility(lang);
  runSiteLangHooks(lang);
}

function initSiteLang(options) {
  if (options && typeof options.onChange === 'function') {
    registerSiteLangHook(options.onChange);
  }
}

function bootSiteLang() {
  if (window.__siteLangBooted) return;
  window.__siteLangBooted = true;
  applySiteLangVisibility(getSiteLang());
  runSiteLangHooks(getSiteLang());
}

function siteUrl(path) {
  if (!path || path === '/') return SITE_ORIGIN + '/';
  return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path);
}

function setSiteMeta(options) {
  const opts = options || {};
  const path = opts.path || window.location.pathname.replace(/^\//, '') || '';
  const url = opts.url || siteUrl(path);
  const title = opts.title || document.title;
  const description = opts.description || '';
  const image = opts.image ? (opts.image.startsWith('http') ? opts.image : siteUrl(opts.image)) : siteUrl('logo2.png');

  document.title = title;

  function upsertMeta(attr, key, content) {
    if (!content) return;
    let el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:type', opts.type || 'website');
  upsertMeta('property', 'og:site_name', '异味游戏同好会 Weird Games Club');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:locale', document.documentElement.lang === 'en' ? 'en_US' : 'zh_CN');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
}

if (typeof window !== 'undefined') {
  window.setLang = setLang;
  window.SITE_ORIGIN = SITE_ORIGIN;
  window.SITE_LANG_KEY = SITE_LANG_KEY;
  window.siteUrl = siteUrl;
  window.setSiteMeta = setSiteMeta;
  window.getSiteLang = getSiteLang;
  window.saveSiteLang = saveSiteLang;
  window.applySiteLangVisibility = applySiteLangVisibility;
  window.initSiteLang = initSiteLang;
  window.registerSiteLangHook = registerSiteLangHook;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSiteLang);
  } else {
    bootSiteLang();
  }
}
