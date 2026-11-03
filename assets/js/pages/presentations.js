const ROOT = new URL('../../../', import.meta.url);
const BASE = new URL('presentations/', ROOT);
const { courses } = await fetch(new URL('data/presentations.json', ROOT)).then((r) => r.json());

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

document.querySelector('[data-courses]').innerHTML = courses.map((c) => `
  <section class="course" id="${esc(c.id)}">
    <div class="course-head">
      <span class="course-code">${esc(c.code || '')}</span>
      <h2>${esc(c.title)}</h2>
      ${c.term ? `<span class="tag">${esc(c.term)}</span>` : ''}
    </div>
    ${c.description ? `<p class="muted prose">${esc(c.description)}</p>` : ''}
    <ol class="decks">${c.decks.map((d, i) => `
      <li><a href="${esc(new URL(d.href, BASE).href)}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="title">${esc(d.title)}</span>
        <span class="date">${esc(fmt(d.date))}</span>
        ${d.summary ? `<span class="summary">${esc(d.summary)}</span>` : ''}
      </a></li>`).join('')}
    </ol>
  </section>`).join('');

try { if (location.hash) document.querySelector(location.hash)?.scrollIntoView(); } catch { /* not an id */ }
