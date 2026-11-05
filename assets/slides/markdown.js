/* ==========================================================================
   Markdown decks.
   Turns a .md file into the same <section class="slide"> markup that HTML
   decks use, then starts the normal slide engine (slides.js), so both kinds
   of deck look and behave the same.

   Opened by presentations/view/?src=<course>/<deck>.md
   Syntax (see presentations/_template.md for a worked example):

     ---                       front matter (optional): title, seed, backdrop: off
     ---                       a line with only --- starts a new slide
     <!-- slide: title -->     classes for this slide: title section center big image no-num
     + item                    list item revealed one step at a time
     text {.muted .small}      add classes to a paragraph, heading or list item
     ::: cols wide-left        a <div class="cols wide-left">, closed by a line with :::
     ::: box                   …works for any class: col box cols three …
     > quote  /  > — Author    a quote; a last line starting with — becomes the <cite>
     Notes:                    a line with only "Notes:"; everything after it is speaker notes
   ========================================================================== */
import { ROOT, splitFrontMatter, md, esc } from '../js/content.js';

const PRESENTATIONS = new URL('presentations/', ROOT);
const STEP = '%%step%%';
const deck = document.querySelector('.deck');

/* ---------- text level ---------- */

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Calls fn(line, inFence) for each line, tracking ``` / ~~~ code fences. */
function eachLine(text, fn) {
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(FENCE);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !line.trim().slice(m[1].length)) {
        fn(line, true); fence = null; continue;
      }
      fn(line, true);
    } else {
      if (m) fence = m[1];
      fn(line, !!m);
    }
  }
}

function splitSlides(body) {
  const slides = [[]];
  eachLine(body, (line, inFence) => {
    if (!inFence && /^---\s*$/.test(line)) slides.push([]);
    else slides.at(-1).push(line);
  });
  return slides.map((l) => l.join('\n')).filter((s) => s.trim());
}

/** One slide's text → { classes, body, notes } with our shorthands turned into Markdown/HTML. */
function preprocess(text) {
  let classes = '';
  let notes = null;
  const out = [];
  let first = true;
  eachLine(text, (line, inFence) => {
    if (notes !== null) { notes.push(line); return; }
    if (!inFence) {
      const directive = line.match(/^\s*<!--\s*slide:\s*(.*?)\s*-->\s*$/);
      if (first && directive) { classes = directive[1]; return; }
      if (line.trim()) first = false;
      if (/^\s*Notes?:\s*$/.test(line)) { notes = []; return; }
      const container = line.match(/^\s*:::\s*(.*?)\s*$/);
      if (container) {
        const cls = container[1].split(/\s+/).filter((c) => c && c !== 'col').join(' ');
        out.push('', container[1] ? `<div${cls ? ` class="${esc(cls)}"` : ''}>` : '</div>', '');
        return;
      }
      const step = line.match(/^(\s*)\+\s+(.*)$/);
      if (step) { out.push(`${step[1]}- ${STEP}${step[2]}`); return; }
    } else if (line.trim()) first = false;
    out.push(line);
  });
  return { classes, body: out.join('\n'), notes: notes && notes.join('\n') };
}

/* ---------- DOM level ---------- */

const ATTRS = /\s*\{\s*((?:[.#][\w-]+\s*)+)\}\s*$/;

function applyAttrs(root) {
  root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, figcaption').forEach((el) => {
    let node = el.lastChild;
    while (node && ((node.nodeType === 3 && !node.textContent.trim()) || node.nodeName === 'UL' || node.nodeName === 'OL')) {
      node = node.previousSibling;
    }
    if (!node || node.nodeType !== 3) return;
    const m = node.textContent.match(ATTRS);
    if (!m) return;
    node.textContent = node.textContent.slice(0, m.index);
    // In a loose list (<li><p>…</p></li>) the classes belong on the <li>.
    const target = el.matches('li > p:first-child') ? el.parentElement : el;
    for (const token of m[1].trim().split(/\s+/)) {
      if (token[0] === '.') target.classList.add(token.slice(1));
      else target.id = token.slice(1);
    }
  });
}

function applySteps(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.includes(STEP)) hits.push(walker.currentNode);
  for (const t of hits) {
    t.textContent = t.textContent.replace(STEP, '');
    t.parentElement.closest('li')?.classList.add('step');
  }
}

/** Title & section slides: paragraphs around the heading get their roles without any markup. */
function applyTitleRoles(slide) {
  if (!slide.matches('.title, .section')) return;
  const kids = [...slide.children];
  const h = kids.findIndex((el) => /^H[12]$/.test(el.tagName));
  if (h < 0) return;
  const plain = (el) => el.tagName === 'P' && !el.className;
  kids.slice(0, h).filter(plain).forEach((p) => p.classList.add('eyebrow'));
  if (slide.matches('.title')) {
    kids.slice(h + 1).filter(plain).forEach((p, i) => p.classList.add(i === 0 ? 'subtitle' : 'meta'));
  }
}

function applyCites(root) {
  root.querySelectorAll('blockquote').forEach((q) => {
    const last = q.lastElementChild;
    const m = last?.tagName === 'P' && last.innerHTML.match(/^\s*(?:—|--|&mdash;)\s*([\s\S]*)$/);
    if (!m) return;
    const cite = document.createElement('cite');
    cite.innerHTML = m[1];
    last.replaceWith(cite);
  });
}

/** A plain `::: col` holding a single element (a table, a list…) becomes that element, as in an HTML deck. */
function unwrapColumns(root) {
  root.querySelectorAll('.cols > div:not([class])').forEach((div) => {
    if (div.children.length === 1 && !div.textContent.replace(div.firstElementChild.textContent, '').trim()) {
      div.replaceWith(div.firstElementChild);
    }
  });
}

function unwrapImages(slide) {
  if (!slide.matches('.image')) return;
  slide.querySelectorAll(':scope > p').forEach((p) => {
    const media = p.querySelector('img, video');
    if (media && p.children.length === 1 && !p.textContent.trim()) p.replaceWith(media);
  });
}

/** Image and link paths in a deck are relative to the .md file, like in an HTML deck. */
function resolveUrls(root, base) {
  for (const [sel, attr] of [['img', 'src'], ['video', 'src'], ['source', 'src'], ['video', 'poster'], ['a', 'href']]) {
    root.querySelectorAll(`${sel}[${attr}]`).forEach((el) => {
      const v = el.getAttribute(attr);
      if (v && !/^([a-z]+:|\/\/|#)/i.test(v)) el.setAttribute(attr, new URL(v, base).href);
    });
  }
}

function buildSlide(text, base) {
  const { classes, body, notes } = preprocess(text);
  // Parse in a <template> so images don't start loading from the wrong folder.
  const tpl = document.createElement('template');
  tpl.innerHTML = `<section class="slide">${md(body)}${notes?.trim() ? `<aside class="notes">${md(notes)}</aside>` : ''}</section>`;
  const slide = tpl.content.firstElementChild;
  for (const c of classes.split(/\s+/).filter(Boolean)) {
    if (c === 'no-num') slide.setAttribute('data-no-num', '');
    else slide.classList.add(c);
  }
  applySteps(slide);
  applyAttrs(slide);
  applyTitleRoles(slide);
  applyCites(slide);
  unwrapColumns(slide);
  unwrapImages(slide);
  resolveUrls(slide, base);
  return slide;
}

function errorSlide(message) {
  const s = document.createElement('section');
  s.className = 'slide center';
  s.innerHTML = `<h2>Couldn't open this deck</h2><p class="muted">${esc(message)}</p>`;
  return s;
}

/* ---------- start ---------- */

async function load() {
  const src = new URLSearchParams(location.search).get('src');
  if (!src) throw new Error('No deck given. Links look like presentations/view/?src=course/01-topic.md');
  const url = new URL(src, PRESENTATIONS);
  if (url.origin !== location.origin || !/\.md$/i.test(url.pathname)) throw new Error(`Not a Markdown deck on this site: ${src}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${src} (${res.status} ${res.statusText})`);
  const { data, body } = splitFrontMatter(await res.text(), src);

  if (data.backdrop === 'off' || data.backdrop === false) deck.dataset.backdrop = 'off';
  if (data.seed != null) deck.dataset.backdropSeed = String(data.seed);
  if (data.home) deck.dataset.home = new URL(data.home, url).href;

  const slides = splitSlides(body).map((t) => buildSlide(t, url));
  if (!slides.length) throw new Error(`${src} has no slides yet.`);
  deck.replaceChildren(...slides);
  document.title = data.title || slides[0].querySelector('h1, h2')?.textContent.trim() || 'Slides';
}

try {
  await load();
} catch (e) {
  console.error(e);
  deck.replaceChildren(errorSlide(e.message));
  document.title = 'Deck not found';
}
await import('./slides.js');
