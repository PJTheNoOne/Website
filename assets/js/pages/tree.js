import { icon } from '../icons.js';

const ROOT = new URL('../../../', import.meta.url);       // site root, wherever it's hosted
const data = await fetch(new URL('data/links.json', ROOT)).then((r) => r.json());

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Relative hrefs in links.json are relative to the site root, absolute ones are left alone.
const resolve = (href) => (/^([a-z]+:|\/\/|#)/i.test(href) ? href : new URL(href, ROOT).href);
const isExternal = (href) => /^https?:/i.test(href) && new URL(href).origin !== location.origin;

document.querySelector('[data-tree-name]').textContent = data.name;
document.querySelector('[data-tree-bio]').textContent = data.bio;
document.querySelector('[data-tree-portrait]').src = resolve(data.portrait);
document.title = `${data.name} · Links`;

document.querySelector('[data-tree-sections]').innerHTML = data.sections.map((section) => `
  <section>
    <h2>${esc(section.title)}</h2>
    <ul>${section.links.map((l) => {
      const href = resolve(l.href);
      const ext = isExternal(href);
      return `<li><a class="tree-link" href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>
        ${icon(l.icon)}
        <span>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</span>
        ${ext ? icon('external') : '<span></span>'}
      </a></li>`;
    }).join('')}</ul>
  </section>`).join('');
