/* ==========================================================================
   Site-wide settings. Edit freely.
   ========================================================================== */

/** Themes offered in the picker. Each `id` must match a [data-theme] block in assets/css/themes.css. */
export const themes = [
  { id: 'auto',   label: 'Auto' },
  { id: 'paper',  label: 'Paper' },
  { id: 'ink',    label: 'Ink' },
  { id: 'survey', label: 'Survey' },
  { id: 'fjord',  label: 'Fjord' },
  { id: 'moss',   label: 'Moss' },
];

/**
 * Contour backdrop settings. Generate a look you like at /tools/heightmap/,
 * press "Copy config", and paste it over this object.
 * Colours and opacity come from the theme (--contour, --contour-alpha …),
 * so they're not set here.
 *
 * Per-page overrides go on <body>:
 *   data-backdrop="off"           no backdrop on this page
 *   data-backdrop-seed="42"       different terrain, same settings
 */
export const backdrop = {
  seed: 'pj',
  scale: 900,
  octaves: 4,
  persistence: 0.42,
  lacunarity: 2,
  warp: 0.35,
  ridged: 0.1,
  falloff: 0,
  levels: 18,
  majorEvery: 5,
  cell: 7,
  smooth: 2,
  simplify: 0.3,
  minPoints: 14,
  lineWidth: 1,
  majorWidth: 1.8,
};
