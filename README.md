# Personal site

A static site for GitHub Pages: plain HTML, CSS and JavaScript. There's no build step and nothing to install.

Almost everything you'd want to change lives in plain-text **YAML** (`data/*.yml`) and **Markdown** (`content/*.md`, Markdown decks) files. The HTML pages are just shells that load them.

| Page | URL | Content comes from |
|---|---|---|
| Every page | | `data/site.yml` (your name, the menu, the footer) |
| About (landing) | `/` | `content/about.md` |
| Link tree | `/tree/` | `data/links.yml` |
| Gallery | `/gallery/` | `data/gallery.yml` + images in `assets/gallery/` |
| Presentations | `/presentations/` | `data/presentations.yml` + decks (Markdown or HTML) |
| Contour generator | `/tools/heightmap/` | (tool) |

## Preview locally

The pages load JSON and ES modules, so opening the files directly (`file://`) won't work. Run a tiny server from this folder instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish on GitHub Pages

1. Create a repo and push this folder to it.
   - Name it `<username>.github.io` and the site lives at `https://<username>.github.io/`.
   - Any other name works too and the site lives at `https://<username>.github.io/<repo>/`. All links are relative, so either works.
2. On GitHub, go to **Settings → Pages → Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then save.
3. `.nojekyll` is included so folders that start with `_` (like `presentations/_template`) are served.

## Editing content

Each data file starts with comments explaining its fields. In YAML, indentation matters (use spaces, not tabs). Text with a colon followed by a space in it needs quotes: `caption: "Note: draft"`. If a file has a mistake, the page shows an error naming the file and line.

- **Your name and menu**: `data/site.yml`. The header, footer, page titles and link tree all use it.
- **About page**: `content/about.md`. The settings at the top (between the `---` lines) fill the intro, buttons and cards. Everything below them is the "About me" text, in ordinary Markdown. Replace `assets/img/portrait.svg` with a photo and update `portrait:`.
- **Links (`/tree`)**: `data/links.yml`. A relative `href` (like `gallery/`) points into this site, and full URLs point elsewhere. Icons available: `link home user mail image slides code book map calendar video chat pen topo tool` (defined in `assets/js/icons.js`).
- **Gallery**: put images in `assets/gallery/` and add entries to `data/gallery.yml`. The `placeholder` entries draw contour maps. Delete them when you add real images.
- **Courses and decks**: `data/presentations.yml`.

Markdown and YAML are turned into HTML in the browser by two small libraries kept in `assets/vendor/` (marked and js-yaml), so there's still no build step.

## Presentations

Decks come in two styles, and you can mix them freely in a course. In `data/presentations.yml`, an `href` ending in `.md` is a Markdown deck, and one ending in `/` is an HTML deck. Both use the same slide engine, layouts and keyboard controls.

### Markdown decks (easiest)

1. Copy `presentations/_template.md` to `presentations/<course-id>/<NN-topic>.md`.
2. Add it to `data/presentations.yml` with `href: <course-id>/<NN-topic>.md`.

There are no paths to fix. Images go next to the `.md` file and are linked relative to it. The deck opens at `presentations/view/?src=<course-id>/<NN-topic>.md`.

The basics:

```markdown
---                          ← settings: title, seed (backdrop terrain), backdrop: off
title: Week 1 · BIO 101
seed: bio-week1
---

<!-- slide: title -->        ← first line of a slide sets its type:
COURSE · Week 1                 title  section  center  big  image  no-num
                                (on title/section slides the line above the heading
# Deck title                    becomes the small eyebrow; lines below it become
                                the subtitle and the meta line)
Subtitle

---                          ← a line with only --- starts the next slide

## A normal slide

- Shown right away
+ Revealed one at a time      ← "+" bullets are steps
1. Ordered step {.step .dim-after}   ← {.class} at the end of a line adds classes

Small print {.muted .small .push}

::: cols wide-left           ← a <div class="cols wide-left">, ended by :::
::: col                         columns: col (plain) or box (card); also cols three / wide-right
Left
:::
::: box
Right
:::
:::

> A quote
>
> — Its author               ← becomes the <cite>

Notes:                       ← a line with only "Notes:"; everything after is speaker notes
Remember to take attendance.
```

Code blocks, tables, images (`![alt](photo.jpg)`) and links are standard Markdown. You can also drop raw HTML into a Markdown deck when you need something unusual.

### HTML decks (full control)

1. Copy `presentations/_template/` to `presentations/<course-id>/<NN-topic>/`.
2. Because that folder is one level deeper, add one `../` to the four asset paths in its `<head>`, and set `data-home="../../"` on `<main class="deck">`.
3. Add it to `data/presentations.yml`.

See `presentations/maker-lab/01-intro-to-slicing/` for a full example. The basics:

```html
<section class="slide title">   <!-- title slide; terrain shows through -->
<section class="slide section"> <!-- section divider -->
<section class="slide center">  <!-- centered content; add "big" for larger text -->
<section class="slide image"><img src="photo.jpg" alt=""></section>  <!-- full-bleed image -->

<div class="cols">…</div>       <!-- 2 columns; also .wide-left .wide-right .three -->
<div class="box">…</div>        <!-- card -->
<li class="step">…</li>         <!-- revealed one at a time; add dim-after to fade earlier ones -->
<aside class="notes">…</aside>  <!-- speaker notes, press N -->
```

Extra components (in `assets/slides/slides.css`), all used in the Maker Lab deck:

```html
<p class="lede">…</p>              <!-- italic one-liner under a heading -->
<p class="label">…</p>             <!-- small all-caps label -->
<div class="flow"><div>…</div><div class="hl">…</div></div>   <!-- boxes joined by arrows; "compact" for many steps; .hl = accent box -->
<ol class="agenda"><li><strong>Title</strong><span>detail</span></li></ol>   <!-- circled numbers -->
<div class="tiles"><div><strong>Title</strong><span>detail</span></div></div>  <!-- grid of small cards -->
<div class="chips"><span>…</span></div>                       <!-- pill labels -->
<dl class="badges"><dt>STL</dt><dd>…</dd></dl>               <!-- term list with badges -->
<a class="link-card" href="…"><span class="icon">▷</span><span><strong>Name</strong><span>detail</span></span></a>
```

### Presenting

Keys: `→`/`Space` next, `←` back, `O` overview, `F` fullscreen, `N` notes, `T` theme, `?` help. Link to a slide with `#/5`. To make a PDF, print the deck (Chrome: **Save as PDF**). Each slide becomes one page with every step shown.

Slides are designed on a fixed 1280×720 canvas and scaled to fit the screen, so they look the same on a laptop and a projector.

## Themes

All colors and fonts are CSS variables in `assets/css/themes.css`. Six themes are included: Auto (follows the OS light/dark setting), Paper, Ink, Survey, Fjord and Moss. Visitors choose one in the header, and the choice is remembered.

To add a theme, copy a `[data-theme="…"]` block, change the values, and add `{ id, label }` to `themes` in `assets/js/config.js`. To change the look site-wide, edit the tokens on `:root` (fonts, `--measure`, `--radius` …).

The contour lines use the theme's `--contour`, `--contour-alpha` and `--contour-major-alpha`, and `--contour-mask` fades them out (by default, toward the bottom of the screen).

## Contour backdrops

`assets/js/contours.js` generates fake terrain: seeded simplex noise, fractal octaves, domain warping and optional ridges. It then traces height lines with marching squares, smooths them (Chaikin), and simplifies them (Douglas–Peucker). Every page draws its backdrop live in the browser, about 0.1 s for a full-HD screen, so the lines always match the active theme.

- **Change the site-wide look**: open `/tools/heightmap/`, adjust the sliders, press **Copy config for site**, and paste the result over `backdrop` in `assets/js/config.js`.
- **Different terrain per page**: add `data-backdrop-seed="anything"` to `<body>` (or to `<main class="deck">` in an HTML deck, or `seed: anything` at the top of a Markdown deck). Use `data-backdrop="off"` (`backdrop: off` in Markdown) to turn it off.
- **Static images**: the tool also downloads SVG or PNG at any size, for slides, wallpapers or print.

Settings in the tool are stored in the URL, so bookmark a look you like.

## Layout

```
index.html                 About / landing (shell; words are in content/about.md)
tree/  gallery/  presentations/  tools/heightmap/
content/about.md           ← About page text
data/*.yml                 ← site.yml, links.yml, gallery.yml, presentations.yml
presentations/<course>/    decks: NN-topic.md (Markdown) or NN-topic/index.html (HTML)
presentations/view/        viewer that opens Markdown decks
assets/css/themes.css      ← all theme tokens
assets/css/site.css        layout & components
assets/js/config.js        ← theme list + backdrop settings
assets/js/contours.js      terrain + contour engine
assets/js/backdrop.js      page backdrop
assets/js/site.js          header/footer from site.yml, theme picker, backdrop mount
assets/js/content.js       loads YAML and Markdown
assets/js/pages/*.js       per-page rendering from data/*.yml and content/*.md
assets/slides/             slide engine (css + js); markdown.js turns .md decks into slides
assets/vendor/             marked (Markdown) and js-yaml (YAML), unmodified
```
