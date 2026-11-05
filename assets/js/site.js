/* Shared behaviour for every regular page: theme picker, active nav link, backdrop. */
import { themes, backdrop } from './config.js';
import { mountBackdrop } from './backdrop.js';
import { loadYaml, resolve, esc } from './content.js';

export const THEME_KEY = 'theme';

export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
}

export function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem(THEME_KEY, id); } catch { /* private mode */ }
  document.querySelectorAll('[data-theme-picker] select').forEach((s) => (s.value = id));
}

export function cycleTheme() {
  const i = themes.findIndex((t) => t.id === getTheme());
  setTheme(themes[(i + 1) % themes.length].id);
}

function buildPickers() {
  document.querySelectorAll('[data-theme-picker]').forEach((host) => {
    const id = `theme-${Math.random().toString(36).slice(2, 7)}`;
    host.innerHTML = `<label class="visually-hidden" for="${id}">Theme</label>
      <select id="${id}" class="theme-select">${themes.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}</select>`;
    const select = host.querySelector('select');
    select.value = getTheme();
    select.addEventListener('change', () => setTheme(select.value));
  });
}

function markActiveNav() {
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a').forEach((a) => {
    const path = new URL(a.href).pathname.replace(/index\.html$/, '');
    const isHome = a.hasAttribute('data-home');
    if (isHome ? here === path : here.startsWith(path)) a.setAttribute('aria-current', 'page');
  });
}

export function backdropOptions(el = document.body) {
  const seed = el.dataset.backdropSeed;
  return seed ? { ...backdrop, seed } : { ...backdrop };
}

const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 15c2-6 7-10 12-9s7 6 5 10-9 4-13 2"/><path d="M8 14c1-3 4-5 7-4.5s4 3 3 5-5 2.5-8 1"/></svg>';

/* Header, footer and page title come from data/site.yml so the name and menu live in one place. */
function renderChrome(site) {
  const name = esc(site.name || '');
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.innerHTML = `<div class="wrap">
      <a class="site-title" href="${esc(resolve('./'))}">${LOGO} ${name}</a>
      <nav class="site-nav" aria-label="Main"><ul>${(site.nav || []).map((l) => {
        const href = resolve(l.href);
        const home = new URL(href, location.href).href === resolve('./');
        return `<li><a href="${esc(href)}"${home ? ' data-home' : ''}>${esc(l.label)}</a></li>`;
      }).join('')}</ul></nav>
      <div data-theme-picker></div>
    </div>`;
  }
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.innerHTML = `<div class="wrap">
      <span>© ${new Date().getFullYear()} ${name}</span>
      <span>${(site.footer || []).map((l) => `<a href="${esc(resolve(l.href))}">${esc(l.label)}</a>`).join(' · ')}</span>
    </div>`;
  }
  if (site.name) {
    // <body data-page="home"> → just the name; otherwise "Page · Name".
    document.title = document.body.dataset.page === 'home' || !document.title
      ? site.name : `${document.title} · ${site.name}`;
  }
}

async function init() {
  document.documentElement.dataset.theme = getTheme();
  if (document.body.dataset.backdrop !== 'off') mountBackdrop(backdropOptions());
  try {
    renderChrome(await loadYaml('data/site.yml'));
  } catch (e) {
    console.error(e);
  }
  buildPickers();
  markActiveNav();
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

init();
