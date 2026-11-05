/* About / landing page, built from content/about.md and data/site.yml. */
import { loadMarkdown, loadYaml, md, mdInline, esc, resolve, showError } from '../content.js';

const main = document.querySelector('[data-about]');
try {
  const [{ data: p, body }, site] = await Promise.all([loadMarkdown('content/about.md'), loadYaml('data/site.yml')]);
  const name = esc(p.name || site.name || '');

  const buttons = (p.buttons || []).map((b) =>
    `<a class="button${b.style === 'ghost' ? ' ghost' : ''}" href="${esc(resolve(b.href))}">${esc(b.label)}</a>`).join('');

  const cards = (p.cards || []).map((c) => `
    <article class="card">
      ${c.eyebrow ? `<p class="eyebrow">${esc(c.eyebrow)}</p>` : ''}
      ${c.title ? `<h3>${esc(c.title)}</h3>` : ''}
      ${c.text ? `<p class="muted">${mdInline(c.text)}</p>` : ''}
      ${c.href ? `<a href="${esc(resolve(c.href))}">${esc(c.link || 'More →')}</a>` : ''}
    </article>`).join('');

  main.innerHTML = `
    <section class="hero">
      <div>
        ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ''}
        <h1>${name}</h1>
        ${p.lede ? `<p class="lede">${mdInline(p.lede)}</p>` : ''}
        ${buttons ? `<div class="button-row">${buttons}</div>` : ''}
      </div>
      ${p.portrait ? `<img class="portrait" src="${esc(resolve(p.portrait))}" alt="Portrait of ${name}" width="240" height="240">` : ''}
    </section>
    ${body.trim() ? `<hr><section class="prose">${md(body)}</section>` : ''}
    ${cards ? `${p.cards_heading ? `<h2>${esc(p.cards_heading)}</h2>` : ''}<div class="grid-3">${cards}</div>` : ''}`;
} catch (e) {
  showError(main, e);
}
