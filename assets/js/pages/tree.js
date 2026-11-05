import { icon } from '../icons.js';
import { loadYaml, esc, resolve } from '../content.js';

const [data, site] = await Promise.all([loadYaml('data/links.yml'), loadYaml('data/site.yml')]);
data.name ??= site.name;
const isExternal = (href) => /^https?:/i.test(href) && new URL(href).origin !== location.origin;

document.querySelector('[data-tree-name]').textContent = data.name;
document.querySelector('[data-tree-bio]').textContent = data.bio || '';
document.querySelector('[data-tree-portrait]').src = resolve(data.portrait);

document.querySelector('[data-tree-sections]').innerHTML = (data.sections || []).map((section) => `
  <section>
    <h2>${esc(section.title)}</h2>
    <ul>${(section.links || []).map((l) => {
      const href = resolve(l.href);
      const ext = isExternal(href);
      return `<li><a class="tree-link" href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>
        ${icon(l.icon)}
        <span>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</span>
        ${ext ? icon('external') : '<span></span>'}
      </a></li>`;
    }).join('')}</ul>
  </section>`).join('');
