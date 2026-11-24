// Rysuje ikony aplikacji (PNG) do src/icons/: logo z kółkami gimnastycznymi na ciemnym tle.
// Uruchom raz po zmianie logo: node tools/icons.js   (potrzebuje Playwright, jak testy). Pliki trafiają do gita.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'src', 'icons');
const BG = '#15201B', RING = '#E7EDEA', ACCENT = '#FF6A50';

// size: bok w px; inset: ile miejsca od krawędzi zostawić dla logo (maskable: logo w bezpiecznym kole 80%);
// round: promień narożnika tła (0 = pełny kwadrat, Android sam przycina ikonę maskable)
function svg(size, inset, round) {
  const s = size - 2 * inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${round}" fill="${BG}"/>
<g transform="translate(${inset} ${inset}) scale(${s / 24})">
<path d="M8 2.2v6.1M16 2.2v6.1" stroke="${RING}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
<circle cx="8" cy="13.9" r="4.5" fill="none" stroke="${ACCENT}" stroke-width="2.3"/>
<circle cx="16" cy="13.9" r="4.5" fill="none" stroke="${RING}" stroke-width="2.3"/>
</g></svg>`;
}
const SET = [
  ['icon-192.png', 192, 26, 38],
  ['icon-512.png', 512, 70, 100],
  ['maskable-512.png', 512, 118, 0],
  ['apple-touch-180.png', 180, 26, 0]
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ deviceScaleFactor: 1 });
  for (const [name, size, inset, round] of SET) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg(size, inset, round)}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(OUT, name), omitBackground: true });
    console.log('src/icons/' + name);
  }
  await b.close();
})();
