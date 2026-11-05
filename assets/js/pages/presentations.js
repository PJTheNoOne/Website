import { ROOT, loadYaml, esc, mdInline } from '../content.js';

const BASE = new URL('presentations/', ROOT);
const page = await loadYaml('data/presentations.yml');
const courses = page.courses || [];
for (const [key, sel] of [['eyebrow', '[data-eyebrow]'], ['heading', '[data-heading]'], ['intro', '[data-intro]']]) {
  if (page[key] != null) document.querySelector(sel).innerHTML = mdInline(page[key]);
}

// HTML decks are folders; Markdown decks (.md) open in the viewer at presentations/view/.
const deckUrl = (href = '') => (/\.md$/i.test(href.split(/[?#]/)[0])
  ? new URL(`view/?src=${encodeURIComponent(href)}`, BASE).href
  : new URL(href, BASE).href);
// YAML turns 2026-09-02 into a Date; a quoted "2026-09-02" stays a string. Accept both.
const fmt = (d) => (d instanceof Date ? d.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
  : d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

document.querySelector('[data-courses]').innerHTML = courses.map((c) => `
  <section class="course" id="${esc(c.id)}">
    <div class="course-head">
      <span class="course-code">${esc(c.code || '')}</span>
      <h2>${esc(c.title)}</h2>
      ${c.term ? `<span class="tag">${esc(c.term)}</span>` : ''}
    </div>
    ${c.description ? `<p class="muted prose">${mdInline(c.description)}</p>` : ''}
    <ol class="decks">${(c.decks || []).map((d, i) => `
      <li><a href="${esc(deckUrl(d.href))}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="title">${esc(d.title)}</span>
        <span class="date">${esc(fmt(d.date))}</span>
        ${d.summary ? `<span class="summary">${mdInline(d.summary)}</span>` : ''}
      </a></li>`).join('')}
    </ol>
  </section>`).join('');

try { if (location.hash) document.querySelector(location.hash)?.scrollIntoView(); } catch { /* not an id */ }
