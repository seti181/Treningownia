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
const CLIMB_NOTE = 'Bez blokowania i dalekich sięgnięć lewą ręką, bez podciągania. Ból barku powyżej 3/10: zejdź z drogi.';

// Ćwiczenia spoza atlasu rehabilitacji (bez animacji: odtwarzacz pokazuje nazwę, dawkę i wskazówki).
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
  ['r-plecy', 'Pozycja dziecka', 'rozc', ['Klęk, pośladki na piętach', 'Ręce daleko w przód, czoło w dół', 'Oddychaj w plecy']]
];
const CAT = {};
CAT_LIST.forEach(c => { CAT[c[0]] = { id: c[0], name: c[1], t: c[2], cues: c[3], plain: true }; });

const H = (ex, sets, hold, rest, note) => ({ ex, kind: 'hold', sets, hold, rest, note: note || '' });
const R = (ex, sets, reps, rest, note) => ({ ex, kind: 'reps', sets, reps, rest, note: note || '' });
const T = (ex, dur, note) => ({ ex, kind: 'time', sets: 1, dur, note: note || '' });
const BUILTIN = [
  { id: 'bieg-spokojny', name: 'Bieg spokojny', kind: 'run', t: 'bieg', min: 40, note: '30–40 min tak spokojnie, żeby dało się rozmawiać (wysiłek 3–4 z 10).' },
  { id: 'bieg-przebiezki', name: 'Bieg z przebieżkami', kind: 'run', t: 'bieg', min: 35, note: '30 min spokojnie, potem 6 × 20 s szybciej; między nimi marsz albo trucht, aż oddech wróci.' },
  { id: 'bieg-dlugi', name: 'Długi spokojny bieg', kind: 'run', t: 'bieg', min: 60, note: '50–60 min, wysiłek 3–4 z 10. Ma być przyjemnie, nie ciężko.' },
  { id: 'bieg-test5', name: 'Test 5 km', kind: 'run', t: 'bieg', min: 40, km: 5, note: 'Po 10 min rozgrzewki: 5 km możliwie równym, mocnym tempem. Z wyniku policzymy tempa treningowe.' },
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
  { id: 'rozc-bieg', name: 'Rozciąganie po biegu', kind: 'timed', t: 'rozc', min: 10, gap: 10, note: 'Zaraz po biegu, spokojnie, do lekkiego ciągnięcia.',
    items: [H('r-lydki', 2, 45, 10, 'Lewa, potem prawa'), H('r-tyl-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-przod-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-biodra', 2, 45, 10, 'Lewa, potem prawa')] },
  { id: 'rozc-pelne', name: 'Rozciąganie pełne', kind: 'timed', t: 'rozc', min: 20, gap: 10, note: 'Całe ciało, z rozciąganiem pod pachą z rehabilitacji.',
    items: [H('r-lydki', 2, 45, 10, 'Lewa, potem prawa'), H('r-tyl-uda', 2, 45, 10, 'Lewa, potem prawa'), H('r-przod-uda', 2, 45, 10, 'Lewa, potem prawa'),
      H('r-biodra', 2, 45, 10, 'Lewa, potem prawa'), H('r-posladki', 2, 45, 10, 'Lewa, potem prawa'), H('r-plecy', 2, 45, 10),
      H('rozciaganie-pacha', 3, 25, 10, 'Do lekkiego ciągnięcia pod lewą pachą')] }
];
const BUILTIN_BY = {};
BUILTIN.forEach(b => { BUILTIN_BY[b.id] = b; });
// Domyślny tydzień (0 = niedziela): 3 biegi, 3 wspinania, siła i rozciąganie w sobotę.
const DEFAULT_WEEK = {
  1: ['bieg-spokojny', 'rozc-bieg'], 2: ['palce-20', 'wspinanie'], 3: ['bieg-przebiezki', 'rozc-bieg'], 4: ['wspinanie'],
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
function allBlocks(st) {
  const out = BUILTIN.map(b => getBlock(st, b.id));
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
  if (b.kind === 'timed' && b.items && b.items.length) return PL.seconds({ gap: b.gap || 30, blocks: b.items });
  return (b.min || 0) * 60;
}
function blockMinutes(b) { return Math.max(1, Math.round(blockSeconds(b) / 60)); }
// Sesja dla odtwarzacza.
function sessionOf(b, key) {
  return { id: 'blok', label: TRACKS[b.t].name, short: '', title: b.name, gap: b.gap || 30, blocks: clone(b.items || []), blockKey: key, blockId: b.id, track: b.t };
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
// data: { dur (s), km, sec, rpe, pain, grade, routes, place, note, partial }
function logBlock(st, d, k, b, data, now) {
  st.blog = st.blog || {};
  const e = { b: b.id, t: b.t, kind: b.kind, name: b.name, done: true, at: now || Date.now() };
  ['dur', 'km', 'sec', 'rpe', 'pain', 'routes'].forEach(f => { if (typeof data[f] === 'number' && isFinite(data[f])) e[f] = data[f]; });
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
  const kmT = Math.max(10, ceil1(kmPrev / 4 * 1.1));
  const longT = Math.min(21, Math.max(8, Math.floor(longPrev) + 1));
  const routesT = Math.max(15, ceil1(routesPrev / 4 * 1.1));
  // zaplanowane bloki tygodnia (dla „bez pomijania”)
  const planned = [];
  for (let i = 0; i < 7; i++) { const d = PL.addDays(from, i); dayItems(st, d).forEach(x => planned.push({ d, k: x.k })); }
  const DEFS = {
    pelny: { name: 'Pełny tydzień', desc: WEEK_RUNS + ' biegi i ' + WEEK_CLIMBS + ' wspinania', target: WEEK_RUNS + WEEK_CLIMBS, pts: WEEK_PTS, unit: '', val: a => Math.min(a.runs, WEEK_RUNS) + Math.min(a.climbs, WEEK_CLIMBS) },
    km: { name: 'Kilometry tygodnia', desc: 'Przebiegnij ' + kmT + ' km', target: kmT, pts: 20, unit: 'km', val: a => a.km },
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
  { id: 'drogi', name: 'Najwięcej dróg na jednym wspinaniu' }
];
function recText(id, v) {
  if (id === 'km' || id === 'tydzien') return fmtKm(v) + ' km';
  if (id === 'tempo5' || id === 'tempo10') { const p = Math.round(v); return Math.floor(p / 60) + ':' + pad(p % 60) + '/km'; }
  if (id === 'grade') return GRADE_LIST[v];
  return v + ' ' + (v === 1 ? 'droga' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 12 || v % 100 > 14) ? 'drogi' : 'dróg');
}
// Rekordy z całego dziennika: aktualnie najlepsze wartości i zdarzenia „pobity rekord” (pierwsza wartość tylko ustawia poprzeczkę).
function records(all) {
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
    }
  });
  return { best, events };
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
  TRACKS, TRACK_IDS, KINDS, PLACES, CLIMB_NOTE, CAT, BUILTIN, DEFAULT_WEEK, RATE_PTS, WEEK_PTS, WEEK_RUNS, WEEK_CLIMBS, GRADE_LIST,
  exOf, exName, catalog, getBlock, isBuiltin, isEdited, allBlocks, saveBlock, deleteBlock, copyBlock, blockSeconds, blockMinutes, sessionOf,
  pattern, dayItems, dayView, entryOf, addItem, removeItem, skipItem, moveItem, setPattern,
  logBlock, delLog, entries, entryPoints, weekStart, weekStats, fmtDur, fmtKm, pace, parseTime, parseKm,
  challenges, records, recText, REC_DEFS, REC_PTS, CH_POOL, weekIndex
};
G.BLOCKS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
