/* ==========================================================================
   Content loading: YAML data files and Markdown text.
   Everything a person edits lives in data/*.yml and content/*.md (and
   Markdown decks under presentations/). This module turns those into JS.
   ========================================================================== */
import { load as parseYaml } from '../vendor/js-yaml.mjs';
import { marked } from '../vendor/marked.esm.js';

/** The site root, wherever the site is hosted (works for user.github.io/ and user.github.io/repo/). */
export const ROOT = new URL('../../', import.meta.url);

marked.use({ gfm: true });

export const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Resolve a link from a data file: relative paths are relative to the site root, full URLs are left alone. */
export const resolve = (href = '', base = ROOT) =>
  (/^([a-z]+:|\/\/|#)/i.test(href) ? href : new URL(href, base).href);

async function fetchText(path, base = ROOT) {
  const url = new URL(path, base);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url.pathname} (${res.status})`);
  return res.text();
}

/** Load and parse a YAML file, relative to the site root. Errors name the file and line. */
export async function loadYaml(path) {
  const text = await fetchText(path);
  try {
    return parseYaml(text) ?? {};
  } catch (e) {
    throw new Error(`${path}: ${e.message}`);
  }
}

/** Split "---\nyaml\n---\nbody" into { data, body }. Files without front matter return data = {}. */
export function splitFrontMatter(text, name = 'file') {
  const m = text.match(/^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, body: text };
  try {
    return { data: parseYaml(m[1]) ?? {}, body: text.slice(m[0].length) };
  } catch (e) {
    throw new Error(`${name} (front matter): ${e.message}`);
  }
}

/** Load a Markdown file with optional front matter. */
export async function loadMarkdown(path, base = ROOT) {
  return splitFrontMatter(await fetchText(path, base), path);
}

/** Markdown → HTML (block). */
export const md = (text = '') => marked.parse(String(text));

/** Markdown → HTML (inline: no wrapping <p>). Use for one-line fields like a caption or intro. */
export const mdInline = (text = '') => marked.parseInline(String(text));

/** Show a readable error on the page instead of failing silently. */
export function showError(target, err) {
  console.error(err);
  if (target) target.innerHTML = `<p class="load-error"><strong>Couldn't load this content.</strong> ${esc(err.message)}</p>`;
}
