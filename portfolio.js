function renderProjectCard(project) {
  const linkUrl = String(project.linkUrl || '').trim();
  const card = document.createElement(linkUrl ? 'a' : 'article');
  card.className = 'project-card';
  if (linkUrl) {
    card.href = linkUrl;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
  }

  const metaParts = [
    projectText(project, 'role'),
    projectText(project, 'client'),
    project.year ? String(project.year) : ''
  ].filter(Boolean);

  card.innerHTML =
    renderProjectCoverHtml(project, 'project-card-cover') +
    '<div class="project-card-body">' +
      '<h3 class="project-card-title">' + escapeHtml(projectText(project, 'title')) + '</h3>' +
      (metaParts.length
        ? '<div class="project-card-meta">' + metaParts.map(p => '<span>' + escapeHtml(p) + '</span>').join('') + '</div>'
        : '') +
      '<p class="project-card-excerpt">' + escapeHtml(projectText(project, 'excerpt')) + '</p>' +
      (linkUrl ? '<span class="project-card-arrow" aria-hidden="true">→</span>' : '') +
    '</div>';

  return card;
}

function renderProjectSections() {
  const root = document.getElementById('portfolioSections');
  if (!root) return;

  root.innerHTML = '';

  PORTFOLIO_CATEGORIES.forEach(category => {
    const projects = getProjectsByCategory(category.id);
    const section = document.createElement('section');
    section.className = 'portfolio-section';
    section.id = 'portfolio-' + category.id;

    const title = portfolioLang === 'en' ? category.titleEn : category.titleZh;
    const desc = portfolioLang === 'en' ? category.descEn : category.descZh;
    const emptyText = portfolioLang === 'en' ? 'No projects in this section yet.' : '本版块暂无项目。';

    section.innerHTML =
      '<div class="portfolio-section-head">' +
        '<h2 class="portfolio-section-title">' + escapeHtml(title) + '</h2>' +
        '<p class="portfolio-section-desc">' + escapeHtml(desc) + '</p>' +
      '</div>';

    const grid = document.createElement('div');
    grid.className = 'portfolio-grid';

    if (!projects.length) {
      grid.innerHTML = '<div class="portfolio-empty">' + emptyText + '</div>';
    } else {
      projects.forEach(project => grid.appendChild(renderProjectCard(project)));
    }

    section.appendChild(grid);
    root.appendChild(section);
  });
}

window.portfolioRerenderList = renderProjectSections;

async function bootPortfolioPage() {
  portfolioLang = typeof getSiteLang === 'function' ? getSiteLang() : 'zh';
  renderHeroStats();

  try {
    await loadAllProjects();
    updateProjectCount();
    renderHeroStats();
    renderProjectSections();
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    const heroStats = document.getElementById('heroStats');
    if (heroStats) {
      heroStats.textContent = portfolioLang === 'en'
        ? 'Failed to load portfolio data'
        : '项目数据加载失败';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootPortfolioPage);
} else {
  bootPortfolioPage();
}
