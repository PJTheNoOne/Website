# Personal site

A static site for GitHub Pages: plain HTML, CSS and JavaScript. There's no build step and nothing to install.

| Page | URL | Content comes from |
|---|---|---|
| About (landing) | `/` | `index.html` |
| Link tree | `/tree/` | `data/links.json` |
| Gallery | `/gallery/` | `data/gallery.json` + images in `assets/gallery/` |
| Presentations | `/presentations/` | `data/presentations.json` + deck folders |
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

- **Your name and bio**: search for `Your Name` across the HTML files and `data/links.json`. Replace `assets/img/portrait.svg` with a photo and update the `src` attributes.
- **Links (`/tree`)**: edit `data/links.json`. A relative `href` (like `gallery/`) points into this site, and full URLs point elsewhere. Icons available: `link home user mail image slides code book map calendar video chat pen topo tool` (defined in `assets/js/icons.js`).
- **Gallery**: put images in `assets/gallery/` and add entries to `data/gallery.json` (`src`, `alt`, `title`, `caption`, `tags`, plus an optional `thumb` for a smaller preview). The `placeholder` entries draw contour maps. Delete them when you add real images.
- **Courses and decks**: edit `data/presentations.json`.

## Presentations

Each deck is a single HTML file using the tiny engine in `assets/slides/`.

1. Copy `presentations/_template/` to `presentations/<course-id>/<NN-topic>/`.
2. Because that folder is one level deeper, add one `../` to the four asset paths in its `<head>`, and set `data-home="../../"` on `<main class="deck">`.
3. Add it to `data/presentations.json`.

See `presentations/sample-course/01-welcome/` for every option. The basics:

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

Keys: `→`/`Space` next, `←` back, `O` overview, `F` fullscreen, `N` notes, `T` theme, `?` help. Link to a slide with `#/5`. To make a PDF, print the deck (Chrome: **Save as PDF**). Each slide becomes one page with every step shown.

Slides are designed on a fixed 1280×720 canvas and scaled to fit the screen, so they look the same on a laptop and a projector.

## Themes

All colors and fonts are CSS variables in `assets/css/themes.css`. Six themes are included: Auto (follows the OS light/dark setting), Paper, Ink, Survey, Fjord and Moss. Visitors choose one in the header, and the choice is remembered.

To add a theme, copy a `[data-theme="…"]` block, change the values, and add `{ id, label }` to `themes` in `assets/js/config.js`. To change the look site-wide, edit the tokens on `:root` (fonts, `--measure`, `--radius` …).

The contour lines use the theme's `--contour`, `--contour-alpha` and `--contour-major-alpha`, and `--contour-mask` fades them out (by default, toward the bottom of the screen).

## Contour backdrops

`assets/js/contours.js` generates fake terrain: seeded simplex noise, fractal octaves, domain warping and optional ridges. It then traces height lines with marching squares, smooths them (Chaikin), and simplifies them (Douglas–Peucker). Every page draws its backdrop live in the browser, about 0.1 s for a full-HD screen, so the lines always match the active theme.

- **Change the site-wide look**: open `/tools/heightmap/`, adjust the sliders, press **Copy config for site**, and paste the result over `backdrop` in `assets/js/config.js`.
- **Different terrain per page**: add `data-backdrop-seed="anything"` to `<body>` (or to `<main class="deck">` in a slide deck). Use `data-backdrop="off"` to turn it off.
- **Static images**: the tool also downloads SVG or PNG at any size, for slides, wallpapers or print.

Settings in the tool are stored in the URL, so bookmark a look you like.

## Layout

```
index.html                 About / landing
tree/  gallery/  presentations/  tools/heightmap/
data/                      links.json, gallery.json, presentations.json
assets/css/themes.css      ← all theme tokens
assets/css/site.css        layout & components
assets/js/config.js        ← theme list + backdrop settings
assets/js/contours.js      terrain + contour engine
assets/js/backdrop.js      page backdrop
assets/js/site.js          theme picker, nav, backdrop mount
assets/js/pages/*.js       per-page rendering from data/*.json
assets/slides/             slide engine (css + js)
```
