/* ==========================================================================
   contours.js — fake terrain + topographic contour lines
   --------------------------------------------------------------------------
   1. generateHeightmap(): seeded simplex fBm with domain warping
   2. traceContours():     marching squares → joined, smoothed polylines
   3. drawContours() / contoursToSVG(): render to canvas or SVG

   No dependencies. Used by the site backdrop, the slide engine, gallery
   placeholders and the generator at /tools/heightmap/.
   ========================================================================== */

export const DEFAULTS = {
  // terrain
  seed: 1,
  scale: 520,        // px per major landform; bigger = broader hills
  octaves: 5,
  persistence: 0.5,  // amplitude falloff per octave (roughness)
  lacunarity: 2.0,   // frequency growth per octave
  warp: 0.45,        // domain warp strength (0 = plain noise, 1 = very swirly)
  ridged: 0.15,      // 0 = rolling hills, 1 = sharp ridges
  falloff: 0,        // 0..1, pushes edges down (island) — negative raises edges (basin)
  offsetX: 0,
  offsetY: 0,
  // contours
  levels: 20,        // number of contour lines across the height range
  majorEvery: 5,     // every Nth line is an "index" contour (drawn bolder)
  cell: 6,           // sampling grid size in px (smaller = finer, slower)
  smooth: 2,         // Chaikin smoothing passes
  simplify: 0.3,     // drop points closer than this (px) to the line — keeps SVGs small
  minPoints: 8,      // drop tiny specks with fewer raw points than this
  // style
  lineWidth: 1,
  majorWidth: 1.8,
  alpha: 0.14,
  majorAlpha: 0.26,
  color: '#7d7362',
};

/* ---------- seeded randomness ---------- */

export function seedFrom(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  if (/^\d+$/.test(String(value).trim())) return Number(value) >>> 0;
  let h = 2166136261; // FNV-1a for strings
  for (const ch of String(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 2D simplex noise ---------- */

const GRAD = new Float32Array([1,1, -1,1, 1,-1, -1,-1, 1,0, -1,0, 1,0, -1,0, 0,1, 0,-1, 0,1, 0,-1]);
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export function makeSimplex(seed) {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }

  return function noise(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, tt, g;
    tt = 0.5 - x0 * x0 - y0 * y0;
    if (tt > 0) { g = pm12[ii + perm[jj]] * 2; tt *= tt; n += tt * tt * (GRAD[g] * x0 + GRAD[g + 1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1;
    if (tt > 0) { g = pm12[ii + i1 + perm[jj + j1]] * 2; tt *= tt; n += tt * tt * (GRAD[g] * x1 + GRAD[g + 1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2;
    if (tt > 0) { g = pm12[ii + 1 + perm[jj + 1]] * 2; tt *= tt; n += tt * tt * (GRAD[g] * x2 + GRAD[g + 1] * y2); }
    return 70 * n; // ~[-1, 1]
  };
}

/* ---------- heightmap ---------- */

/**
 * @returns {{cols:number, rows:number, cell:number, width:number, height:number, data:Float32Array}}
 *          data is row-major, normalised to 0..1.
 */
export function generateHeightmap(width, height, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const seed = seedFrom(o.seed);
  const base = makeSimplex(seed);
  const warpX = makeSimplex(seed ^ 0x9e3779b9);
  const warpY = makeSimplex(seed ^ 0x85ebca6b);

  const cell = Math.max(1, o.cell);
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const data = new Float32Array(cols * rows);
  const octaves = Math.max(1, Math.round(o.octaves));
  const ridged = clamp(o.ridged, 0, 1);

  let min = Infinity, max = -Infinity;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let u = (gx * cell + o.offsetX) / o.scale;
      let v = (gy * cell + o.offsetY) / o.scale;

      if (o.warp > 0) {
        const wx = fbm(warpX, u + 5.2, v + 1.3, 3, 0.5, 2);
        const wy = fbm(warpY, u + 1.7, v + 9.2, 3, 0.5, 2);
        u += o.warp * 1.6 * wx;
        v += o.warp * 1.6 * wy;
      }

      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let k = 0; k < octaves; k++) {
        const n = base(u * freq, v * freq);
        const r = 1 - Math.abs(n);
        sum += amp * (ridged ? (1 - ridged) * n + ridged * (r * r * 2 - 1) : n);
        norm += amp;
        amp *= o.persistence;
        freq *= o.lacunarity;
      }
      let h = sum / norm;

      if (o.falloff) {
        const dx = (gx / (cols - 1)) * 2 - 1, dy = (gy / (rows - 1)) * 2 - 1;
        h -= o.falloff * (dx * dx + dy * dy);
      }

      data[gy * cols + gx] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }

  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) data[i] = (data[i] - min) / range;
  return { cols, rows, cell, width, height, data };
}

function fbm(noise, x, y, octaves, persistence, lacunarity) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp; amp *= persistence; freq *= lacunarity;
  }
  return sum / norm;
}

/* ---------- marching squares ---------- */

// For each case (tl*8 + tr*4 + br*2 + bl), the pairs of edges a line crosses.
// Edges: 0 = top, 1 = right, 2 = bottom, 3 = left. Saddles (5, 10) handled inline.
const CASES = [
  [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], null, [[0, 2]], [[3, 0]],
  [[3, 0]], [[0, 2]], null, [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], [],
];

/**
 * @returns {Array<{level:number, index:number, major:boolean, lines:Array<{points:number[], closed:boolean}>}>}
 *          points are flat [x0, y0, x1, y1, ...] in pixels.
 */
export function traceContours(field, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const out = [];
  const n = Math.max(1, Math.round(o.levels));
  const every = Math.max(1, Math.round(o.majorEvery));
  for (let k = 1; k <= n; k++) {
    const level = k / (n + 1);
    const lines = traceLevel(field, level)
      .filter((l) => l.points.length / 2 >= o.minPoints)
      .map((l) => (o.smooth > 0 ? chaikin(l, o.smooth) : l))
      .map((l) => (o.simplify > 0 ? simplifyLine(l, o.simplify) : l));
    out.push({ level, index: k, major: k % every === 0, lines });
  }
  return out;
}

function traceLevel({ cols, rows, cell, data }, level) {
  // Edge ids: horizontal edge from (x,y)->(x+1,y) = (y*cols+x)*2, vertical (x,y)->(x,y+1) = +1
  const H = (x, y) => (y * cols + x) * 2;
  const V = (x, y) => (y * cols + x) * 2 + 1;
  const segA = [], segB = [];

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = data[y * cols + x], tr = data[y * cols + x + 1];
      const bl = data[(y + 1) * cols + x], br = data[(y + 1) * cols + x + 1];
      const c = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const edges = [H(x, y), V(x + 1, y), H(x, y + 1), V(x, y)];
      let pairs = CASES[c];
      if (!pairs) {
        const centreHigh = (tl + tr + bl + br) / 4 > level;
        if (c === 5) pairs = centreHigh ? [[3, 0], [2, 1]] : [[0, 1], [3, 2]];
        else pairs = centreHigh ? [[0, 1], [3, 2]] : [[3, 0], [2, 1]];
      }
      for (const [a, b] of pairs) { segA.push(edges[a]); segB.push(edges[b]); }
    }
  }

  // Join segments that share an edge into polylines.
  const adj = new Map();
  const link = (e, s) => { const l = adj.get(e); l ? l.push(s) : adj.set(e, [s]); };
  for (let s = 0; s < segA.length; s++) { link(segA[s], s); link(segB[s], s); }
  const used = new Uint8Array(segA.length);

  const walk = (start) => {
    const chain = [start];
    let cur = start;
    for (;;) {
      const list = adj.get(cur);
      let next = -1;
      for (const s of list) if (!used[s]) { next = s; break; }
      if (next < 0) break;
      used[next] = 1;
      cur = segA[next] === cur ? segB[next] : segA[next];
      chain.push(cur);
    }
    return chain;
  };

  const chains = [];
  for (const [edge, list] of adj) if (list.length === 1 && !used[list[0]]) chains.push(walk(edge));
  for (let s = 0; s < segA.length; s++) if (!used[s]) chains.push(walk(segA[s]));

  // Edge id → interpolated pixel position.
  const pos = (id, outArr) => {
    const vert = id & 1, i = id >> 1, x = i % cols, y = (i / cols) | 0;
    const a = data[i], b = vert ? data[i + cols] : data[i + 1];
    const t = (level - a) / (b - a || 1e-9);
    outArr.push(vert ? x * cell : (x + t) * cell, vert ? (y + t) * cell : y * cell);
  };

  return chains.map((chain) => {
    const closed = chain.length > 2 && chain[0] === chain[chain.length - 1];
    const points = [];
    const len = closed ? chain.length - 1 : chain.length;
    for (let i = 0; i < len; i++) pos(chain[i], points);
    return { points, closed };
  });
}

function chaikin(line, passes) {
  let pts = line.points;
  for (let p = 0; p < passes; p++) {
    const n = pts.length / 2;
    if (n < 3) break;
    const out = [];
    if (!line.closed) out.push(pts[0], pts[1]);
    const last = line.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n;
      const x0 = pts[i * 2], y0 = pts[i * 2 + 1], x1 = pts[j * 2], y1 = pts[j * 2 + 1];
      out.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
    }
    if (!line.closed) out.push(pts[pts.length - 2], pts[pts.length - 1]);
    pts = out;
  }
  return { points: pts, closed: line.closed };
}

// Ramer–Douglas–Peucker, iterative.
function simplifyLine(line, tolerance) {
  const p = line.points, n = p.length / 2;
  if (n < 4) return line;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const tol2 = tolerance * tolerance;
  const stack = [0, n - 1];
  while (stack.length) {
    const b = stack.pop(), a = stack.pop();
    const ax = p[a * 2], ay = p[a * 2 + 1], dx = p[b * 2] - ax, dy = p[b * 2 + 1] - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = p[i * 2] - ax, py = p[i * 2 + 1] - ay;
      const cross = px * dy - py * dx;
      const d = (cross * cross) / len2;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > tol2) { keep[idx] = 1; stack.push(a, idx, idx, b); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(p[i * 2], p[i * 2 + 1]);
  return { points: out, closed: line.closed };
}

/* ---------- rendering ---------- */

export function drawContours(ctx, contours, style = {}) {
  const s = { ...DEFAULTS, ...style };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  for (const major of [false, true]) {
    ctx.globalAlpha = major ? s.majorAlpha : s.alpha;
    ctx.lineWidth = major ? s.majorWidth : s.lineWidth;
    ctx.beginPath();
    for (const c of contours) {
      if (c.major !== major) continue;
      for (const { points, closed } of c.lines) {
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        if (closed) ctx.closePath();
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Grayscale (or two-colour) image of the raw heightmap. */
export function drawHeightmap(ctx, field, low = [0, 0, 0], high = [255, 255, 255]) {
  const { cols, rows, data, cell, width, height } = field;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    img.data[i * 4] = low[0] + (high[0] - low[0]) * t;
    img.data[i * 4 + 1] = low[1] + (high[1] - low[1]) * t;
    img.data[i * 4 + 2] = low[2] + (high[2] - low[2]) * t;
    img.data[i * 4 + 3] = 255;
  }
  const tmp = new OffscreenCanvas(cols, rows);
  tmp.getContext('2d').putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, cols * cell, rows * cell);
  ctx.restore();
  return { width, height };
}

export function contoursToSVG(contours, { width, height, background = null, ...style } = {}) {
  const s = { ...DEFAULTS, ...style };
  const pathFor = (major) => {
    let d = '';
    for (const c of contours) {
      if (c.major !== major) continue;
      for (const { points, closed } of c.lines) {
        d += `M${f(points[0])} ${f(points[1])}`;
        for (let i = 2; i < points.length; i += 2) d += `L${f(points[i])} ${f(points[i + 1])}`;
        if (closed) d += 'Z';
      }
    }
    return d;
  };
  const bg = background ? `\n  <rect width="100%" height="100%" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${bg}
  <g fill="none" stroke="${s.color}" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="${s.lineWidth}" stroke-opacity="${s.alpha}" d="${pathFor(false)}"/>
    <path stroke-width="${s.majorWidth}" stroke-opacity="${s.majorAlpha}" d="${pathFor(true)}"/>
  </g>
</svg>`;
}

/** Convenience: heightmap + contours + draw into a canvas sized w×h CSS px. */
export function renderToCanvas(canvas, width, height, options = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const field = generateHeightmap(width, height, options);
  const contours = traceContours(field, options);
  drawContours(ctx, contours, options);
  return { field, contours };
}

/** Read the contour style tokens from the active theme. */
export function themeStyle(el = document.documentElement) {
  const cs = getComputedStyle(el);
  const num = (name, fallback) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    color: cs.getPropertyValue('--contour').trim() || DEFAULTS.color,
    alpha: num('--contour-alpha', DEFAULTS.alpha),
    majorAlpha: num('--contour-major-alpha', DEFAULTS.majorAlpha),
  };
}

const f = (n) => Math.round(n * 10) / 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
