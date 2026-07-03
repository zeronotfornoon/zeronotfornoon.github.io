let allProjects = [];
let portfolioLang = 'zh';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEmbeddedPortfolioData() {
  const data = window.PORTFOLIO_DATA;
  if (!data || !Array.isArray(data.projects) || !data.projects.length) return null;
  return data;
}

function isProjectListed(project) {
  return project && project.listed !== false;
}

function getAllProjectsPool() {
  if (allProjects.length) return allProjects;
  const embedded = getEmbeddedPortfolioData();
  return embedded ? embedded.projects : [];
}

function getListedProjects(projects) {
  return (projects || getAllProjectsPool()).filter(isProjectListed);
}

const PORTFOLIO_CATEGORIES = [
  {
    id: 'solo',
    titleZh: '个人独立翻译',
    titleEn: 'Solo Translation',
    descZh: '由本人独立完成翻译（可含润色）的项目。',
    descEn: 'Projects where you handled the full translation yourself (polish included).'
  },
  {
    id: 'collab',
    titleZh: '与人合作翻译',
    titleEn: 'Collaborative Translation',
    descZh: '与其他译者、编辑或团队分工协作的翻译项目。',
    descEn: 'Translation work shared with other translators, editors, or teams.'
  },
  {
    id: 'lqa',
    titleZh: '仅负责 LQA',
    titleEn: 'LQA Only',
    descZh: '不参与主翻，仅负责 LQA、审校或质检的项目。',
    descEn: 'Projects where you contributed LQA, review, or QA only — not main translation.'
  }
];

function getProjectsByCategory(categoryId) {
  return getListedProjects().filter(project => {
    const cat = String(project.category || 'solo').trim();
    return cat === categoryId;
  });
}

function projectText(project, field) {
  const zhKey = field + 'Zh';
  const enKey = field + 'En';
  if (portfolioLang === 'en') {
    return project[enKey] || project[zhKey] || '';
  }
  return project[zhKey] || project[enKey] || '';
}

function projectCoverUrl(project) {
  const cover = String(project.cover || '').trim();
  if (!cover) return '';
  if (/^(https?:|\/|images\/|data:)/i.test(cover)) return cover;
  return 'images/portfolio/' + project.id + '/' + cover.replace(/^\.\//, '');
}

function renderProjectCoverHtml(project, className) {
  const url = projectCoverUrl(project);
  if (url) {
    return '<div class="' + className + '">' +
      '<img src="' + escapeHtml(url) + '" alt="" loading="lazy">' +
    '</div>';
  }
  return '<div class="' + className + ' project-cover-placeholder">' +
    '<span class="project-cover-placeholder-mark">WORK</span>' +
  '</div>';
}

async function fetchPortfolioJson() {
  const urls = ['data/portfolio.json'];

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

  const embedded = getEmbeddedPortfolioData();
  if (embedded) {
    console.warn('Using embedded portfolio data fallback:', lastError);
    return embedded;
  }

  throw lastError || new Error('portfolio.json not found');
}

async function loadAllProjects() {
  const data = await fetchPortfolioJson();
  allProjects = data.projects || [];
  return allProjects;
}

function updateProjectCount() {
  const count = getListedProjects().length;
  document.querySelectorAll('.portfolio-count').forEach(el => {
    el.textContent = String(count);
  });
}

function renderHeroStats() {
  const el = document.getElementById('heroStats');
  if (!el) return;

  const count = getListedProjects().length;
  if (portfolioLang === 'en') {
    el.innerHTML =
      '<span>' + count + ' projects listed</span>' +
      '<span class="hero-stats-sep">·</span>' +
      '<span>Personal &amp; client work</span>';
    return;
  }

  el.innerHTML =
    '<span>已展示 ' + count + ' 个项目</span>' +
    '<span class="hero-stats-sep">·</span>' +
    '<span>个人与商业合作</span>';
}

function portfolioOnLangChange(lang) {
  portfolioLang = lang === 'en' ? 'en' : 'zh';
  renderHeroStats();
  if (window.portfolioRerenderList) window.portfolioRerenderList();
}

window.portfolioOnLangChange = portfolioOnLangChange;
