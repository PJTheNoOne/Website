import {
  DEFAULTS, generateHeightmap, traceContours, drawContours, drawHeightmap, contoursToSVG, themeStyle,
} from '../../assets/js/contours.js';
import { backdrop as siteBackdrop } from '../../assets/js/config.js';

/* ---------- control schema ---------- */
const TERRAIN = [
  { key: 'scale', label: 'Scale', min: 60, max: 1600, step: 10, hint: 'Size of landforms (px)' },
  { key: 'octaves', label: 'Detail', min: 1, max: 8, step: 1 },
  { key: 'persistence', label: 'Roughness', min: 0.2, max: 0.8, step: 0.01 },
  { key: 'lacunarity', label: 'Lacunarity', min: 1.5, max: 3, step: 0.05 },
  { key: 'warp', label: 'Warp', min: 0, max: 1.5, step: 0.01 },
  { key: 'ridged', label: 'Ridges', min: 0, max: 1, step: 0.01 },
  { key: 'falloff', label: 'Island', min: -1, max: 1.5, step: 0.05 },
  { key: 'offsetX', label: 'Pan X', min: -3000, max: 3000, step: 10 },
  { key: 'offsetY', label: 'Pan Y', min: -3000, max: 3000, step: 10 },
];
const LINES = [
  { key: 'levels', label: 'Lines', min: 2, max: 60, step: 1 },
  { key: 'majorEvery', label: 'Bold every', min: 1, max: 10, step: 1 },
  { key: 'cell', label: 'Resolution', min: 2, max: 16, step: 1, hint: 'Grid size in px; smaller is finer' },
  { key: 'smooth', label: 'Smoothing', min: 0, max: 4, step: 1 },
  { key: 'simplify', label: 'Simplify', min: 0, max: 2, step: 0.05, hint: 'Higher = smaller SVG, slightly rougher lines' },
  { key: 'minPoints', label: 'Min length', min: 2, max: 60, step: 1 },
  { key: 'lineWidth', label: 'Line width', min: 0.25, max: 4, step: 0.05 },
  { key: 'majorWidth', label: 'Bold width', min: 0.25, max: 6, step: 0.05 },
];
const STYLE = [
  { key: 'alpha', label: 'Line opacity', min: 0.02, max: 1, step: 0.01 },
  { key: 'majorAlpha', label: 'Bold opacity', min: 0.02, max: 1, step: 0.01 },
];

const EXTRA_DEFAULTS = {
  width: 1920, height: 1080,
  useTheme: true, color: '#7d7362', background: '#fbfaf7', includeBg: true,
  view: 'lines',
};
const START = { ...DEFAULTS, ...siteBackdrop, ...EXTRA_DEFAULTS, alpha: 0.35, majorAlpha: 0.6 };
const CONFIG_KEYS = ['seed', 'scale', 'octaves', 'persistence', 'lacunarity', 'warp', 'ridged', 'falloff',
  'offsetX', 'offsetY', 'levels', 'majorEvery', 'cell', 'smooth', 'simplify', 'minPoints', 'lineWidth', 'majorWidth'];

/* ---------- state ↔ URL ---------- */
let state = { ...START, ...readHash() };

function readHash() {
  const out = {};
  new URLSearchParams(location.hash.slice(1)).forEach((v, k) => {
    if (!(k in START)) return;
    const d = START[k];
    out[k] = typeof d === 'boolean' ? v === '1' : typeof d === 'number' && k !== 'seed' ? Number(v) : v;
  });
  return out;
}
function writeHash() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v !== START[k]) p.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
  history.replaceState(null, '', `#${p}`);
}

/* ---------- build form ---------- */
const form = document.querySelector('[data-controls]');
const slider = (c) => `
  <label class="ctl" title="${c.hint || ''}">
    <span>${c.label}</span>
    <input type="range" name="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}">
    <input type="number" data-mirror="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label} value">
  </label>`;

form.innerHTML = `
  <fieldset>
    <legend>Terrain</legend>
    <div class="seed-row"><span>Seed</span><input name="seed" aria-label="Seed" spellcheck="false"><button type="button" data-act="random">Random</button></div>
    ${TERRAIN.map(slider).join('')}
  </fieldset>
  <fieldset>
    <legend>Contours</legend>
    ${LINES.map(slider).join('')}
  </fieldset>
  <fieldset>
    <legend>Style</legend>
    <label class="ctl wide"><span>View</span><select name="view">
      <option value="lines">Contour lines</option><option value="height">Heightmap</option><option value="both">Both</option>
    </select></label>
    <label class="ctl wide"><span>Theme colours</span><input type="checkbox" name="useTheme"></label>
    <label class="ctl wide" data-custom><span>Line colour</span><input type="color" name="color"></label>
    <label class="ctl wide" data-custom><span>Background</span><input type="color" name="background"></label>
    <label class="ctl wide"><span>Export background</span><input type="checkbox" name="includeBg"></label>
    ${STYLE.map(slider).join('')}
  </fieldset>
  <fieldset>
    <legend>Output size</legend>
    <label class="ctl wide"><span>Width</span><input type="number" name="width" min="100" max="8000" step="10"></label>
    <label class="ctl wide"><span>Height</span><input type="number" name="height" min="100" max="8000" step="10"></label>
    <label class="ctl wide"><span>Preset</span><select data-preset>
      <option value="">—</option><option>1920x1080</option><option>2560x1440</option><option>1280x720</option>
      <option>1080x1080</option><option>1080x1920</option><option>3840x2160</option>
    </select></label>
  </fieldset>`;

function syncForm() {
  for (const el of form.elements) {
    if (!el.name || !(el.name in state)) continue;
    if (el.type === 'checkbox') el.checked = state[el.name];
    else el.value = state[el.name];
  }
  form.querySelectorAll('[data-mirror]').forEach((m) => (m.value = state[m.dataset.mirror]));
  form.querySelectorAll('[data-custom]').forEach((el) => (el.hidden = state.useTheme));
}

form.addEventListener('input', (e) => {
  const el = e.target;
  if (el.matches('[data-preset]')) {
    if (!el.value) return;
    const [w, h] = el.value.split('x').map(Number);
    Object.assign(state, { width: w, height: h });
    el.value = '';
  } else {
    const key = el.name || el.dataset.mirror;
    if (!key) return;
    const v = el.type === 'checkbox' ? el.checked
      : key === 'seed' || typeof START[key] !== 'number' ? el.value : Number(el.value);
    if (typeof v === 'number' && !Number.isFinite(v)) return;
    state[key] = v;
  }
  syncForm();
  schedule();
});
form.addEventListener('click', (e) => {
  if (e.target.dataset.act === 'random') {
    state.seed = Math.random().toString(36).slice(2, 8);
    syncForm();
    schedule();
  }
});

/* ---------- render ---------- */
const canvas = document.querySelector('[data-preview]');
const ctx = canvas.getContext('2d');
const status = document.querySelector('[data-status]');
let current = null;

function colors() {
  if (!state.useTheme) return { color: state.color, background: state.background };
  const cs = getComputedStyle(document.documentElement);
  return { color: themeStyle().color, background: cs.getPropertyValue('--bg').trim() };
}

let traceKey = '';
function render() {
  const t0 = performance.now();
  const w = clampInt(state.width, 100, 8000), h = clampInt(state.height, 100, 8000);
  // Re-trace only when geometry settings changed; colour tweaks just repaint.
  const key = JSON.stringify([w, h, ...CONFIG_KEYS.map((k) => state[k])]);
  if (key !== traceKey) {
    const field = generateHeightmap(w, h, state);
    current = { field, contours: traceContours(field, state), w, h };
    traceKey = key;
  }
  const { color, background } = colors();
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  if (state.view !== 'lines') {
    ctx.save();
    if (state.view === 'both') ctx.globalAlpha = 0.35;
    drawHeightmap(ctx, current.field);
    ctx.restore();
  }
  if (state.view !== 'height') drawContours(ctx, current.contours, { ...state, color });

  const lines = current.contours.reduce((n, c) => n + c.lines.length, 0);
  status.textContent = `${w}×${h} · ${current.contours.length} levels · ${lines} paths · ${Math.round(performance.now() - t0)} ms`;
  writeHash();
}

let pending = 0;
function schedule() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(render);
}

new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule);

/* ---------- actions ---------- */
const fileBase = () => `contours-${String(state.seed).replace(/[^\w-]/g, '') || 'map'}-${current.w}x${current.h}`;
const actions = {
  svg() {
    const { color, background } = colors();
    const svg = contoursToSVG(current.contours, {
      ...state, color, width: current.w, height: current.h, background: state.includeBg ? background : null,
    });
    download(new Blob([svg], { type: 'image/svg+xml' }), `${fileBase()}.svg`);
  },
  png() {
    if (state.includeBg) return canvas.toBlob((b) => download(b, `${fileBase()}.png`));
    // Transparent PNG: redraw without the background fill.
    const c = document.createElement('canvas');
    c.width = current.w; c.height = current.h;
    const x = c.getContext('2d');
    if (state.view !== 'lines') drawHeightmap(x, current.field);
    if (state.view !== 'height') drawContours(x, current.contours, { ...state, color: colors().color });
    c.toBlob((b) => download(b, `${fileBase()}.png`));
  },
  async config() {
    const obj = Object.fromEntries(CONFIG_KEYS.map((k) => [k, state[k]]));
    const body = Object.entries(obj).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n');
    await copy(`export const backdrop = {\n${body}\n};`, 'Config copied. Paste it over `backdrop` in assets/js/config.js');
  },
  async link() { await copy(location.href, 'Link copied'); },
  reset() { state = { ...START }; syncForm(); schedule(); },
};
document.querySelector('.actions').addEventListener('click', (e) => actions[e.target.closest('[data-act]')?.dataset.act]?.());

function download(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch { prompt('Copy this:', text); }
}
let toastTimer;
function toast(msg) {
  const t = document.querySelector('.toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const clampInt = (v, a, b) => Math.round(Math.min(b, Math.max(a, Number(v) || a)));

syncForm();
render();
