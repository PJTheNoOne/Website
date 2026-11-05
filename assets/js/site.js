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

// Boulder logo (source: assets/img/logo.svg). Colors follow the theme; a theme can set
// --logo-from and --logo-to to override them.
const LOGO = '<svg viewBox="0 0 512 512" fill="none" stroke-linecap="square" stroke-linejoin="bevel" aria-hidden="true"><defs><linearGradient id="site-logo-grad" x1="148.76" y1="196.67" x2="439.67" y2="433.95" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color: var(--logo-from, var(--accent))"/><stop offset="1" style="stop-color: var(--logo-to, var(--text-muted))"/></linearGradient></defs><path transform="translate(420.5 -85.7) scale(0.95) rotate(71.918) translate(15.613 9.32)" stroke="url(#site-logo-grad)" stroke-width="38" d="M 73.397453,395.84895 269.3742,55.731259 a 20.637886,20.637886 4.7641661 0 1 37.22253,3.10222 L 408.36912,332.16507 a 56.332211,56.332211 88.829847 0 1 0.75864,37.1407 l -15.39558,47.15289 a 45.113728,45.113728 144.04101 0 1 -42.8857,31.11141 H 103.28835 A 34.4979,34.4979 59.975332 0 1 73.397453,395.84895 Z"/></svg>';

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
