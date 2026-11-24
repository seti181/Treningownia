/* Bloki treningowe: biblioteka (wbudowane + własne), domyślny tydzień, plan konkretnego dnia (przeniesienia, pominięcia),
   dziennik bloków i punkty. Czyste funkcje na stanie, bez DOM. */
(function (G) {
'use strict';
const PL = G.PLAN;
const A = G.ATLAS;

// Rodzaje treningu: kolor (token z page.css), litera na taśmie, punkty za zrobiony blok.
const TRACKS = {
  bieg: { name: 'Bieg', short: 'Bieg', tape: 'B', c: '--p2', pts: 15 },
  wspin: { name: 'Wspinanie', short: 'Wspin.', tape: 'W', c: '--p4', pts: 15 },
  palce: { name: 'Palce', short: 'Palce', tape: 'P', c: '--p3', pts: 12 },
  sila: { name: 'Siła', short: 'Siła', tape: 'S', c: '--accent', pts: 12 },
  rozc: { name: 'Rozciąganie', short: 'Rozc.', tape: 'R', c: '--p1', pts: 6 }
};
const TRACK_IDS = Object.keys(TRACKS);
// timed: ćwiczenia z zegarem w odtwarzaczu; run: bieg (dystans, czas); climb: wspinanie (drogi, wycena); simple: tylko czas
const KINDS = ['timed', 'run', 'climb', 'simple'];
const RATE_PTS = 2, WEEK_PTS = 25, WEEK_RUNS = 3, WEEK_CLIMBS = 3;
const PLACES = ['Hala', 'Ściana', 'Skała', 'TRS'];
// Styl przejścia drogi. Próba = droga nieprzejdzona: liczy się do liczby dróg, nie do wyceny.
const STYLES = [{ id: 'os', name: 'OS' }, { id: 'fl', name: 'Flash' }, { id: 'rp', name: 'RP' }, { id: 'pr', name: 'Próba' }];
const STYLE_IDS = STYLES.map(s => s.id);
const SENT = s => s === 'os' || s === 'fl' || s === 'rp';
const styleName = id => (STYLES.find(s => s.id === id) || { name: id }).name;
// Lista dróg sesji: liczba dróg, najtrudniejsza przejdzona, najtrudniejsza OS albo flash.
function routeSum(rl) {
  let best = -1, os = -1;
  (rl || []).forEach(r => {
    const i = GRADE_LIST.indexOf(r.g);
    if (!SENT(r.s)) return;
    best = Math.max(best, i);
    if (r.s !== 'rp') os = Math.max(os, i);
  });
  return { n: (rl || []).length, grade: best >= 0 ? GRADE_LIST[best] : null, os: os >= 0 ? GRADE_LIST[os] : null };
}
const CLIMB_NOTE = 'Bez blokowania i dalekich sięgnięć lewą ręką, bez podciągania. Ból barku powyżej 3/10: zejdź z drogi.';
const climbNote = st => (st.rehabDone ? '' : CLIMB_NOTE);

// Ćwiczenia spoza atlasu rehabilitacji. Animacje są w silniku (ATLAS.MOVES); bez animacji (plain) odtwarzacz pokazuje ikonę.
const CAT_LIST = [
  ['rozgrzewka-palce', 'Rozgrzewka palców', 'palce', ['Zaciskaj i otwieraj dłonie, krąż nadgarstkami', 'Kilka lekkich zwisów na dużym chwycie, stopy na ziemi', 'Palce mają być ciepłe przed pierwszym zwisem']],
  ['zwis-20', 'Zwis na listwie 20 mm', 'palce', ['Obie ręce, ręce proste, bez podciągania', 'Łopatki lekko w dół, barki daleko od uszu', 'Stopy na krześle odejmują ciężar: ma być ok. 7 z 10']],
  ['zwis-15', 'Zwis na listwie 15 mm', 'palce', ['Obie ręce, ręce proste, bez podciągania', 'Łopatki lekko w dół, barki daleko od uszu', 'Stopy na krześle odejmują ciężar']],
  ['pompka-klasyczna', 'Pompka', 'sila', ['Ciało w jednej linii od głowy do pięt', 'Łokcie ok. 45° od tułowia', 'W dół do lekkiego dotknięcia klatką, w górę do prostych rąk']],
  ['kolka-podpor', 'Podpór na kółkach', 'sila', ['Ręce proste, kółka przy biodrach', 'Barki w dół, z dala od uszu', 'Kółka lekko na zewnątrz, ciało nieruchome']],
  ['kolka-pompka', 'Pompka na kółkach', 'sila', ['Kółka nisko, kilka centymetrów nad ziemią', 'Kółka blisko siebie, łokcie przy tułowiu', 'Bez bólu barku; łatwiej: na kolanach']],
  ['kolka-deska', 'Deska na kółkach', 'sila', ['Przedramiona w kółkach, ciało w linii', 'Brzuch napięty, biodra nie opadają', 'Kółka nieruchome']],
  ['kolka-kolana', 'Przyciąganie kolan, stopy w kółkach', 'sila', ['Podpór na dłoniach, stopy w kółkach', 'Przyciągnij kolana do klatki, wróć powoli', 'Plecy proste, barki nad dłońmi']],
  ['deska', 'Deska', 'sila', ['Przedramiona pod barkami', 'Ciało w jednej linii, brzuch napięty', 'Oddychaj spokojnie']],
  ['deska-bok', 'Deska bokiem', 'sila', ['Łokieć pod barkiem, biodra w górze', 'Na zmianę: lewa, potem prawa strona', 'Na lewym boku przerwij, gdy bark boli']],
  ['hollow', 'Łódka (hollow)', 'sila', ['Lędźwia przyklejone do podłogi', 'Ręce i nogi nad ziemią, łatwiej: kolana ugięte', 'Głowa lekko uniesiona']],
  ['dead-bug', 'Martwy robak', 'sila', ['Leżenie na plecach, ręce w górę, kolana nad biodrami', 'Na zmianę prostuj przeciwną rękę i nogę', 'Lędźwia cały czas przy podłodze']],
  ['r-lydki', 'Rozciąganie łydek', 'rozc', ['Dłonie o ścianę, noga zakroczna prosta', 'Pięta na ziemi', 'Lewa, potem prawa']],
  ['r-tyl-uda', 'Rozciąganie tyłu uda', 'rozc', ['Noga na podwyższeniu, kolano proste', 'Pochyl się z prostymi plecami', 'Lewa, potem prawa']],
  ['r-przod-uda', 'Rozciąganie przodu uda', 'rozc', ['Pięta do pośladka, kolana razem', 'Biodro lekko w przód', 'Lewa, potem prawa']],
  ['r-biodra', 'Rozciąganie zginaczy biodra', 'rozc', ['Wykrok, kolano tylnej nogi na ziemi', 'Biodra w przód, tułów prosto', 'Lewa, potem prawa']],
  ['r-posladki', 'Rozciąganie pośladków', 'rozc', ['Leżenie, kostka na kolanie drugiej nogi', 'Przyciągnij nogę do klatki', 'Lewa, potem prawa']],
  ['r-plecy', 'Pozycja dziecka', 'rozc', ['Klęk, pośladki na piętach', 'Ręce daleko w przód, czoło w dół', 'Oddychaj w plecy']],
  ['trucht', 'Trucht', 'bieg', ['Spokojnie: da się rozmawiać pełnymi zdaniami', 'Krótki krok, luźne ramiona', 'Oddech nosem i ustami, bez zadyszki']],
  ['bieg-szybko', 'Bieg szybki', 'bieg', ['Mocno, ale równo od początku do końca', 'Wyprostowana sylwetka, praca ramion', 'Nie sprintuj: tempo ma wytrzymać cały odcinek']],
  ['marsz', 'Marsz', 'bieg', ['Spokojny marsz, oddech wraca', 'Ramiona luźno', 'Przygotuj się do następnego odcinka']]
];
const CAT = {};
CAT_LIST.forEach(c => {
  const m = A && A.MOVES ? A.MOVES.find(x => x.id === c[0]) : null;
  CAT[c[0]] = Object.assign(m || { plain: true }, { id: c[0], name: c[1], t: c[2], cues: c[3] });
});

const H = (ex, sets, hold, rest, note) => ({ ex, kind: 'hold', sets, hold, rest, note: note || '' });
const R = (ex, sets, reps, rest, note) => ({ ex, kind: 'reps', sets, reps, rest, note: note || '' });
const T = (ex, dur, note) => ({ ex, kind: 'time', sets: 1, dur, note: note || '' });
// odcinki biegu: lbl to napis i głos zamiast „Ćwicz”/„Trzymaj”, restLbl zamiast „Przerwa”, measure = czas tego odcinka idzie do dziennika
const RUN = (o, extra) => Object.assign(o, extra);
const BUILTIN = [
  { id: 'bieg-spokojny', name: 'Bieg spokojny', kind: 'run', t: 'bieg', min: 40, zone: 'easy', gap: 5, note: '30–40 min tak spokojnie, żeby dało się rozmawiać (wysiłek 3–4 z 10).',
    items: [RUN(T('trucht', 2400, 'Spokojnie: da się rozmawiać'), { lbl: 'Trucht' })] },
  { id: 'bieg-przebiezki', name: 'Bieg z przebieżkami', kind: 'run', t: 'bieg', min: 35, zone: 'easy', gap: 10, after: 'test', note: '30 min spokojnie, potem 6 × 20 s szybciej; między nimi marsz, aż oddech wróci.',
    items: [RUN(T('trucht', 1800, 'Spokojnie'), { lbl: 'Trucht' }), RUN(H('bieg-szybko', 6, 20, 60, 'Szybko i luźno, nie sprint'), { lbl: 'Szybko', restLbl: 'Marsz' })] },
  { id: 'bieg-dlugi', name: 'Długi spokojny bieg', kind: 'run', t: 'bieg', min: 55, zone: 'easy', gap: 5, note: '50–60 min, wysiłek 3–4 z 10. Ma być przyjemnie, nie ciężko.',
    items: [RUN(T('trucht', 3300, 'Spokojnie, równo'), { lbl: 'Trucht' })] },
  { id: 'bieg-test5', name: 'Test 5 km', kind: 'run', t: 'bieg', min: 40, km: 5, zone: 'test', gap: 10, note: 'Po 10 min rozgrzewki: 5 km możliwie równym, mocnym tempem. Na mecie naciśnij „Meta”. Z wyniku policzymy tempa treningowe.',
    items: [RUN(T('trucht', 600, 'Rozgrzewka, ostatnie 2 min trochę szybciej'), { lbl: 'Rozgrzewka' }), RUN(R('bieg-szybko', 1, '5 km', 0, 'Równo i mocno, do mety'), { lbl: 'Test', doneLbl: 'Meta', measure: true, est: 1560 }),
      RUN(T('marsz', 300, 'Schłodzenie'), { lbl: 'Marsz' })] },
  { id: 'bieg-tempo', name: 'Bieg w tempie progowym', kind: 'run', t: 'bieg', min: 40, zone: 'tempo', gap: 10, after: 'test', note: '10 min spokojnie, 20 min w tempie progowym (mocno, ale do utrzymania), 10 min spokojnie.',
    items: [RUN(T('trucht', 600, 'Rozgrzewka'), { lbl: 'Trucht' }), RUN(T('bieg-szybko', 1200, 'Tempo progowe, równo'), { lbl: 'Tempo' }), RUN(T('trucht', 600, 'Schłodzenie'), { lbl: 'Trucht' })] },
  { id: 'bieg-interwaly', name: 'Interwały 6 × 3 min', kind: 'run', t: 'bieg', min: 50, zone: 'interval', gap: 10, after: 'test', note: '10 min spokojnie, 6 × 3 min szybko z 2 min truchtu, 10 min spokojnie.',
    items: [RUN(T('trucht', 600, 'Rozgrzewka'), { lbl: 'Trucht' }), RUN(H('bieg-szybko', 6, 180, 120, 'Tempo interwałowe'), { lbl: 'Szybko', restLbl: 'Trucht' }), RUN(T('trucht', 600, 'Schłodzenie'), { lbl: 'Trucht' })] },
  { id: 'bieg-narastajacy', name: 'Bieg z narastającym tempem', kind: 'run', t: 'bieg', min: 45, zone: 'steady', gap: 5, after: 'test', note: '20 min spokojnie, 15 min średnio, 10 min w tempie progowym.',
    items: [RUN(T('trucht', 1200, 'Spokojnie'), { lbl: 'Trucht' }), RUN(T('trucht', 900, 'Średnio'), { lbl: 'Średnio' }), RUN(T('bieg-szybko', 600, 'Tempo progowe'), { lbl: 'Tempo' })] },
  { id: 'wspinanie', name: 'Wspinanie', kind: 'climb', t: 'wspin', min: 90, note: 'Hala, ściana, skała albo TRS. Najpierw łatwe drogi na rozgrzewkę.' },
  { id: 'palce-20', name: 'Zwisy na palcach 20 mm', kind: 'timed', t: 'palce', min: 15, gap: 60, note: 'Obie ręce, ręce proste, bez podciągania. Przed wspinaniem albo osobno.',
    items: [T('rozgrzewka-palce', 180), H('zwis-20', 6, 10, 120, 'Ok. 7 z 10 · stopy na krześle, jeśli trzeba')] },
  { id: 'sila-pompki', name: 'Pompki', kind: 'timed', t: 'sila', min: 15, gap: 40, note: 'Pompki bez bólu barku. Ostatnie powtórzenie ma być jeszcze czyste.',
    items: [T('rozgrzewka', 120, 'Luźno, w zakresie bez bólu'), R('pompka-klasyczna', 4, '10–12', 90, 'Masa ciała'), R('pompka-plus', 2, '12', 60, 'Masa ciała')] },
  { id: 'sila-kolka', name: 'Kółka: barki i core', kind: 'timed', t: 'sila', min: 20, gap: 40, note: 'Kółka nisko. Tylko pchanie i core, bez podciągania.',
    items: [T('rozgrzewka', 120, 'Luźno, w zakresie bez bólu'), H('kolka-podpor', 3, 15, 60, 'Kółka na wysokości bioder'), R('kolka-pompka', 3, '8', 90, 'Kółka nisko'),
      H('kolka-deska', 3, 30, 45, 'Przedramiona w kółkach'), R('kolka-kolana', 3, '10', 60, 'Stopy w kółkach')] },
  { id: 'sila-core', name: 'Core', kind: 'timed', t: 'sila', min: 12, gap: 20, note: 'Brzuch i plecy, bez obciążania barku.',
    items: [H('deska', 3, 30, 30), H('deska-bok', 4, 20, 20, 'Na zmianę: lewa, prawa'), H('hollow', 3, 20, 30), R('dead-bug', 3, '10', 30, 'Na każdą stronę')] },
  // Odblokowane dopiero, gdy właściciel zakończy rehabilitację (st.rehabDone). Dawki z ostatniej fazy planu rehabilitacji.
  { id: 'sila-podciaganie', name: 'Podciąganie', kind: 'timed', t: 'sila', min: 25, gap: 60, afterRehab: true, note: 'Po rehabilitacji: daleko od upadku mięśniowego, łopatki w dół przed każdym powtórzeniem.',
    items: [T('rozgrzewka', 120, 'Luźno, w zakresie bez bólu'), H('zwis-aktywny', 3, 10, 60, 'Łopatki w dół przez cały zwis'), R('podciaganie', 4, '3–5', 150, 'Daleko od upadku mięśniowego'),
      R('australijskie', 3, '8–10', 90, 'Ciało proste, klatka do kółek')] },
  { id: 'rozc-bieg', name: 'Rozciąganie po biegu', kind: 'timed', t: 'rozc', min: 10, gap: 10, note: 'Zaraz po biegu, spokojnie, do lekkiego ciągnięcia.',
    items: [H('r-lydki', 2, 45, 10, 'Lewa, potem prawa'), H('r-tyl-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-przod-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-biodra', 2, 45, 10, 'Lewa, potem prawa')] },
  { id: 'rozc-pelne', name: 'Rozciąganie pełne', kind: 'timed', t: 'rozc', min: 20, gap: 10, note: 'Całe ciało, z rozciąganiem pod pachą z rehabilitacji.',
    items: [H('r-lydki', 2, 45, 10, 'Lewa, potem prawa'), H('r-tyl-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-przod-uda', 2, 45, 10, 'Lewa, potem prawa'),
      H('r-biodra', 2, 45, 10, 'Lewa, potem prawa'), H('r-posladki', 2, 45, 10, 'Lewa, potem prawa'), H('r-plecy', 2, 45, 10),
      H('rozciaganie-pacha', 3, 25, 10, 'Do lekkiego ciągnięcia pod lewą pachą')] }
];
const BUILTIN_BY = {};
BUILTIN.forEach(b => { BUILTIN_BY[b.id] = b; });
// Domyślny tydzień (0 = niedziela): 3 biegi (na razie tylko spokojne, do testu 5 km), 3 wspinania, siła i rozciąganie w sobotę.
const DEFAULT_WEEK = {
  1: ['bieg-spokojny', 'rozc-bieg'], 2: ['palce-20', 'wspinanie'], 3: ['bieg-spokojny', 'rozc-bieg'], 4: ['wspinanie'],
  5: ['bieg-dlugi', 'rozc-bieg'], 6: ['sila-pompki', 'sila-kolka', 'rozc-pelne'], 0: ['wspinanie']
};

const clone = o => JSON.parse(JSON.stringify(o));
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);

// ---------- biblioteka ----------
function exOf(id) { return (A && A.EX.find(e => e.id === id)) || CAT[id] || null; }
function exName(id) { const e = exOf(id); return e ? e.name : id; }
// Wszystkie ćwiczenia do wyboru w edytorze: najpierw spoza atlasu (pogrupowane), potem atlas rehabilitacji.
function catalog() {
  const out = CAT_LIST.map(c => ({ id: c[0], name: c[1], group: TRACKS[c[2]].name }));
  if (A) A.EX.forEach(e => out.push({ id: e.id, name: e.name, group: 'Atlas rehabilitacji' }));
  return out;
}
function getBlock(st, id) {
  const o = st.blocks && st.blocks[id];
  if (o && !o.del) return o;
  return BUILTIN_BY[id] || null;
}
const isBuiltin = id => !!BUILTIN_BY[id];
const isEdited = (st, id) => isBuiltin(id) && !!(st.blocks && st.blocks[id] && !st.blocks[id].del);
// Ćwiczenia z ciągnięciem tylko po rehabilitacji.
const unlocked = (st, b) => !b.afterRehab || !!st.rehabDone;
function allBlocks(st) {
  const out = BUILTIN.filter(b => unlocked(st, b)).map(b => getBlock(st, b.id));
  Object.keys(st.blocks || {}).sort().forEach(id => { const b = st.blocks[id]; if (!isBuiltin(id) && b && !b.del) out.push(b); });
  return out;
}
function newId(now) { return 'u' + Math.round(now || Date.now()).toString(36); }
function saveBlock(st, b, now) {
  st.blocks = st.blocks || {};
  const x = clone(b);
  if (!x.id) x.id = newId(now);
  x.at = now || Date.now();
  st.blocks[x.id] = x;
  return x.id;
}
// Własny blok znika; wbudowany wraca do wersji domyślnej (znacznik usunięcia zmiany).
function deleteBlock(st, id, now) { st.blocks = st.blocks || {}; st.blocks[id] = { del: true, at: now || Date.now() }; }
function copyBlock(st, id, now) {
  const b = getBlock(st, id);
  if (!b) return null;
  const x = clone(b);
  delete x.at;
  x.id = newId(now);
  x.name = (b.name + ' (kopia)').slice(0, 60);
  return saveBlock(st, x, now);
}
function blockSeconds(b) {
  if ((b.kind === 'timed' || b.kind === 'run') && b.items && b.items.length) return PL.seconds({ gap: b.gap == null ? 30 : b.gap, blocks: b.items });
  return (b.min || 0) * 60;
}
function blockMinutes(b) { return Math.max(1, Math.round(blockSeconds(b) / 60)); }
// Sesja dla odtwarzacza.
function sessionOf(b, key) {
  return { id: 'blok', label: TRACKS[b.t].name, short: '', title: b.name, gap: b.gap == null ? 30 : b.gap, blocks: clone(b.items || []), blockKey: key, blockId: b.id, track: b.t, run: b.kind === 'run' };
}

// ---------- tydzień i dni ----------
const pattern = st => st.week || DEFAULT_WEEK;
// Plan dnia: zapisana zmiana dnia (przeniesienie, pominięcie, dodanie) albo domyślny tydzień.
function dayItems(st, d) {
  const o = st.days && st.days[d];
  if (o && !o.del && Array.isArray(o.items)) return o.items.map(x => ({ k: x.k, b: x.b, skip: !!x.skip }));
  return (pattern(st)[PL.dow(d)] || []).map((b, i) => ({ k: 'p' + i + '-' + b, b, skip: false }));
}
function entryOf(st, d, k) { const l = st.blog && st.blog[d]; const e = l && l[k]; return e && !e.del ? e : null; }
// Dzień do wyświetlenia: zaplanowane bloki (z wpisem, jeśli jest) i dopisane poza planem.
function dayView(st, d) {
  const items = dayItems(st, d).map(x => Object.assign(x, { block: getBlock(st, x.b), entry: entryOf(st, d, x.k) }));
  const seen = {};
  items.forEach(x => { seen[x.k] = 1; });
  const l = (st.blog && st.blog[d]) || {};
  Object.keys(l).sort((a, b) => (l[a].at || 0) - (l[b].at || 0)).forEach(k => {
    if (seen[k] || !l[k] || l[k].del) return;
    items.push({ k, b: l[k].b, skip: false, extra: true, block: getBlock(st, l[k].b), entry: l[k] });
  });
  return items;
}
function setDay(st, d, items, now) { st.days = st.days || {}; st.days[d] = { items: items.map(x => { const o = { k: x.k, b: x.b }; if (x.skip) o.skip = true; return o; }), at: now || Date.now() }; }
function uniqueKey(items, k) { let n = k, i = 2; while (items.some(x => x.k === n)) n = k + '-' + i++; return n; }
function addItem(st, d, b, now) {
  const items = dayItems(st, d);
  const k = uniqueKey(items, 'a' + Math.round(now || Date.now()).toString(36));
  items.push({ k, b });
  setDay(st, d, items, now);
  return k;
}
function removeItem(st, d, k, now) { setDay(st, d, dayItems(st, d).filter(x => x.k !== k), now); }
function skipItem(st, d, k, v, now) { setDay(st, d, dayItems(st, d).map(x => (x.k === k ? Object.assign(x, { skip: !!v }) : x)), now); }
function moveItem(st, from, k, to, now) {
  if (from === to) return k;
  const src = dayItems(st, from), it = src.find(x => x.k === k);
  if (!it) return null;
  setDay(st, from, src.filter(x => x.k !== k), now);
  const dst = dayItems(st, to);
  const nk = uniqueKey(dst, k);
  dst.push({ k: nk, b: it.b });
  setDay(st, to, dst, now);
  return nk;
}
function setPattern(st, dw, list, now) {
  const w = clone(pattern(st));
  w[dw] = list.slice(0, 8);
  st.week = w;
  st.weekAt = now || Date.now();
}

// ---------- dziennik bloków ----------
// data: { dur (s), km, sec, rpe, pain, grade, routes, rl: [{ g, s }], place, kg, mm, note, partial }
function logBlock(st, d, k, b, data, now) {
  st.blog = st.blog || {};
  const e = { b: b.id, t: b.t, kind: b.kind, name: b.name, done: true, at: now || Date.now() };
  ['dur', 'km', 'sec', 'rpe', 'pain', 'routes', 'kg', 'mm'].forEach(f => { if (typeof data[f] === 'number' && isFinite(data[f])) e[f] = data[f]; });
  if (Array.isArray(data.rl) && data.rl.length) e.rl = data.rl.map(r => ({ g: r.g, s: r.s }));
  ['grade', 'place', 'note'].forEach(f => { if (typeof data[f] === 'string' && data[f]) e[f] = data[f]; });
  if (data.partial) e.partial = true;
  (st.blog[d] = st.blog[d] || {})[k] = e;
  return e;
}
function delLog(st, d, k, now) { st.blog = st.blog || {}; (st.blog[d] = st.blog[d] || {})[k] = { del: true, at: now || Date.now() }; }
function entries(st) {
  const out = [];
  Object.keys(st.blog || {}).sort().forEach(d => {
    const l = st.blog[d];
    Object.keys(l).sort((a, b) => (l[a].at || 0) - (l[b].at || 0)).forEach(k => { const e = l[k]; if (e && !e.del && e.done) out.push({ d, k, e }); });
  });
  return out;
}
function entryPoints(e) {
  const tr = TRACKS[e.t];
  let p = tr ? tr.pts : 8;
  if (e.partial) p = Math.round(p / 2);
  if (e.rpe != null || e.pain != null) p += RATE_PTS;
  return p;
}
// ---------- chwytotablica: obciążenie ----------
// kg we wpisie: ujemne = odciążenie (stopy na wadze łazienkowej), dodatnie = dociążenie (dopiero po rehabilitacji), 0 = pełna waga.
// mm: listwa (20 albo 15). Procent wagi liczy się z wagi z najbliższego dnia, nigdy nie jest zapisywany.
const HANG_MM = { 'zwis-20': 20, 'zwis-15': 15 };
function hangOf(b) {
  const items = (b && b.items) || [];
  const i = items.findIndex(x => x.kind === 'hold' && HANG_MM[x.ex]);
  return i < 0 ? null : { i, x: items[i], mm: HANG_MM[items[i].ex] };
}
// Obciążenie na następny trening: nowsze z dwóch (cel w bloku po przyjętej propozycji, ostatni wpis bloku na tej listwie).
function hangKg(st, b) {
  const h = hangOf(b);
  if (!h) return null;
  const last = entries(st).filter(x => x.e.b === b.id && typeof x.e.kg === 'number' && x.e.mm === h.mm).slice(-1)[0];
  if (last && (last.e.at || 0) >= (b.at || 0)) return last.e.kg;
  return typeof h.x.kg === 'number' ? h.x.kg : last ? last.e.kg : null;
}
// Waga z najbliższego dnia (najwyżej 30 dni od d); null bez danych.
function bodyKg(st, d) {
  let best = null, gap = 31;
  Object.keys(st.weight || {}).forEach(k => {
    const w = st.weight[k];
    if (!w || w.del || typeof w.kg !== 'number') return;
    const g = Math.abs(PL.diff(k, d));
    if (g < gap || (g === gap && k < d)) { gap = g; best = w.kg; }
  });
  return best;
}
function hangPct(st, d, e) {
  if (!e || typeof e.kg !== 'number') return null;
  const bw = bodyKg(st, d);
  return bw ? Math.round((bw + e.kg) / bw * 100) : null;
}
const kgNum = v => String(Math.round(Math.abs(v) * 10) / 10).replace('.', ',');
const kgText = kg => (kg === 0 ? 'pełna waga' : (kg < 0 ? 'odciążenie ' : 'dociążenie ') + kgNum(kg) + ' kg');

// Poniedziałek tygodnia, w którym jest dzień d.
function weekStart(d) { return PL.addDays(d, -((PL.dow(d) + 6) % 7)); }
function weekStats(st, d) {
  const from = weekStart(d), to = PL.addDays(from, 6);
  const s = { from, to, runs: 0, climbs: 0, km: 0, blocks: 0, minutes: 0 };
  entries(st).forEach(x => {
    if (x.d < from || x.d > to) return;
    s.blocks++;
    if (x.e.t === 'bieg') { s.runs++; s.km += x.e.km || 0; }
    if (x.e.t === 'wspin') s.climbs++;
    s.minutes += Math.round((x.e.dur || 0) / 60);
  });
  s.km = Math.round(s.km * 10) / 10;
  s.full = s.runs >= WEEK_RUNS && s.climbs >= WEEK_CLIMBS;
  return s;
}

// ---------- wyzwania tygodnia ----------
// Co tydzień (pn–nd) 4 wyzwania: pełny tydzień, kilometry, i dwa rotujące. Cele liczone z 4 tygodni PRZED tygodniem,
// więc nie zmieniają się w trakcie. Kilometry rosną najwyżej o 10% tygodniowo (bezpieczne tempo zwiększania objętości).
const CH_POOL = ['dlugi', 'palce2', 'sila2', 'rozc3', 'dni5', 'drogi', 'plan'];
const CH_REF = '2026-01-05'; // poniedziałek, od którego liczy się rotacja
const REC_PTS = 10;
const ceil1 = v => Math.ceil(v - 1e-9);
function weekIndex(from) { return Math.floor(PL.diff(CH_REF, from) / 7); }
function challenges(st, from, all) {
  all = all || entries(st);
  const to = PL.addDays(from, 6), back = PL.addDays(from, -28);
  const prev = all.filter(x => x.d >= back && x.d < from);
  const wk = all.filter(x => x.d >= from && x.d <= to);
  let kmPrev = 0, longPrev = 0, routesPrev = 0;
  prev.forEach(x => { if (x.e.t === 'bieg') { kmPrev += x.e.km || 0; longPrev = Math.max(longPrev, x.e.km || 0); } if (x.e.t === 'wspin') routesPrev += x.e.routes || 0; });
  const recovery = isRecovery(st, from);
  const kmT = recovery ? Math.max(6, ceil1(kmPrev / 4 * 0.6)) : Math.max(10, ceil1(kmPrev / 4 * 1.1));
  const longT = Math.min(21, Math.max(8, Math.floor(longPrev) + 1));
  const routesT = Math.max(15, ceil1(routesPrev / 4 * 1.1));
  // zaplanowane bloki tygodnia (dla „bez pomijania”)
  const planned = [];
  for (let i = 0; i < 7; i++) { const d = PL.addDays(from, i); dayItems(st, d).forEach(x => planned.push({ d, k: x.k })); }
  const DEFS = {
    pelny: { name: 'Pełny tydzień', desc: WEEK_RUNS + ' biegi i ' + WEEK_CLIMBS + ' wspinania', target: WEEK_RUNS + WEEK_CLIMBS, pts: WEEK_PTS, unit: '', val: a => Math.min(a.runs, WEEK_RUNS) + Math.min(a.climbs, WEEK_CLIMBS) },
    km: { name: recovery ? 'Kilometry na luzie' : 'Kilometry tygodnia', desc: 'Przebiegnij ' + kmT + ' km' + (recovery ? ' (tydzień odciążenia)' : ''), target: kmT, pts: 20, unit: 'km', val: a => a.km },
    dlugi: { name: 'Długi bieg', desc: 'Jeden bieg co najmniej ' + longT + ' km', target: longT, pts: 15, unit: 'km', val: a => a.longest },
    palce2: { name: 'Palce dwa razy', desc: '2 treningi palców', target: 2, pts: 15, unit: '', val: a => a.palce },
    sila2: { name: 'Siła dwa razy', desc: '2 bloki siłowe', target: 2, pts: 15, unit: '', val: a => a.sila },
    rozc3: { name: 'Rozciąganie trzy razy', desc: '3 bloki rozciągania', target: 3, pts: 10, unit: '', val: a => a.rozc },
    dni5: { name: 'Pięć dni', desc: '5 dni z blokami treningowymi', target: 5, pts: 15, unit: 'dni', val: a => a.days },
    drogi: { name: 'Drogi', desc: routesT + ' dróg we wspinaniu', target: routesT, pts: 15, unit: 'dróg', val: a => a.routes },
    plan: { name: 'Plan bez pomijania', desc: 'Wszystkie ' + planned.length + ' zaplanowane bloki zrobione', target: planned.length, pts: 20, unit: '', val: a => a.planDone }
  };
  const i = weekIndex(from), n = CH_POOL.length;
  const ids = ['pelny', 'km', CH_POOL[((i % n) + n) % n], CH_POOL[(((i + 3) % n) + n) % n]];
  if (!planned.length) ids[ids.indexOf('plan')] = ids.indexOf('dni5') < 0 ? 'dni5' : 'rozc3';
  if (recovery && ids.indexOf('dlugi') >= 0) ids[ids.indexOf('dlugi')] = ids.indexOf('rozc3') < 0 ? 'rozc3' : 'dni5';
  const acc = { runs: 0, climbs: 0, km: 0, longest: 0, palce: 0, sila: 0, rozc: 0, routes: 0, days: 0, planDone: 0 };
  const out = ids.map(id => Object.assign({ id, value: 0, done: false, doneDay: null }, DEFS[id]));
  const isPlanned = {};
  planned.forEach(p => { isPlanned[p.d + '|' + p.k] = 1; });
  for (let j = 0; j < 7; j++) {
    const d = PL.addDays(from, j), day = wk.filter(x => x.d === d);
    if (day.length) acc.days += 1;
    day.forEach(x => {
      const e = x.e;
      if (e.t === 'bieg') { acc.runs++; acc.km += e.km || 0; acc.longest = Math.max(acc.longest, e.km || 0); }
      if (e.t === 'wspin') { acc.climbs++; acc.routes += e.routes || 0; }
      if (e.t === 'palce') acc.palce++;
      if (e.t === 'sila') acc.sila++;
      if (e.t === 'rozc') acc.rozc++;
      if (isPlanned[d + '|' + x.k]) acc.planDone++;
    });
    out.forEach(c => {
      c.value = Math.round(c.val(acc) * 10) / 10;
      if (!c.done && c.target > 0 && c.value >= c.target) { c.done = true; c.doneDay = d; }
    });
  }
  out.forEach(c => { delete c.val; });
  return out;
}

// ---------- rekordy ----------
const REC_DEFS = [
  { id: 'km', name: 'Najdłuższy bieg' },
  { id: 'tempo5', name: 'Najlepsze tempo od 5 km' },
  { id: 'tempo10', name: 'Najlepsze tempo od 10 km' },
  { id: 'tydzien', name: 'Najwięcej km w tygodniu' },
  { id: 'grade', name: 'Najtrudniejsza droga' },
  { id: 'drogi', name: 'Najwięcej dróg na jednym wspinaniu' },
  { id: 'os', name: 'Najtrudniejszy OS albo flash' },
  { id: 'zwis20', name: 'Najmocniejszy zwis 20 mm' },
  { id: 'zwis15', name: 'Najmocniejszy zwis 15 mm' }
];
function recText(id, v) {
  if (id === 'km' || id === 'tydzien') return fmtKm(v) + ' km';
  if (id === 'tempo5' || id === 'tempo10') { const p = Math.round(v); return Math.floor(p / 60) + ':' + pad(p % 60) + '/km'; }
  if (id === 'grade' || id === 'os') return GRADE_LIST[v];
  if (id === 'zwis20' || id === 'zwis15') return v + '% wagi';
  return v + ' ' + (v === 1 ? 'droga' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 12 || v % 100 > 14) ? 'drogi' : 'dróg');
}
// Rekordy z całego dziennika: aktualnie najlepsze wartości i zdarzenia „pobity rekord” (pierwsza wartość tylko ustawia poprzeczkę).
// st (opcjonalnie): waga do rekordów zwisów w procentach wagi.
function records(all, st) {
  const best = {}, events = [];
  const beat = (id, v, x, lower) => {
    const b = best[id];
    if (b && !(lower ? v < b.value - 1e-9 : v > b.value + 1e-9)) return;
    if (b) events.push({ id, d: x.d, k: x.k, value: v, prev: b.value, text: recText(id, v), name: REC_DEFS.find(r => r.id === id).name, pts: REC_PTS });
    best[id] = { value: v, d: x.d, k: x.k, text: recText(id, v) };
  };
  const weekKm = {};
  let bestPrevWeek = 0, curW = null;
  const awardedW = {};
  all.forEach(x => {
    const e = x.e;
    const w = weekStart(x.d);
    if (w !== curW) { if (curW) bestPrevWeek = Math.max(bestPrevWeek, weekKm[curW] || 0); curW = w; }
    if (e.t === 'bieg' && e.km) {
      beat('km', e.km, x, false);
      if (e.sec && e.km >= 5) beat('tempo5', e.sec / e.km, x, true);
      if (e.sec && e.km >= 10) beat('tempo10', e.sec / e.km, x, true);
      weekKm[w] = Math.round(((weekKm[w] || 0) + e.km) * 100) / 100;
      // tydzień: rekord, gdy suma tego tygodnia przebije najlepszy z poprzednich (raz na tydzień)
      if (!best.tydzien || weekKm[w] > best.tydzien.value) {
        if (best.tydzien && bestPrevWeek > 0 && weekKm[w] > bestPrevWeek && !awardedW[w]) {
          awardedW[w] = 1;
          events.push({ id: 'tydzien', d: x.d, k: x.k, value: weekKm[w], prev: bestPrevWeek, text: recText('tydzien', weekKm[w]), name: REC_DEFS[3].name, pts: REC_PTS });
        }
        best.tydzien = { value: weekKm[w], d: x.d, k: x.k, text: recText('tydzien', weekKm[w]) };
      }
    }
    if (e.t === 'wspin') {
      if (e.grade) beat('grade', GRADE_LIST.indexOf(e.grade), x, false);
      if (e.routes) beat('drogi', e.routes, x, false);
      const os = e.rl ? routeSum(e.rl).os : null;
      if (os) beat('os', GRADE_LIST.indexOf(os), x, false);
    }
    if (st && e.t === 'palce' && e.mm && !e.partial) {
      const p = hangPct(st, x.d, e);
      if (p) beat('zwis' + e.mm, p, x, false);
    }
  });
  return { best, events };
}

// ---------- prawdziwa forma ----------
// Wspinanie: najtrudniejsza zapisana droga z ostatnich 30 dni.
function climbForm(st, today) {
  const from = PL.addDays(today, -29);
  let best = null;
  entries(st).forEach(x => {
    if (x.e.t !== 'wspin' || !x.e.grade || x.d < from || x.d > today) return;
    const i = GRADE_LIST.indexOf(x.e.grade);
    if (!best || i > best.i) best = { i, grade: x.e.grade, d: x.d };
  });
  return best;
}
// Bieganie: przewidywany półmaraton (wzór Riegela: T2 = T1 * (D2 / D1) ^ 1,06) z najlepszego biegu od 3 km w ostatnich 60 dniach.
const HM = 21.0975;
function runForm(st, today) {
  const from = PL.addDays(today, -59);
  let best = null;
  entries(st).forEach(x => {
    const e = x.e;
    if (e.t !== 'bieg' || !(e.km >= 3) || !e.sec || x.d < from || x.d > today) return;
    const hm = e.sec * Math.pow(HM / e.km, 1.06);
    if (!best || hm < best.hm) best = { hm: Math.round(hm), km: e.km, sec: e.sec, d: x.d };
  });
  return best;
}

// ---------- cykl: budowanie i odciążenie ----------
// cycle = { start: poniedziałek, build: tygodnie budowania, recover: tygodnie odciążenia }. Bez cyklu: zawsze budowanie.
function phaseOf(st, d) {
  const c = st.cycle;
  if (!c || !c.start || !(c.build > 0)) return null;
  const w = Math.floor(PL.diff(weekStart(c.start), weekStart(d)) / 7);
  if (w < 0) return null;
  const len = c.build + (c.recover || 0), pos = w % len;
  return pos < c.build ? { kind: 'budowa', name: 'Budowanie', week: pos + 1, of: c.build } : { kind: 'odciazenie', name: 'Odciążenie', week: pos - c.build + 1, of: c.recover };
}
const isRecovery = (st, d) => { const p = phaseOf(st, d); return !!p && p.kind === 'odciazenie'; };

// ---------- propozycje zwiększeń ----------
// Nigdy nic nie zmienia samo: propozycja to karta z „Przyjmij” / „Nie teraz”. Odrzucona wraca po 7 dniach.
function shoulderAlarm(st, today) {
  const from = PL.addDays(today, -6);
  const pain = entries(st).some(x => x.d >= from && x.d <= today && x.e.pain >= 4);
  const red = Object.keys(st.morning || {}).some(d => d >= from && d <= today && st.morning[d] === 'red');
  return pain || red;
}
function lastOf(st, id, n, since) {
  return entries(st).filter(x => x.e.b === id && (x.e.at || 0) > (since || 0) && !x.e.partial).slice(-n);
}
const easy = (xs, rpe, n) => xs.length >= n && xs.every(x => x.e.rpe != null && x.e.rpe <= rpe && (x.e.pain == null || x.e.pain <= 2));
const bumpReps = r => String(r).replace(/\d+/g, n => String(+n + 1));
function proposals(st, today) {
  const out = [];
  if (isRecovery(st, today)) return out;
  const decided = id => { const p = st.props && st.props[id]; return p && !p.del && (p.s === 'ok' || PL.diff(p.d, today) < 7); };
  const add = p => { if (!decided(p.id)) out.push(p); };
  const alarm = shoulderAlarm(st, today);
  allBlocks(st).forEach(b => {
    if (alarm) return;
    const since = isEdited(st, b.id) || !isBuiltin(b.id) ? (b.at || 0) : 0;
    if (b.kind === 'timed' && b.t === 'palce') {
      const it = (b.items || []).findIndex(x => /^zwis-/.test(x.ex) && x.kind === 'hold');
      if (it < 0 || !easy(lastOf(st, b.id, 2, since), 6, 2)) return;
      const x = b.items[it], kg = hangKg(st, b);
      if (typeof kg === 'number' && kg < 0) {
        // najpierw mniej odciążenia (po 2 kg), potem dłuższe zwisy, potem 15 mm
        const nk = Math.min(0, Math.round((kg + 2) * 10) / 10);
        add({ id: 'palce:' + b.id + ':kg:' + nk, block: b.id, title: b.name, text: (nk === 0 ? 'Zwisy bez odciążenia, na pełnej wadze' : 'Odciążenie ' + kgNum(nk) + ' kg zamiast ' + kgNum(kg) + ' kg') + '. Dwa ostatnie treningi były lekkie i bez bólu.', edit: { item: it, kg: nk } });
      } else if (x.hold < 15) add({ id: 'palce:' + b.id + ':' + x.ex + ':' + x.hold, block: b.id, title: b.name, text: 'Zwisy ' + Math.min(15, x.hold + 2) + ' s zamiast ' + x.hold + ' s. Dwa ostatnie treningi były lekkie i bez bólu.', edit: { item: it, hold: Math.min(15, x.hold + 2) } });
      else if (x.ex === 'zwis-20') add({ id: 'palce:' + b.id + ':15mm', block: b.id, title: b.name, text: 'Czas na listwę 15 mm: zaczynasz od 10 s na zwis.', edit: { item: it, ex: 'zwis-15', hold: 10, kg: null, name: b.name.replace('20 mm', '15 mm') } });
    } else if (b.kind === 'timed' && b.t === 'sila') {
      if (!easy(lastOf(st, b.id, 2, since), 6, 2)) return;
      const items = (b.items || []).map(x => (x.kind === 'reps' ? Object.assign({}, x, { reps: bumpReps(x.reps) }) : x.kind === 'hold' ? Object.assign({}, x, { hold: Math.min(60, x.hold + 5) }) : x));
      const sig = (b.items || []).map(x => x.reps || x.hold || '').join('/');
      add({ id: 'sila:' + b.id + ':' + sig, block: b.id, title: b.name, text: '+1 powtórzenie w każdej serii i +5 s w trzymaniu. Dwa ostatnie treningi były lekkie i bez bólu.', edit: { items } });
    } else if (b.kind === 'run' && b.zone === 'easy' && b.items && b.items.length === 1 && b.items[0].kind === 'time') {
      const long = b.items[0].dur >= 50 * 60, cap = long ? 120 * 60 : 60 * 60;
      const xs = lastOf(st, b.id, long ? 1 : 2, since);
      if (!easy(xs, long ? 5 : 4, long ? 1 : 2) || b.items[0].dur >= cap) return;
      const dur = Math.min(cap, b.items[0].dur + 300);
      add({ id: 'bieg:' + b.id + ':' + dur, block: b.id, title: b.name, text: (long ? 'Długi bieg' : 'Spokojny bieg') + ' ' + Math.round(dur / 60) + ' min zamiast ' + Math.round(b.items[0].dur / 60) + ' min (+5 min, objętość rośnie najwyżej o 10% tygodniowo).', edit: { item: 0, dur, min: Math.round(dur / 60) } });
    }
  });
  // test 5 km: po 6 biegach, gdy nie było testu od 8 tygodni; zastępuje najbliższy spokojny bieg od poniedziałku
  const runs = entries(st).filter(x => x.e.t === 'bieg');
  const lastTest = runs.filter(x => x.e.b === 'bieg-test5').slice(-1)[0];
  if (runs.length >= 6 && (!lastTest || PL.diff(lastTest.d, today) > 56)) {
    let from = weekStart(today);
    if (from <= today) from = PL.addDays(from, 7);
    for (let i = 0; i < 14; i++) {
      const d = PL.addDays(from, i), it = dayItems(st, d).find(x => x.b === 'bieg-spokojny' && !x.skip);
      if (it) { add({ id: 'test:' + weekStart(d), block: 'bieg-test5', title: 'Test 5 km', text: 'Zaplanuj test 5 km na ' + PL.longDate(d) + ' zamiast spokojnego biegu. Z wyniku policzę tempa treningowe.', plan: { d, k: it.k } }); break; }
    }
  }
  return out;
}
// Przyjęcie propozycji: zmienia blok (jak w edytorze) albo plan dnia i zapisuje decyzję w props.
function applyProposal(st, p, today, now) {
  if (p.edit) {
    const b = clone(getBlock(st, p.block));
    if (p.edit.items) b.items = clone(p.edit.items);
    if (p.edit.item != null) {
      const x = b.items[p.edit.item];
      if (p.edit.hold != null) x.hold = p.edit.hold;
      if (p.edit.ex) x.ex = p.edit.ex;
      if (p.edit.dur != null) x.dur = p.edit.dur;
      if (p.edit.kg === null) delete x.kg;
      else if (typeof p.edit.kg === 'number') x.kg = p.edit.kg;
    }
    if (p.edit.min != null) b.min = p.edit.min;
    if (p.edit.name) b.name = p.edit.name;
    saveBlock(st, b, now);
  }
  if (p.plan) {
    removeItem(st, p.plan.d, p.plan.k, now);
    addItem(st, p.plan.d, p.block, now);
  }
  decide(st, p, 'ok', today, now);
}
function decide(st, p, s, today, now) { st.props = st.props || {}; st.props[p.id] = { s, d: today, at: now || Date.now(), text: (p.title + ': ' + p.text).slice(0, 200) }; }

// ---------- tempa treningowe ----------
// Z ostatniego testu 5 km (blok bieg-test5, od 4,9 km, z czasem, w ostatnich 120 dniach). Strefy jako mnożniki tempa testu.
const ZONES = {
  easy: { name: 'spokojne', k: [1.22, 1.32] }, steady: { name: 'średnie', k: [1.12, 1.18] }, tempo: { name: 'progowe', k: [1.04, 1.08] },
  interval: { name: 'interwałowe', k: [0.97, 1.01] }, strides: { name: 'przebieżki', k: [0.88, 0.94] }
};
function paces(st, today) {
  const from = PL.addDays(today, -119);
  let test = null;
  // tylko wiarygodny wynik: tempo między 2:30 a 15:00 na km
  const ok = e => e.km >= 4.9 && e.sec && e.sec / e.km >= 150 && e.sec / e.km <= 900;
  entries(st).forEach(x => { if (x.e.b === 'bieg-test5' && ok(x.e) && x.d >= from && x.d <= today && (!test || x.d >= test.d)) test = { d: x.d, km: x.e.km, sec: x.e.sec }; });
  if (!test) return null;
  const p = test.sec / test.km, z = {};
  Object.keys(ZONES).forEach(k => { z[k] = { name: ZONES[k].name, lo: Math.round(p * ZONES[k].k[0]), hi: Math.round(p * ZONES[k].k[1]) }; });
  return { test, pace: Math.round(p), zones: z };
}
const fmtPace = s => Math.floor(s / 60) + ':' + pad(Math.round(s) % 60);
// Tekst tempa dla bloku biegowego: zakres ze strefy albo podpowiedź bez testu.
function paceText(b, pc) {
  if (!b || b.kind !== 'run' || !b.zone) return '';
  if (b.zone === 'test') return pc ? 'Ostatni test: ' + fmtPace(pc.pace) + '/km' : 'Wynik ustawi Twoje tempa treningowe';
  if (!pc) return b.zone === 'easy' ? 'Tempo: na rozmowę (tempa po teście 5 km)' : 'Najpierw test 5 km: z niego policzę tempo';
  const z = pc.zones[b.zone];
  return z ? 'Tempo ' + z.name + ': ' + fmtPace(z.lo) + '–' + fmtPace(z.hi) + '/km' : '';
}

// ---------- dane do wykresów ----------
// Tygodnie biegania (od najstarszego): suma km, najdłuższy bieg, przewidywany półmaraton na koniec tygodnia.
function runWeeks(st, today, n) {
  const all = entries(st).filter(x => x.e.t === 'bieg');
  const cur = weekStart(today), out = [];
  for (let i = n - 1; i >= 0; i--) {
    const from = PL.addDays(cur, -7 * i), to = PL.addDays(from, 6);
    let km = 0, long = 0;
    all.forEach(x => { if (x.d >= from && x.d <= to) { km += x.e.km || 0; long = Math.max(long, x.e.km || 0); } });
    const f = runForm(st, to < today ? to : today);
    out.push({ from, to, km: Math.round(km * 10) / 10, long, hm: f ? f.hm : null });
  }
  return out;
}
// Wspinanie z ostatnich dni: przejścia według wyceny i stylu (piramida; sesja bez listy dróg liczy się jako jedna droga
// o najtrudniejszej wycenie), miejsca, najtrudniejsza droga w miesiącach.
function climbStats(st, today, days, months) {
  const from = PL.addDays(today, -(days - 1));
  const byGrade = {}, byPlace = {}, byStyle = {};
  let sessions = 0;
  const cl = entries(st).filter(x => x.e.t === 'wspin');
  cl.forEach(x => {
    if (x.d < from || x.d > today) return;
    sessions++;
    if (x.e.rl && x.e.rl.length) x.e.rl.forEach(r => {
      if (!SENT(r.s)) return;
      byGrade[r.g] = (byGrade[r.g] || 0) + 1;
      const s = byStyle[r.g] = byStyle[r.g] || {};
      s[r.s] = (s[r.s] || 0) + 1;
    });
    else if (x.e.grade) byGrade[x.e.grade] = (byGrade[x.e.grade] || 0) + 1;
    const p = x.e.place || 'Bez miejsca';
    byPlace[p] = (byPlace[p] || 0) + 1;
  });
  const monthly = [];
  const t = PL.parse(today);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1, 12);
    const key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    let best = -1;
    cl.forEach(x => { if (x.d.slice(0, 7) === key && x.e.grade) best = Math.max(best, GRADE_LIST.indexOf(x.e.grade)); });
    monthly.push({ key, month: d.getMonth(), year: d.getFullYear(), grade: best >= 0 ? GRADE_LIST[best] : null, i: best });
  }
  return { sessions, byGrade, byStyle, byPlace, monthly };
}
// Tygodnie palców (od najstarszego): najmocniejszy zwis w procentach wagi na 20 mm i 15 mm.
function fingerWeeks(st, today, n) {
  const all = entries(st).filter(x => x.e.t === 'palce' && x.e.mm && !x.e.partial);
  const cur = weekStart(today), out = [];
  for (let i = n - 1; i >= 0; i--) {
    const from = PL.addDays(cur, -7 * i), to = PL.addDays(from, 6), w = { from, to, p20: null, p15: null };
    all.forEach(x => {
      if (x.d < from || x.d > to) return;
      const p = hangPct(st, x.d, x.e), f = 'p' + x.e.mm;
      if (p && (w[f] == null || p > w[f])) w[f] = p;
    });
    out.push(w);
  }
  return out;
}

// ---------- czas, dystans, tempo ----------
const pad = n => (n < 10 ? '0' : '') + n;
function fmtDur(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
}
function fmtKm(km) { return (Math.round(km * 100) / 100).toString().replace('.', ','); }
function pace(km, sec) { if (!(km > 0) || !(sec > 0)) return ''; const p = Math.round(sec / km); return Math.floor(p / 60) + ':' + pad(p % 60) + '/km'; }
// „34:10”, „1:05:30”, „34” (minuty), „34 min”, „45,5”; null, gdy nie da się odczytać.
function parseTime(s) {
  const t = String(s == null ? '' : s).trim().replace(/\s*min$/i, '').replace(',', '.');
  if (!t) return null;
  let m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t);
  if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
  m = /^(\d{1,3}):(\d{2})$/.exec(t);
  if (m && +m[2] < 60) return (+m[1]) * 60 + (+m[2]);
  m = /^(\d{1,3}(?:\.\d+)?)$/.exec(t);
  if (m && +m[1] > 0 && +m[1] <= 600) return Math.round(+m[1] * 60);
  return null;
}
function parseKm(s) {
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?\s*(?:km)?$/i.exec(String(s == null ? '' : s).trim());
  if (!m) return null;
  const v = parseFloat(m[1] + '.' + (m[2] || '0'));
  return v > 0 && v <= 200 ? v : null;
}
const GRADE_LIST = ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a'];

const API = {
  TRACKS, TRACK_IDS, KINDS, PLACES, STYLES, STYLE_IDS, SENT, styleName, routeSum, HANG_MM, hangOf, hangKg, bodyKg, hangPct, kgNum, kgText, fingerWeeks, CLIMB_NOTE, climbNote, CAT, BUILTIN, DEFAULT_WEEK, RATE_PTS, WEEK_PTS, WEEK_RUNS, WEEK_CLIMBS, GRADE_LIST,
  exOf, exName, catalog, getBlock, isBuiltin, isEdited, allBlocks, saveBlock, deleteBlock, copyBlock, blockSeconds, blockMinutes, sessionOf,
  pattern, dayItems, dayView, entryOf, addItem, removeItem, skipItem, moveItem, setPattern,
  logBlock, delLog, entries, entryPoints, weekStart, weekStats, fmtDur, fmtKm, pace, parseTime, parseKm,
  challenges, records, recText, REC_DEFS, REC_PTS, CH_POOL, weekIndex, climbForm, runForm, HM, ZONES, paces, paceText, fmtPace,
  phaseOf, isRecovery, shoulderAlarm, proposals, applyProposal, decide, runWeeks, climbStats
};
G.BLOCKS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
