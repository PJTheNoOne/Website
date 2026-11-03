/* Shared behaviour for every regular page: theme picker, active nav link, backdrop. */
import { themes, backdrop } from './config.js';
import { mountBackdrop } from './backdrop.js';

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

function init() {
  document.documentElement.dataset.theme = getTheme();
  buildPickers();
  markActiveNav();
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  if (document.body.dataset.backdrop !== 'off') mountBackdrop(backdropOptions());
}

init();
