/* ==========================================================================
   Tiny HTML slide engine.
   Markup: <main class="deck"> <section class="slide">…</section> … </main>
   Keys:   → / Space / PgDn  next      ← / PgUp  previous
           Home / End         first/last   O  overview   F  fullscreen
           N  speaker notes   T  theme     ?  help
   URL:    #/5 opens slide 5 (handy for linking from the syllabus).
   ========================================================================== */
import { themes, backdrop } from '../js/config.js';
import { mountBackdrop } from '../js/backdrop.js';

const W = 1280, H = 720;
const body = document.body;
const deck = document.querySelector('.deck');
const slides = [...deck.querySelectorAll(':scope > .slide')];

/* ---------- theme ---------- */
const getTheme = () => { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } };
function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem('theme', id); } catch { /* ignore */ }
}
setTheme(getTheme());
function cycleTheme() {
  const i = themes.findIndex((t) => t.id === getTheme());
  const next = themes[(i + 1) % themes.length];
  setTheme(next.id);
  toast(`Theme: ${next.label}`);
}

/* ---------- build frames ---------- */
body.classList.add('deck-body');
const frames = slides.map((slide, i) => {
  const frame = document.createElement('div');
  frame.className = 'frame';
  slide.before(frame);
  frame.append(slide);
  if (!slide.matches('.title, .image') && !slide.hasAttribute('data-no-num')) slide.dataset.num = i + 1;
  frame.addEventListener('click', () => { if (deck.classList.contains('overview')) { toggleOverview(false); go(i, 0); } });
  return frame;
});
const steps = slides.map((s) => [...s.querySelectorAll('.step')]);

/* ---------- chrome ---------- */
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const progress = Object.assign(document.createElement('div'), { className: 'deck-progress' });
const controls = document.createElement('nav');
controls.className = 'deck-controls';
controls.setAttribute('aria-label', 'Slide controls');
controls.innerHTML = `
  <a href="${deck.dataset.home || '../../'}" title="All presentations">${svg('<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>')}</a>
  <button data-act="prev" title="Previous (←)">${svg('<path d="m15 6-6 6 6 6"/>')}</button>
  <span class="count" aria-live="polite"></span>
  <button data-act="next" title="Next (→)">${svg('<path d="m9 6 6 6-6 6"/>')}</button>
  <button data-act="overview" title="Overview (O)">${svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')}</button>
  <button data-act="notes" title="Speaker notes (N)">${svg('<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>')}</button>
  <button data-act="theme" title="Theme (T)">${svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>')}</button>
  <button data-act="fullscreen" title="Fullscreen (F)">${svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>
  <button data-act="help" title="Help (?)">?</button>`;
const notesPanel = Object.assign(document.createElement('aside'), { className: 'notes-panel', hidden: true });
const helpPanel = Object.assign(document.createElement('div'), { className: 'help-panel', hidden: true });
helpPanel.innerHTML = `<div role="dialog" aria-label="Keyboard shortcuts"><h3>Keyboard shortcuts</h3><dl>
  <dt><kbd>→</kbd> <kbd>Space</kbd></dt><dd>Next step / slide</dd>
  <dt><kbd>←</kbd></dt><dd>Previous</dd>
  <dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>First / last slide</dd>
  <dt><kbd>O</kbd> <kbd>Esc</kbd></dt><dd>Overview of all slides</dd>
  <dt><kbd>F</kbd></dt><dd>Fullscreen</dd>
  <dt><kbd>N</kbd></dt><dd>Speaker notes</dd>
  <dt><kbd>T</kbd></dt><dd>Cycle theme</dd>
  <dt><kbd>Ctrl</kbd>+<kbd>P</kbd></dt><dd>Print / save as PDF</dd>
</dl></div>`;
body.append(progress, controls, notesPanel, helpPanel);
helpPanel.addEventListener('click', () => (helpPanel.hidden = true));

controls.addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act;
  ({
    prev, next, theme: cycleTheme, help: () => (helpPanel.hidden = !helpPanel.hidden),
    overview: () => toggleOverview(), notes: toggleNotes, fullscreen: toggleFullscreen,
  })[act]?.();
});

/* ---------- state ---------- */
let index = 0, step = 0;

function go(i, s = 0) {
  index = Math.max(0, Math.min(slides.length - 1, i));
  const total = steps[index].length;
  step = s === 'end' ? total : Math.max(0, Math.min(total, s));
  frames.forEach((f, k) => {
    f.classList.toggle('active', k === index);
    f.setAttribute('aria-hidden', k !== index);
    f.inert = k !== index && !deck.classList.contains('overview');
  });
  steps[index].forEach((el, k) => {
    el.classList.toggle('shown', k < step);
    el.classList.toggle('current', k === step - 1);
  });
  controls.querySelector('.count').textContent = `${index + 1} / ${slides.length}`;
  progress.style.width = `${slides.length > 1 ? (index / (slides.length - 1)) * 100 : 100}%`;
  const notes = slides[index].querySelector('.notes');
  notesPanel.innerHTML = `<h4>Notes · slide ${index + 1}</h4>${notes ? notes.innerHTML : '<p><em>No notes for this slide.</em></p>'}`;
  history.replaceState(null, '', `#/${index + 1}${step ? `.${step}` : ''}`);
  const title = slides[index].querySelector('h1, h2')?.textContent.trim();
  document.title = `${title ? `${title} · ` : ''}${baseTitle}`;
}
const baseTitle = document.title;

function next() {
  if (step < steps[index].length) go(index, step + 1);
  else if (index < slides.length - 1) go(index + 1, 0);
}
function prev() {
  if (step > 0) go(index, step - 1);
  else if (index > 0) go(index - 1, 'end');
}

function fit() {
  const overview = deck.classList.contains('overview');
  const scale = overview ? frames[0].clientWidth / W : Math.min(innerWidth / W, innerHeight / H);
  deck.style.setProperty('--scale', scale);
}

function toggleOverview(force) {
  const on = deck.classList.toggle('overview', force);
  frames.forEach((f, k) => (f.inert = !on && k !== index));
  fit();
  if (on) frames[index].scrollIntoView({ block: 'center' });
}
function toggleNotes() { notesPanel.hidden = !notesPanel.hidden; }
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

let toastTimer;
function toast(msg) {
  const c = controls.querySelector('.count');
  c.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => go(index, step), 1200);
}

/* ---------- input ---------- */
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
  const k = e.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'l', 'j'].includes(k)) next();
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'h', 'k'].includes(k)) prev();
  else if (k === 'Home') go(0);
  else if (k === 'End') go(slides.length - 1, 'end');
  else if (k === 'o' || k === 'O') toggleOverview();
  else if (k === 'Escape') { if (!helpPanel.hidden) helpPanel.hidden = true; else toggleOverview(); }
  else if (k === 'f' || k === 'F') toggleFullscreen();
  else if (k === 'n' || k === 'N') toggleNotes();
  else if (k === 't' || k === 'T') cycleTheme();
  else if (k === '?') helpPanel.hidden = !helpPanel.hidden;
  else return;
  e.preventDefault();
});

let touch = null;
deck.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') touch = { x: e.clientX, y: e.clientY }; });
deck.addEventListener('pointerup', (e) => {
  if (!touch || deck.classList.contains('overview')) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
});

let idleTimer;
addEventListener('pointermove', () => {
  body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => body.classList.add('idle'), 2500);
});

addEventListener('resize', fit);
addEventListener('hashchange', readHash);
function readHash() {
  const m = location.hash.match(/^#\/(\d+)(?:\.(\d+))?/);
  if (m) go(Number(m[1]) - 1, Number(m[2] || 0));
  else go(0);
}

/* ---------- start ---------- */
if (deck.dataset.backdrop !== 'off') {
  const seed = deck.dataset.backdropSeed;
  mountBackdrop({ ...backdrop, ...(seed ? { seed } : {}) }, { container: body });
}
fit();
readHash();
