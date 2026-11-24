// Buduje aplikację z src/ do dist/web (GitHub Pages publikuje ten folder):
//   index.html            cała aplikacja w jednym pliku (skrypty i style w środku)
//   manifest.webmanifest  instalacja na telefonie
//   sw.js                 praca bez sieci
//   icons/                ikony z src/icons (rysuje je tools/icons.js)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const A = require(path.join(SRC, 'core.js'));
const PLANJS = require(path.join(SRC, 'plan.js'));
const VIEWS = require(path.join(SRC, 'views.js'));
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
// Kolejność ma znaczenie: każdy plik korzysta z tego, co wystawiły poprzednie (window.ATLAS, PLAN, STORE, VIEWS, CONFIG, CLOUD).
const SCRIPTS = ['core.js', 'ui.js', 'plan.js', 'store.js', 'views.js', 'config.js', 'sync.js', 'trainer.js'];
SCRIPTS.concat(['sw.js']).forEach(f => { if (/<\/script/i.test(read(f))) throw new Error('script close tag inside ' + f); });
const playerCss = read('player.css');
const BUILD_DAY = '2026-11-12';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PLAN = 'https://claude.ai/artifact/1szy4nNPxGoVVRGnDQ9Mgd';

const PH = [
  { ph: 0, id: 'rozgrzewka', tape: 'R', chip: 'Rozgrzewka', name: 'Rozgrzewka', meta: '3–5 minut przed każdym treningiem', c: '--p0' },
  { ph: 1, id: 'faza-1', tape: 'F1', chip: 'Izometria', name: 'Faza 1 · Izometria', meta: 'Codziennie, 2× dziennie, co najmniej 6 h przerwy · ok. 7 dni treningowych', c: '--p1' },
  { ph: 2, id: 'faza-2', tape: 'F2', chip: 'Siła w ruchu', name: 'Faza 2 · Siła w ruchu', meta: '3× w tygodniu, z dniem przerwy, lekkie dni pomiędzy · ok. 3 tygodnie', c: '--p2' },
  { ph: 3, id: 'faza-3', tape: 'F3', chip: 'Cięższe ciągnięcie', name: 'Faza 3 · Cięższe ciągnięcie i praca nad głową', meta: '3× w tygodniu · ok. 3 tygodnie', c: '--p3' },
  { ph: 4, id: 'faza-4', tape: 'F4', chip: 'Podciąganie', name: 'Faza 4 · Powrót do podciągania', meta: 'Drabinka zwisów na kółkach 2× w tygodniu · szczebel wyżej po 2 sesjach bez bólu · ok. 3 tygodnie', c: '--p4' }
];

const ICO = {
  x: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  snd: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.6L8 3.2v9.6L4.6 10H2z" fill="currentColor"/><path class="snd-w" d="M10.4 5.6a3.4 3.4 0 010 4.8M12.3 3.8a6 6 0 010 8.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  l: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  r: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z" fill="currentColor"/></svg>',
  today: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="14.6" r="2.4" fill="currentColor"/></svg>',
  prog: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 20.5l7-11.5 3.6 6 2.4-3.6 6 9.1z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.5 9V3.2l4.2 1.6L9.5 6.3" fill="currentColor"/></svg>',
  scale: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16.5" rx="4.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M7.6 11a4.7 4.7 0 018.8 0z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12 10.6l1.7-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  atlas: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.6" r="2.4" fill="currentColor"/><path d="M12 8v6.5M12 9.2l-5 3.3M12 9.2l5-3.6M12 14.5l-3.5 6.5M12 14.5l3.5 6.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
  week: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  journal: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14.5" height="18" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 3v18M12 8h4.5M12 11.5h4.5M12 15h3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  more: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" fill="currentColor"/></svg>',
  plan: '<svg class="tico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="15" cy="6.5" r="2.1" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="9" cy="12" r="2.1" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17" cy="17.5" r="2.1" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
  ring: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 1.5v6.2M16 1.5v6.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="13.6" r="4.6" fill="none" stroke="var(--accent)" stroke-width="2.6"/><circle cx="16" cy="13.6" r="4.6" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>'
};

function card(ex, idx) {
  const vb = A.view(ex).map(v => v.toFixed(1)).join(' ');
  const r = A.render(ex, A.stillTime(ex), ex.id, { full: true });
  const rung = ex.ph === 4 ? `<p class="rung">Szczebel ${idx + 1}</p>` : '';
  return `<article class="card" data-id="${ex.id}">
<button type="button" class="stage" aria-pressed="false" aria-label="Zatrzymaj lub wznów animację: ${esc(ex.name)}">
<svg viewBox="${vb}" role="img" aria-label="Animacja: ${esc(ex.name)}" preserveAspectRatio="xMidYMid meet">${r.svg}</svg>
<span class="badge"${r.badge ? '' : ' hidden'}>${esc(r.badge || '')}</span>
${ex.view ? `<span class="viewtag">${esc(ex.view)}</span>` : ''}
<span class="paused-tag" hidden>Pauza</span>
</button>
<div class="info">${rung}
<h3>${esc(ex.name)}</h3>
<dl class="dose"><dt>Dawka</dt><dd>${esc(ex.dose)}</dd><dt>Obciążenie</dt><dd>${esc(ex.load)}</dd></dl>
<ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
<button type="button" class="card-go" data-ex="${ex.id}">${ICO.play}Ćwicz z zegarem</button>
</div>
</article>`;
}
const sections = PH.map(p => {
  const list = A.EX.filter(e => e.ph === p.ph);
  return `<section class="phase" id="${p.id}" style="--c:var(${p.c})">
<div class="phase-head"><span class="tape"><span>${p.tape}</span></span><div><h2>${esc(p.name)}</h2><p class="phase-meta">${esc(p.meta)}</p></div></div>
<div class="grid">
${list.map((ex, i) => card(ex, i)).join('\n')}
</div>
</section>`;
}).join('\n');
const chips = PH.map(p => `<li><a class="chip" href="#${p.id}" style="--c:var(${p.c})"><i></i>${esc(p.chip)}</a></li>`).join('');

const painBtns = Array.from({ length: 11 }, (x, v) => `<button type="button" class="p-${v <= 3 ? 'ok' : v <= 5 ? 'warn' : 'bad'}" data-pain="${v}" aria-pressed="false" aria-label="Ból ${v} na 10">${v}</button>`).join('');
const player = `<div id="player" class="player" role="dialog" aria-modal="true" aria-label="Trening" hidden>
<div class="pl-top">
<button type="button" class="pl-pill pl-x" data-pl="exit" aria-label="Zakończ trening">${ICO.x}<span class="pl-pill-t">Zakończ</span></button>
<p class="pl-count"><b id="pl-ex">Ćwiczenie 1</b><span id="pl-left"></span></p>
<button type="button" class="pl-pill pl-snd" data-pl="sound" id="pl-sound">${ICO.snd}<span class="pl-pill-t" id="pl-sound-t">Głos</span></button>
</div>
<div class="pl-prog" aria-hidden="true"><i id="pl-bar"></i></div>
<div class="pl-body" id="pl-body">
<div class="pl-stage">
<svg id="pl-svg" viewBox="0 0 260 195" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animacja ćwiczenia"></svg>
<span class="pl-chip paused" id="pl-paused" hidden>Pauza</span>
<span class="viewtag" id="pl-view" hidden></span>
</div>
<div class="pl-info">
<div class="pl-headline"><span class="pl-tape" id="pl-state">Przygotuj się</span><span class="pl-set" id="pl-set"></span></div>
<div class="pl-clock"><span class="pl-time" id="pl-time">0:10</span><span class="pl-unit" id="pl-unit"></span></div>
<p class="pl-sub" id="pl-sub"></p>
<div class="pl-track" aria-hidden="true"><i id="pl-track"></i></div>
<p class="pl-upnext" id="pl-upnext"></p>
<h2 class="pl-name" id="pl-name"></h2>
<p class="pl-note" id="pl-note"></p>
<ul class="pl-cues" id="pl-cues"></ul>
<div class="pl-aux"><button type="button" class="pl-link" data-pl="more" id="pl-more">+15 s przerwy</button><button type="button" class="pl-link" data-pl="skipex" id="pl-skipex">Pomiń to ćwiczenie</button></div>
<div class="pl-next" id="pl-nx"><svg id="pl-nx-svg" viewBox="0 0 260 195" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg><div><p class="pl-nx-k">Następne ćwiczenie</p><p class="pl-nx-n" id="pl-nx-name"></p><p class="pl-nx-d" id="pl-nx-dose"></p></div></div>
<p class="pl-hint" id="pl-hint" hidden></p>
</div>
</div>
<div class="pl-ctl">
<button type="button" class="pl-btn" data-pl="back" aria-label="Wstecz">${ICO.l}<span class="t">Wstecz</span></button>
<button type="button" class="pl-btn main" data-pl="main" id="pl-main">Pauza</button>
<button type="button" class="pl-btn" data-pl="next" aria-label="Dalej"><span class="t">Dalej</span>${ICO.r}</button>
</div>
<div class="pl-done" id="pl-done" hidden><div class="pl-done-in">
<p class="eyebrow" id="dn-eyebrow"></p>
<h2 id="dn-title" tabindex="-1">Sesja zrobiona</h2>
<section class="dn-pts card" id="dn-pts" aria-live="polite" hidden>
<p class="dn-gain"><b id="dn-gain">+0</b> pkt</p>
<ul class="dn-why" id="dn-why"></ul>
<div id="dn-level"></div>
<div class="dn-badges" id="dn-badges"></div>
</section>
<p class="dn-q" id="dn-q">Jaki był najmocniejszy ból w trakcie?</p>
<div class="pain" role="group" aria-labelledby="dn-q">${painBtns}</div>
<div class="pain-ends"><span>0 · nic</span><span>10 · najgorszy</span></div>
<div class="alert" id="dn-msg" hidden><p id="dn-msg-t"></p></div>
<label class="dn-note" id="dn-note-wrap"><span>Notatka, jeśli coś zauważyłeś (opcjonalnie)</span><input type="text" id="dn-note" maxlength="140" autocomplete="off" placeholder="np. zwis ciągnął pod pachą"></label>
<p class="dn-saved" id="dn-saved"></p>
<button type="button" class="go" data-pl="close">Gotowe</button>
</div></div>
<div class="pl-sheet" id="pl-sheet" hidden><div class="pl-sheet-in" role="alertdialog" aria-modal="true" aria-labelledby="sh-t" aria-describedby="sh-d">
<h2 id="sh-t">Przerwać trening?</h2>
<p id="sh-d"></p>
<button type="button" class="go" data-pl="resume">Wróć do treningu</button>
<button type="button" class="go secondary" data-pl="finish">Zakończ i oceń ból</button>
<button type="button" class="pl-link" data-pl="quit">Wyjdź bez zapisu</button>
</div></div>
<p class="sr-only" id="pl-live" aria-live="polite"></p>
</div>`;

// stan startowy do pierwszego wyświetlenia (trener od razu przelicza go na dziś)
const st0 = PLANJS.defaults(BUILD_DAY);
const pr0 = PLANJS.progress(st0, BUILD_DAY);
const css = read('page.css');

const TABS = [['dzis', 'Dziś', ICO.today], ['tydzien', 'Tydzień', ICO.week], ['dziennik', 'Dziennik', ICO.journal], ['postep', 'Postęp', ICO.prog], ['wiecej', 'Więcej', ICO.more]];
const tabBtns = TABS.map((t, i) => `<button type="button" role="tab" id="tb-${t[0]}" data-tab="${t[0]}" aria-controls="tab-${t[0]}" aria-selected="${i ? 'false' : 'true'}"${i ? ' tabindex="-1"' : ''}>${t[2]}<span>${t[1]}</span></button>`).join('\n');
// Panele budowane przez trenera; podstrony z Więcej mają etykietę zakładki Więcej.
const panel = (id, tabId) => `<section class="panel" id="tab-${id}" role="tabpanel" aria-labelledby="tb-${tabId || id}" hidden><div class="wrap" id="${id}-in"></div></section>`;

const LIGHT_BG = '#F2F4F1', DARK_BG = '#0C110F';
const icons = fs.existsSync(path.join(SRC, 'icons')) ? fs.readdirSync(path.join(SRC, 'icons')).filter(f => /\.png$/.test(f)).sort() : [];
const hasIcon = f => icons.indexOf(f) >= 0;
if (!icons.length) console.warn('src/icons/ has no PNG icons: run  node tools/icons.js');

const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Treningownia</title>
<meta name="description" content="Plan treningowy, dziennik i postęp">
<meta name="theme-color" content="${LIGHT_BG}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${DARK_BG}" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
${hasIcon('icon-192.png') ? '<link rel="icon" type="image/png" href="icons/icon-192.png">\n' : ''}${hasIcon('apple-touch-180.png') ? '<link rel="apple-touch-icon" href="icons/apple-touch-180.png">\n' : ''}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" media="print" onload="this.media='all'">
<style>
${css}
${playerCss}
</style>
</head>
<body>
<header class="app-head"><div class="wrap">
<p class="brand"><span class="brand-ico">${ICO.ring}</span><span class="brand-t"><b>Treningownia</b><small>plan · dziennik · postęp</small></span></p>
<div id="hdr-prog" class="hdr-prog">${VIEWS.headChip(pr0)}</div>
</div></header>
<nav class="tabs" aria-label="Sekcje"><div class="wrap"><div class="tablist" role="tablist">
${tabBtns}
</div></div></nav>
<main>
<section class="panel" id="tab-dzis" role="tabpanel" aria-labelledby="tb-dzis"><div class="wrap" id="dzis-in">
${VIEWS.todayHTML(st0, BUILD_DAY, '', 0, pr0, {})}
</div></section>
${panel('tydzien')}
${panel('dziennik')}
${panel('postep')}
${panel('wiecej')}
${panel('waga', 'wiecej')}
<section class="panel" id="tab-atlas" role="tabpanel" aria-labelledby="tb-wiecej" hidden>
<div class="wrap atlas-intro">
<header class="t-head"><button type="button" class="back-btn" data-act="tab" data-v="wiecej">${ICO.l}Więcej</button><p class="eyebrow">Atlas</p><h1 class="t-title">Wszystkie ćwiczenia w ruchu</h1></header>
<p class="lede">Każde ćwiczenie z planu jako zapętlona animacja. Czerwona ręka to lewa, kontuzjowana, a przerywana linia pokazuje drogę dłoni. Dotknij animacji, żeby ją zatrzymać, albo przećwicz ćwiczenie z zegarem. Ciężary są dobrane do 65 kg masy ciała.</p>
<ul class="legend" aria-label="Legenda">
<li><svg viewBox="0 0 30 16" aria-hidden="true"><line x1="4" y1="8" x2="26" y2="8" stroke-width="7" stroke-linecap="round" class="lg-arm"/></svg>Lewa ręka</li>
<li><svg viewBox="0 0 30 16" aria-hidden="true"><path d="M3 12 Q15 0 27 12" class="trail"/></svg>Droga dłoni</li>
<li><svg viewBox="0 0 30 16" aria-hidden="true"><g class="arrow"><line x1="3" y1="8" x2="19" y2="8" stroke-width="3"/><polygon points="28,8 18,2.5 18,13.5"/></g></svg>Kierunek nacisku</li>
<li><svg viewBox="0 0 30 16" aria-hidden="true"><circle cx="15" cy="8" r="7" class="glowdot"/></svg>Tu pracuje lub ciągnie</li>
</ul>
</div>
<div class="subbar"><div class="wrap">
<ul class="chips">${chips}</ul>
<div class="ctl"><button type="button" class="pill" id="play" aria-pressed="false">Zatrzymaj animacje</button><button type="button" class="pill" id="speed" aria-pressed="false">Tempo 1×</button></div>
</div></div>
<div class="wrap">
${sections}
</div>
</section>
${panel('plan', 'wiecej')}
${panel('ustawienia', 'wiecej')}
</main>
<footer><div class="wrap">
<p>Progi przejścia między fazami, zasady bólu i suplementy są w planie: <a href="${PLAN}">Plan rehabilitacji lewego barku</a>.</p>
<p>Animacje pokazują pozycję i kierunek ruchu. Nie zastępują oceny fizjoterapeuty.</p>
</div></footer>
<p class="toast" id="toast" role="status" aria-live="polite" hidden></p>
${player}
${SCRIPTS.map(f => '<script>\n' + read(f) + '\n</script>').join('\n')}
</body>
</html>
`;

const WEB = path.join(DIST, 'web');
fs.rmSync(WEB, { recursive: true, force: true });
fs.mkdirSync(path.join(WEB, 'icons'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'index.html'), html);
icons.forEach(f => fs.copyFileSync(path.join(SRC, 'icons', f), path.join(WEB, 'icons', f)));

// Manifest: instalacja na telefonie (ikona na ekranie głównym, pełny ekran).
const manifest = {
  name: 'Treningownia', short_name: 'Treningownia', description: 'Plan treningowy, dziennik i postęp', lang: 'pl', dir: 'ltr',
  id: './', start_url: './', scope: './', display: 'standalone', background_color: LIGHT_BG, theme_color: LIGHT_BG,
  icons: [
    hasIcon('icon-192.png') && { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    hasIcon('icon-512.png') && { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    hasIcon('maskable-512.png') && { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ].filter(Boolean)
};
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(WEB, 'manifest.webmanifest'), manifestText);

// Service worker: nazwa pamięci podręcznej zależy od treści, więc każda nowa wersja zastępuje starą.
const files = ['./', 'manifest.webmanifest'].concat(icons.map(f => 'icons/' + f));
const hash = crypto.createHash('sha256').update(html).update(manifestText).update(icons.join()).digest('hex').slice(0, 10);
const sw = read('sw.js').replace("'__VERSION__'", JSON.stringify(hash)).replace("['__FILES__']", JSON.stringify(files));
if (/__VERSION__|__FILES__/.test(sw)) throw new Error('sw.js placeholders not replaced');
fs.writeFileSync(path.join(WEB, 'sw.js'), sw);

console.log('dist/web/index.html', (html.length / 1024).toFixed(0) + ' KB', A.EX.length, 'exercises,', icons.length, 'icons, version', hash);
