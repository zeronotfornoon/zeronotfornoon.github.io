const SITE_ORIGIN = 'https://weirdgamesclub.com';
const SITE_LANG_KEY = 'wgcSiteLang';

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

function applySiteLangVisibility(lang) {
  const isZH = normalizeSiteLang(lang) === 'zh';
  document.documentElement.lang = isZH ? 'zh' : 'en';

  const btnZH = document.getElementById('btnZH');
  const btnEN = document.getElementById('btnEN');
  if (btnZH) btnZH.classList.toggle('active', isZH);
  if (btnEN) btnEN.classList.toggle('active', !isZH);

  document.querySelectorAll('.lang-zh').forEach(el => el.classList.toggle('visible', isZH));
  document.querySelectorAll('.lang-en').forEach(el => el.classList.toggle('visible', !isZH));
  document.querySelectorAll('.lang-zh-inline').forEach(el => el.classList.toggle('visible', isZH));
  document.querySelectorAll('.lang-en-inline').forEach(el => el.classList.toggle('visible', !isZH));
  document.querySelectorAll('.lang-zh-flex').forEach(el => el.classList.toggle('visible', isZH));
  document.querySelectorAll('.lang-en-flex').forEach(el => el.classList.toggle('visible', !isZH));
}

function createSiteLangSetter(options) {
  const opts = options || {};
  return function setLang(lang) {
    lang = normalizeSiteLang(lang);
    saveSiteLang(lang);
    applySiteLangVisibility(lang);
    if (typeof opts.onChange === 'function') opts.onChange(lang);
  };
}

function initSiteLang(options) {
  const setLang = createSiteLangSetter(options);
  window.setLang = setLang;
  setLang(getSiteLang());
  return setLang;
}

if (typeof window !== 'undefined') {
  window.SITE_ORIGIN = SITE_ORIGIN;
  window.SITE_LANG_KEY = SITE_LANG_KEY;
  window.siteUrl = siteUrl;
  window.setSiteMeta = setSiteMeta;
  window.getSiteLang = getSiteLang;
  window.saveSiteLang = saveSiteLang;
  window.applySiteLangVisibility = applySiteLangVisibility;
  window.createSiteLangSetter = createSiteLangSetter;
  window.initSiteLang = initSiteLang;
}
