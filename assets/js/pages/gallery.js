import { renderToCanvas, themeStyle } from '../contours.js';
import { backdrop } from '../config.js';
import { ROOT, loadYaml, esc, mdInline } from '../content.js';

const page = await loadYaml('data/gallery.yml');
const items = page.items || [];
for (const [key, sel] of [['eyebrow', '[data-eyebrow]'], ['heading', '[data-heading]'], ['intro', '[data-intro]']]) {
  if (page[key] != null) document.querySelector(sel).innerHTML = mdInline(page[key]);
}

const grid = document.querySelector('[data-gallery]');
const filters = document.querySelector('[data-filters]');
const dialog = document.querySelector('dialog.lightbox');
const stage = dialog.querySelector('.stage');

/* ---------- placeholders: little contour maps in theme colours ---------- */
let placeholders = [];
function placeholder(item, width) {
  const canvas = document.createElement('canvas');
  const aspect = item.aspect || 1.5;
  const opts = () => ({ ...backdrop, seed: item.placeholder, scale: 180, cell: 3, levels: 16, ...themeStyle(),
    alpha: 0.55, majorAlpha: 0.9, lineWidth: 0.8, majorWidth: 1.4 });
  const draw = () => renderToCanvas(canvas, width, Math.round(width / aspect), opts());
  draw();
  placeholders.push({ canvas, draw });
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', item.alt || item.title || 'Placeholder');
  return canvas;
}
new MutationObserver(() => {
  placeholders = placeholders.filter((p) => p.canvas.isConnected);
  placeholders.forEach((p) => p.draw());
})
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- grid ---------- */
let visible = items;
function renderGrid() {
  grid.innerHTML = '';
  visible.forEach((item, i) => {
    const fig = document.createElement('figure');
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Open ${item.title || 'image'}`);
    if (item.src) {
      btn.innerHTML = `<img src="${esc(new URL(item.thumb || item.src, ROOT).href)}" alt="${esc(item.alt || item.title || '')}" loading="lazy">`;
    } else {
      btn.append(placeholder(item, 480));
    }
    btn.addEventListener('click', () => open(i));
    fig.append(btn);
    if (item.title || item.caption) {
      fig.insertAdjacentHTML('beforeend',
        `<figcaption>${item.title ? `<strong>${esc(item.title)}</strong>` : ''}${item.title && item.caption ? ' — ' : ''}${mdInline(item.caption || '')}</figcaption>`);
    }
    grid.append(fig);
  });
}

/* ---------- tag filters ---------- */
const tags = [...new Set(items.flatMap((i) => i.tags || []))].sort();
if (tags.length) {
  filters.innerHTML = ['All', ...tags].map((t, i) =>
    `<button type="button" data-tag="${esc(t)}" aria-pressed="${i === 0}">${esc(t)}</button>`).join('');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    visible = b.dataset.tag === 'All' ? items : items.filter((i) => (i.tags || []).includes(b.dataset.tag));
    renderGrid();
  });
}

/* ---------- lightbox ---------- */
let current = 0;
function open(i) {
  current = (i + visible.length) % visible.length;
  const item = visible[current];
  stage.innerHTML = '';
  if (item.src) {
    stage.innerHTML = `<img src="${esc(new URL(item.src, ROOT).href)}" alt="${esc(item.alt || item.title || '')}">`;
  } else {
    const w = Math.min(innerWidth - 80, (innerHeight - 200) * (item.aspect || 1.5), 1400);
    stage.append(placeholder(item, Math.max(200, Math.round(w))));
  }
  dialog.querySelector('.meta h2').textContent = item.title || '';
  dialog.querySelector('.meta p').innerHTML = mdInline(item.caption || '');
  if (!dialog.open) dialog.showModal();
}
dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
dialog.querySelector('.lb-prev').addEventListener('click', () => open(current - 1));
dialog.querySelector('.lb-next').addEventListener('click', () => open(current + 1));
dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target === stage) dialog.close(); });
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') open(current - 1);
  if (e.key === 'ArrowRight') open(current + 1);
});

renderGrid();
