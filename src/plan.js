/* Plan rehabilitacji: sesje, postęp według dni treningowych, restart; punkty i poziomy (wyceny wspinaczkowe) za rehabilitację i bloki treningowe. */
(function (G) {
'use strict';
const A = G.ATLAS;
const START = '2026-11-01';
const NAMES = {};
A.EX.forEach(e => { NAMES[e.id] = e.name; });

const PHASES = {
  1: { name: 'Faza 1 · Izometria', len: 7, tape: 'F1', c: '--p1' },
  2: { name: 'Faza 2 · Siła w ruchu', len: 21, tape: 'F2', c: '--p2' },
  3: { name: 'Faza 3 · Cięższe ciągnięcie', len: 21, tape: 'F3', c: '--p3' },
  4: { name: 'Faza 4 · Powrót do podciągania', len: 21, tape: 'F4', c: '--p4' },
  5: { name: 'Na stałe · profilaktyka', len: 0, tape: 'N', c: '--p0' }
};
const GATES = {
  1: ['Wszystkie ćwiczenia izometryczne na 70% siły nie bolą (0–2)', 'Aktywny zwis z podparciem nóg z ok. połową ciężaru na rękach (waga pod stopami ok. 33 kg) daje ból 0–2', 'Przez tydzień nie masz zaostrzeń następnego ranka'],
  2: ['Rotacja zewnętrzna w leżeniu: lewa ręka jak prawa (ten sam ciężar, 15 powtórzeń)', 'Podciąganie łopatkowe z podparciem nóg z większością ciężaru na rękach (waga ok. 20 kg) daje ból 0–2', 'Przez dwa tygodnie treningi nie dają zaostrzeń następnego ranka'],
  3: ['Aktywny zwis z podparciem nóg z prawie całym ciężarem na rękach (waga poniżej 10 kg) daje ból 0–2', 'W rotacji 90/90 z łokciem na wysokości barku nic nie przeskakuje i nie czujesz niepewności', 'Przez dwa tygodnie Faza 3 nie daje zaostrzeń'],
  4: ['Pełne podciąganie 3 × 5 bez bólu (0–2) przez dwa tygodnie']
};
const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const DSHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

// ---------- daty (lokalne, RRRR-MM-DD) ----------
const pad = n => (n < 10 ? '0' : '') + n;
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parse(s) { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2], 12); }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
function diff(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
function dow(s) { return parse(s).getDay(); }
function longDate(s) { const d = parse(s); return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
function shortDate(s) { const d = parse(s); return DSHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1); }

// ---------- bloki ćwiczeń ----------
const H = (ex, sets, hold, rest, note) => ({ ex, kind: 'hold', sets, hold, rest, note });
const R = (ex, sets, reps, rest, note, side) => ({ ex, kind: 'reps', sets, reps, rest, note, side: side || '' });
const T = (ex, dur, note) => ({ ex, kind: 'time', sets: 1, dur, note });
const ISO5 = ['izo-rot-zew', 'izo-rot-wew', 'izo-odwodzenie', 'izo-wyprost', 'izo-przywodzenie'];
const WARM = s => T('rozgrzewka', s, 'Luźno, tylko w zakresie bez bólu');
const STRETCH = n => H('rozciaganie-pacha', n, 25, 10, 'Do lekkiego ciągnięcia pod lewą pachą');

// Faza 1: czas i siła rosną co 2 dni, objętość spada, żeby sesja zostawała krótka.
function p1Dose(day) {
  if (day <= 1) return { sets: 6, hold: 10, effort: 'ok. 30% siły', hang: 10, scale: 'Waga pod stopami 45–50 kg', push: [3, 20] };
  if (day <= 3) return { sets: 5, hold: 15, effort: 'ok. 40–50% siły', hang: 15, scale: 'Waga pod stopami ok. 42 kg', push: [3, 20] };
  if (day <= 5) return { sets: 4, hold: 20, effort: 'ok. 50–60% siły', hang: 20, scale: 'Waga pod stopami ok. 38 kg', push: [3, 25] };
  return { sets: 3, hold: 30, effort: '50–70% siły', hang: 20, scale: 'Waga pod stopami ok. 33 kg', push: [3, 30] };
}
function sP1(day, evening, easy) {
  const d = p1Dose(day);
  const effort = easy ? 'ok. 30% siły' : d.effort;
  const b = [WARM(60)];
  ISO5.forEach(id => b.push(H(id, d.sets, d.hold, 10, effort)));
  b.push(H('ustawienie-lopatki', 6, 10, 5, 'Delikatnie, barki nie idą do uszu'));
  b.push(H('zwis-podparty', 5, d.hang, 20, d.scale + ' · ból najwyżej 3/10'));
  if (evening) { b.push(H('pompka-blok', d.push[0], d.push[1], 20, 'Masa ciała')); b.push(STRETCH(3)); }
  return {
    id: evening ? 'wieczor' : 'rano', label: evening ? 'Po pracy' : 'Rano', short: '2× izo',
    title: evening ? 'Izometria, zwis, pompka i rozciąganie' : 'Izometria i zwis', gap: 15, blocks: b
  };
}
function sLight() {
  const b = [WARM(60)];
  ISO5.forEach(id => b.push(H(id, 2, 20, 10, '30–50% siły')));
  b.push(H('ustawienie-lopatki', 5, 10, 5, 'Delikatnie'));
  b.push(STRETCH(3));
  return { id: 'lekki', label: 'Lekki dzień', short: 'Lekki', title: 'Ruch i lekka izometria', gap: 15, blocks: b };
}
const isoWarm = () => ISO5.map(id => H(id, 1, 20, 10, 'Izometria na rozgrzewkę, ok. 50% siły'));
function sP2() {
  return {
    id: 'sila', label: 'Trening', short: 'Siła', title: 'Siła w ruchu', gap: 40, blocks: [
      WARM(120), ...isoWarm(),
      R('lopatkowe-podparte', 3, '8–10', 60, 'Waga pod stopami 33 → 20 kg'),
      R('guma-proste-rece', 3, '12–15', 45, 'Średnia guma'),
      R('guma-do-klatki', 3, '12', 45, 'Średnia guma'),
      R('wioslowanie', 3, '12', 45, '8 → 16 kg', 'Lewa ręka, potem prawa'),
      R('rot-zew-lezenie', 3, '12–15', 45, '1,5 → 4 kg'),
      R('rot-wew-guma', 3, '12–15', 45, 'Lekka guma'),
      R('pompki-blok', 3, '12–15', 60, 'Masa ciała · 2 s blok w połowie drogi w górę'),
      R('pompka-plus', 3, '12', 45, 'Masa ciała'),
      STRETCH(2)
    ]
  };
}
function sP3() {
  return {
    id: 'sila', label: 'Trening', short: 'Siła', title: 'Cięższe ciągnięcie i praca nad głową', gap: 45, blocks: [
      WARM(120), ...isoWarm(),
      R('kolka-z-nogami', 3, '8–10', 75, 'Waga pod stopami 35 → 15 kg'),
      R('australijskie', 3, '8–12', 75, 'Masa ciała · trudniej: stopy dalej w przód'),
      R('rotacja-9090', 3, '12', 45, 'Lekka guma'),
      R('wyciskanie-polklek', 3, '8–10', 60, '6 → 12 kg', 'Lewa ręka, potem prawa'),
      R('unoszenie-y', 3, '10', 45, '0 → 2 kg'),
      R('pompki-blok-plus', 3, '15–20', 60, 'Masa ciała'),
      R('face-pull', 3, '12–15', 45, 'Średnia guma'),
      R('spacer-farmera', 3, '30 m', 60, '2 × 16 → 24 kg'),
      R('spacer-kelnera', 3, '20 m na rękę', 60, '6 → 10 kg', 'Lewa ręka, potem prawa'),
      STRETCH(2)
    ]
  };
}
const RUNG = {
  1: H('zwis-aktywny', 5, 15, 60, 'Wejdź ze skrzynki · łopatki w dół przez cały zwis'),
  2: R('lopatkowe-pelne', 3, '6–8', 90, 'Masa ciała · łokcie proste'),
  3: R('negatywy', 3, '3–5', 120, 'Opuszczanie 3–5 s · na górę ze skrzynki'),
  4: R('podciaganie-guma', 3, '5', 120, 'Guma, z którą 5 powt. wychodzi przy bólu 0–2'),
  5: R('podciaganie', 3, '3–5', 150, 'Daleko od upadku mięśniowego')
};
const KEEP = [
  R('rot-zew-lezenie', 2, '15', 45, '1,5 → 4 kg'),
  R('face-pull', 2, '15', 45, 'Średnia guma'),
  R('wioslowanie', 2, '12', 45, '8 → 16 kg', 'Lewa ręka, potem prawa'),
  R('guma-proste-rece', 2, '15', 45, 'Średnia guma'),
  R('pompka-plus', 2, '12', 45, 'Masa ciała'),
  R('spacer-farmera', 2, '30 m', 60, '2 × 20 kg')
];
function sP4(rung) {
  return {
    id: 'drabinka', label: 'Trening', short: 'Zwisy', title: 'Drabinka zwisów (szczebel ' + rung + ') i siła', gap: 45, ladder: true,
    blocks: [WARM(120), ...isoWarm(), RUNG[rung], ...KEEP, STRETCH(2)]
  };
}
function sP5() {
  const keep = KEEP.map(b => Object.assign({}, b, { rest: 30 }));
  return { id: 'sila', label: 'Trening', short: 'Siła', title: 'Profilaktyka na stałe', gap: 30, blocks: [WARM(60), ...keep] };
}
const NOTES = {
  climb1: { tag: 'Wspinanie', short: 'wspin.', text: 'Dziś możesz dodać łatwą wspinaczkę, 30–45 min: pion lub płyty, duże chwyty, bez blokowania i dalekich sięgnięć lewą ręką.' },
  climb: { tag: 'Wspinanie', short: 'wspin.', text: 'Łatwa wspinaczka 30–45 min: pion lub płyty, duże chwyty, bez blokowania lewą ręką.' },
  swim: { tag: 'Pływanie', short: 'pływ.', text: 'Opcjonalnie spokojne pływanie 15–20 min (kraul lub żabka, bez łapek), jeśli ściąganie gumy nie bolało.' },
  climb4: { tag: 'Wspinanie', short: 'wspin.', text: 'Wspinaczka: łatwe drogi, bez dynamicznych ruchów i bez dalekich sięgnięć lewą ręką.' },
  swim4: { tag: 'Pływanie', short: 'pływ.', text: 'Pływanie 15–20 min; dodawaj ok. 10% tygodniowo, jeśli poranki są zielone.' }
};

// ---------- stan ----------
function defaults(today) {
  const d = today || START;
  return {
    v: 3, epoch: 0, start: d, phase: 1, phaseStart: d, dayOffset: 0, rung: 1, rungGreen: 0,
    snooze: null, breakAck: null, gates: {}, log: {}, morning: {}, events: [], weight: {}, weightGoal: null, weightGoalAt: 0,
    blocks: {}, week: null, weekAt: 0, days: {}, blog: {}, climbBase: '6a', runBase: 0, levelsAt: 0,
    cycle: { start: addDays(d, -((dow(d) + 6) % 7)), build: 3, recover: 1 }, cycleAt: 0, props: {}, updated: 0
  };
}
function hasLog(st, d) { const l = st.log[d]; return !!l && Object.keys(l).some(k => l[k] && l[k].done); }
function isDone(st, d, id) { const l = st.log[d]; return !!(l && l[id] && l[id].done); }
function doneDays(st) { return Object.keys(st.log).filter(d => hasLog(st, d)).sort(); }
// Dzień treningowy w fazie liczony z dni, w które naprawdę był trening (przerwa nie przesuwa dawek).
function phaseDay(st, date) {
  let n = 0;
  for (const d of doneDays(st)) if (d >= st.phaseStart && d < date) n++;
  return (st.dayOffset || 0) + n;
}
function lastTraining(st, before) {
  const ds = doneDays(st).filter(d => d < before);
  return ds.length ? ds[ds.length - 1] : null;
}
function breakInfo(st, today) {
  if (hasLog(st, today) || st.breakAck === today) return null;
  const last = lastTraining(st, today);
  if (!last) return null;
  const days = diff(last, today);
  return days >= 3 ? { last, days } : null;
}

// Żółty poranek w fazach 2–5: o jedną serię mniej w każdym ćwiczeniu na powtórzenia.
function trimSets(s) {
  return Object.assign({}, s, { blocks: s.blocks.map(b => (b.kind === 'reps' && b.sets > 1 ? Object.assign({}, b, { sets: b.sets - 1 }) : b)) });
}
function dayPlan(date, st) {
  const practice = diff(st.start, date) < 0;
  const ref = practice ? st.start : date;
  const ph = st.phase, wd = dow(ref);
  const di = practice ? 0 : phaseDay(st, ref);
  const m = practice ? null : st.morning[date];
  let sessions, notes = [], advice = null;
  if (ph === 1) {
    const easy = m === 'yellow';
    const dd = easy ? Math.max(0, di - 1) : di;
    sessions = [sP1(dd, false, easy), sP1(dd, true, easy)];
    if (wd === 6) notes.push(NOTES.climb1);
  } else if (ph === 2 || ph === 3) {
    sessions = [[1, 3, 5].indexOf(wd) >= 0 ? (ph === 2 ? sP2() : sP3()) : sLight()];
    if (wd === 2) notes.push(NOTES.swim);
    if (wd === 6) notes.push(NOTES.climb);
  } else if (ph === 4) {
    sessions = [[1, 4].indexOf(wd) >= 0 ? sP4(st.rung) : sLight()];
    if (wd === 2) notes.push(NOTES.swim4);
    if (wd === 6) notes.push(NOTES.climb4);
  } else { sessions = [[1, 4].indexOf(wd) >= 0 ? sP5() : sLight()]; }
  if (m === 'red') {
    const l = sLight(); l.label = 'Dziś lżej'; l.title = 'Tylko lekka sesja';
    sessions = [l];
    notes = [];
    advice = { level: 'bad', text: 'Czerwony poranek: dziś tylko lekka sesja, bez wspinania. Jeśli nie mija przez 2–3 dni, idź do fizjoterapeuty.' };
  } else if (m === 'yellow') {
    if (ph === 1) advice = { level: 'warn', text: 'Żółty poranek: dziś czasy z wczoraj i lżej, ok. 30% siły.' };
    else { sessions = sessions.map(trimSets); advice = { level: 'warn', text: 'Żółty poranek: dziś te same ciężary co ostatnio i o jedną serię mniej w każdym ćwiczeniu.' }; }
  }
  return { date: ref, today: date, practice, phase: ph, day: di, sessions, notes, advice };
}

// ---------- zmiany planu ----------
function addEvent(st, e) { st.events = (st.events || []).concat([e]).slice(-300); }
function actAdvance(st, today) {
  if (st.phase >= 5) return;
  st.phase += 1; st.phaseStart = today; st.dayOffset = 0; st.snooze = null;
  if (st.phase === 4) { st.rung = 1; st.rungGreen = 0; }
  addEvent(st, { k: 'phase', p: st.phase, d: today, via: 'gate' });
}
function actBack(st, today) {
  if (st.phase <= 1) return;
  st.phase -= 1; st.phaseStart = today; st.dayOffset = 0; st.snooze = null;
  if (st.phase === 4) { st.rung = 1; st.rungGreen = 0; }
  addEvent(st, { k: 'phase', p: st.phase, d: today, via: 'back' });
}
// Od nowa: Faza 1 od dnia 1 od wybranej daty. Historia i punkty zostają, chyba że wipe.
function actRestart(st, date, wipe, now) {
  if (wipe) {
    // pomiary wagi, cel i bloki treningowe (biblioteka, tydzień, dziennik) zostają: to nie jest historia planu rehabilitacji
    const keep = { weight: st.weight || {}, weightGoal: st.weightGoal == null ? null : st.weightGoal, weightGoalAt: st.weightGoalAt || 0,
      blocks: st.blocks || {}, week: st.week || null, weekAt: st.weekAt || 0, days: st.days || {}, blog: st.blog || {},
      climbBase: st.climbBase || '6a', runBase: st.runBase || 0, levelsAt: st.levelsAt || 0,
      cycle: st.cycle || null, cycleAt: st.cycleAt || 0, props: st.props || {} };
    const fresh = defaults(date);
    Object.keys(st).forEach(k => { delete st[k]; });
    Object.assign(st, fresh, keep, { epoch: now || Date.now() });
  } else {
    Object.assign(st, { start: date, phase: 1, phaseStart: date, dayOffset: 0, rung: 1, rungGreen: 0, snooze: null, breakAck: null, gates: {} });
  }
  addEvent(st, { k: 'restart', d: date });
}
function actSetStage(st, phase, day, today, rung) {
  const changed = phase !== st.phase;
  st.phase = phase; st.phaseStart = today; st.dayOffset = Math.max(0, (day || 1) - 1); st.snooze = null;
  if (phase === 4 && rung) { st.rung = Math.max(1, Math.min(5, rung)); st.rungGreen = 0; }
  if (changed) addEvent(st, { k: 'phase', p: phase, d: today, via: 'manual' });
}

// ---------- kroki odtwarzacza ----------
function steps(session) {
  const out = [];
  session.blocks.forEach((b, bi) => {
    out.push({ k: 'prep', b, bi, dur: bi === 0 ? 10 : session.gap });
    if (b.kind === 'time') out.push({ k: 'work', b, bi, set: 1, sets: 1, dur: b.dur });
    else for (let s = 1; s <= b.sets; s++) {
      out.push({ k: 'work', b, bi, set: s, sets: b.sets, dur: b.kind === 'hold' ? b.hold : null });
      if (s < b.sets) out.push({ k: 'rest', b, bi, set: s, sets: b.sets, dur: b.rest });
    }
  });
  out.push({ k: 'done' });
  return out;
}
// Szacunek czasu serii na powtórzenia: ok. 4 s na powtórzenie, spacery ok. 40 s.
function repSec(b) {
  if (b.est) return b.est;
  const n = parseInt(b.reps, 10) || 10;
  const per = /m/.test(b.reps) ? 40 : Math.min(75, Math.max(20, n * 4));
  return per * (b.side ? 2 : 1);
}
function blockSec(b) {
  if (b.kind === 'time') return b.dur;
  if (b.kind === 'hold') return b.sets * b.hold + (b.sets - 1) * b.rest;
  return b.sets * repSec(b) + (b.sets - 1) * b.rest;
}
function seconds(session) { return 10 + session.blocks.reduce((t, b, i) => t + (i ? session.gap : 0) + blockSec(b), 0); }
function dose(b) {
  if (b.kind === 'time') return (b.dur % 60 ? (b.dur / 60).toFixed(1).replace('.', ',') : b.dur / 60) + ' min';
  if (b.kind === 'hold') return b.sets + ' × ' + b.hold + ' s';
  return b.sets + ' × ' + b.reps;
}
// Pojedyncze ćwiczenie z atlasu: dawka z planu, a gdy ćwiczenia nie ma w sesjach, z opisu karty.
const DEFAULT_BLOCK = {};
[sP1(6, true), sLight(), sP2(), sP3(), sP4(1), sP4(2), sP4(3), sP4(4), sP4(5), sP5()].forEach(s => s.blocks.forEach(b => {
  if (!DEFAULT_BLOCK[b.ex] || (DEFAULT_BLOCK[b.ex].sets === 1 && b.sets > 1)) DEFAULT_BLOCK[b.ex] = b;
}));
function singleSession(exId) {
  const ex = A.EX.find(e => e.id === exId) || (G.BLOCKS && G.BLOCKS.CAT[exId]);
  if (!ex) return null;
  let b = DEFAULT_BLOCK[exId];
  if (!b) {
    const mh = /(\d+)\s*×\s*(\d+)(?:–\d+)?\s*s/.exec(ex.dose), mr = /(\d+)\s*×\s*([\d–]+)/.exec(ex.dose);
    b = mh ? H(exId, +mh[1], +mh[2], 20, ex.load) : mr ? R(exId, +mr[1], mr[2], 45, ex.load) : H(exId, 3, 15, 30, ex.load);
  }
  return { id: 'cwiczenie', label: 'Ćwiczenie z atlasu', short: '', title: ex.name, gap: 10, single: true, blocks: [Object.assign({}, b)] };
}

// ---------- punkty, poziomy, odznaki ----------
const SPTS = { rano: 10, wieczor: 10, lekki: 6, sila: 20, drabinka: 25 };
const STREAK = [[3, 10], [7, 25], [14, 50], [21, 75], [30, 100], [45, 125], [60, 150], [90, 200]];
const PHASE_PTS = { 2: 50, 3: 100, 4: 150, 5: 200 };
const RUNG_PTS = 30, PAIN_PTS = 2, MORNING_PTS = 2, COMEBACK_PTS = 15;
// Poziomy to wyceny dróg: 7a to poziom sprzed kontuzji, osiągany mniej więcej z końcem Fazy 4.
const GRADES = [
  ['4a', 0], ['4b', 30], ['4c', 70], ['5a', 120], ['5b', 180], ['5c', 250], ['6a', 330], ['6a+', 450],
  ['6b', 600], ['6b+', 780], ['6c', 990], ['6c+', 1250], ['7a', 1700], ['7a+', 2200], ['7b', 2800],
  ['7b+', 3500], ['7c', 4300], ['7c+', 5200], ['8a', 6200]
];
const BADGES = [
  { id: 'pierwszy', name: 'Pierwszy krok', desc: 'Pierwsza zrobiona sesja' },
  { id: 'pelny', name: 'Pełny dzień', desc: 'Rano i po pracy tego samego dnia' },
  { id: 'dni3', name: '3 dni z rzędu', desc: 'Trzy dni treningu bez przerwy' },
  { id: 'dni7', name: 'Tydzień z rzędu', desc: 'Siedem dni bez przerwy' },
  { id: 'dni14', name: 'Dwa tygodnie', desc: 'Czternaście dni bez przerwy' },
  { id: 'dni30', name: 'Miesiąc z rzędu', desc: 'Trzydzieści dni bez przerwy' },
  { id: 'poranek', name: 'Słucham barku', desc: 'Siedem porannych ocen' },
  { id: 'bol', name: 'Szczerze o bólu', desc: 'Ocena bólu po 10 sesjach' },
  { id: 'powrot', name: 'Powrót', desc: 'Trening po co najmniej 5 dniach przerwy' },
  { id: 'faza2', name: 'Izometria zaliczona', desc: 'Przejście do Fazy 2' },
  { id: 'faza3', name: 'Siła w ruchu', desc: 'Przejście do Fazy 3' },
  { id: 'faza4', name: 'Gotowy na drabinkę', desc: 'Przejście do Fazy 4' },
  { id: 'faza5', name: 'Plan ukończony', desc: 'Przejście do profilaktyki na stałe' },
  { id: 'szczebel5', name: 'Pełne podciąganie', desc: 'Piąty szczebel drabinki' },
  { id: 'sesje25', name: '25 sesji', desc: 'Dwadzieścia pięć zrobionych sesji' },
  { id: 'sesje50', name: '50 sesji', desc: 'Pięćdziesiąt zrobionych sesji' },
  { id: 'sesje100', name: '100 sesji', desc: 'Sto zrobionych sesji' },
  { id: 'bieg1', name: 'Pierwszy bieg', desc: 'Pierwszy zapisany bieg' },
  { id: 'wspin1', name: 'Pierwsza wspinaczka', desc: 'Pierwsze zapisane wspinanie' },
  { id: 'palce1', name: 'Mocne palce', desc: 'Pierwszy trening palców' },
  { id: 'tydzien', name: 'Pełny tydzień', desc: '3 biegi i 3 wspinania w jednym tygodniu' },
  { id: 'km50', name: '50 km', desc: 'Pięćdziesiąt kilometrów biegu' },
  { id: 'km100', name: '100 km', desc: 'Sto kilometrów biegu' },
  { id: 'wspin10', name: '10 wspinaczek', desc: 'Dziesięć zapisanych wspinań' },
  { id: 'wyzwanie1', name: 'Pierwsze wyzwanie', desc: 'Pierwsze zaliczone wyzwanie tygodnia' },
  { id: 'wyzwania10', name: '10 wyzwań', desc: 'Dziesięć zaliczonych wyzwań tygodnia' },
  { id: 'rekord1', name: 'Nowy rekord', desc: 'Pierwszy pobity rekord' },
  { id: 'rekord10', name: '10 rekordów', desc: 'Dziesięć pobitych rekordów' }
];
function entryPoints(sid, e) {
  let p = SPTS[sid] || 10;
  if (e.partial) p = Math.round(p / 2);
  if (e.pain != null) p += PAIN_PTS;
  return p;
}
function gradeOf(total) {
  let i = 0;
  while (i + 1 < GRADES.length && total >= GRADES[i + 1][1]) i++;
  const nx = GRADES[i + 1] || null;
  const lo = GRADES[i][1], hi = nx ? nx[1] : lo;
  return { i, name: GRADES[i][0], min: lo, next: nx ? nx[0] : null, nextMin: nx ? hi : null, toNext: nx ? hi - total : 0, pct: nx ? (total - lo) / (hi - lo) : 1 };
}
// Punkty liczone z dziennika za każdym razem: sesje rehabilitacji i bloki treningowe (G.BLOCKS), serie dni ze wszystkich treningów.
function progress(st, today) {
  const BL = G.BLOCKS;
  const bent = BL ? BL.entries(st) : [];
  const bByDay = {};
  bent.forEach(x => { (bByDay[x.d] = bByDay[x.d] || []).push(x); });
  const seenDay = {};
  const days = doneDays(st).concat(Object.keys(bByDay)).filter(d => (seenDay[d] ? false : (seenDay[d] = 1))).sort();
  const earned = {};
  const award = (id, d) => { if (!earned[id]) earned[id] = d; };
  const byEntry = {}, byDay = {}, weeks = {};
  let total = 0, sessions = 0, seconds = 0, painN = 0, run = 0, best = 0, prev = null;
  let blocks = 0, runs = 0, climbs = 0, fingers = 0, km = 0, fullWeeks = 0, climbPts = 0, runPts = 0;
  const addDay = (d, p) => { byDay[d] = (byDay[d] || 0) + p; total += p; };
  days.forEach(d => {
    const l = st.log[d] || {};
    (bByDay[d] || []).forEach(x => {
      const p = BL.entryPoints(x.e);
      byEntry[d + '|b:' + x.k] = p;
      addDay(d, p);
      if (CLIMB_T[x.e.t]) climbPts += p;
      if (x.e.t === 'bieg') runPts += p;
      blocks += 1; seconds += x.e.dur || 0;
      if (x.e.t === 'bieg') {
        runs += 1;
        const before = km;
        km += x.e.km || 0;
        if (runs === 1) award('bieg1', d);
        if (before < 50 && km >= 50) award('km50', d);
        if (before < 100 && km >= 100) award('km100', d);
      }
      if (x.e.t === 'wspin') { climbs += 1; if (climbs === 1) award('wspin1', d); if (climbs === 10) award('wspin10', d); }
      if (x.e.t === 'palce') { fingers += 1; if (fingers === 1) award('palce1', d); }
      weeks[BL.weekStart(d)] = 1;
    });
    Object.keys(l).sort().forEach(sid => {
      const e = l[sid];
      if (!e || !e.done) return;
      const p = entryPoints(sid, e);
      byEntry[d + '|' + sid] = p;
      addDay(d, p);
      sessions += 1; seconds += e.dur || 0;
      if (e.pain != null) { painN += 1; if (painN === 10) award('bol', d); }
      if (sessions === 1) award('pierwszy', d);
      if (sessions === 25) award('sesje25', d);
      if (sessions === 50) award('sesje50', d);
      if (sessions === 100) award('sesje100', d);
    });
    if (isDone(st, d, 'rano') && isDone(st, d, 'wieczor') && !l.rano.partial && !l.wieczor.partial) award('pelny', d);
    if (prev && diff(prev, d) >= 6) { addDay(d, COMEBACK_PTS); award('powrot', d); }
    run = prev && diff(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    STREAK.forEach(([n, b]) => { if (run === n) addDay(d, b); });
    if (run === 3) award('dni3', d);
    if (run === 7) award('dni7', d);
    if (run === 14) award('dni14', d);
    if (run === 30) award('dni30', d);
    prev = d;
  });
  // wyzwania tygodnia i rekordy (punkty w dniu zaliczenia)
  const chDone = [], recordEvents = BL ? BL.records(bent).events : [];
  if (BL) Object.keys(weeks).sort().forEach(w => BL.challenges(st, w, bent).forEach(c => { if (c.done) chDone.push({ id: c.id, name: c.name, d: c.doneDay, pts: c.pts, week: w }); }));
  chDone.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).forEach((c, i) => {
    addDay(c.d, c.pts); byEntry[c.d + '|ch:' + c.id] = (byEntry[c.d + '|ch:' + c.id] || 0) + c.pts;
    if (CH_TRACK[c.id] === 'climb') climbPts += c.pts;
    if (CH_TRACK[c.id] === 'run') runPts += c.pts;
    if (i === 0) award('wyzwanie1', c.d);
    if (i === 9) award('wyzwania10', c.d);
    if (c.id === 'pelny') { fullWeeks += 1; award('tydzien', c.d); }
  });
  recordEvents.forEach((r, i) => {
    addDay(r.d, r.pts); byEntry[r.d + '|rec:' + r.id + ':' + r.k] = r.pts;
    if (REC_TRACK[r.id] === 'climb') climbPts += r.pts;
    if (REC_TRACK[r.id] === 'run') runPts += r.pts;
    if (i === 0) award('rekord1', r.d);
    if (i === 9) award('rekord10', r.d);
  });
  const mDays = Object.keys(st.morning).sort();
  mDays.forEach((d, i) => { addDay(d, MORNING_PTS); if (i === 6) award('poranek', d); });
  const seenP = {}, seenR = {};
  (st.events || []).slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).forEach(ev => {
    if (ev.k === 'phase' && ev.via === 'gate' && PHASE_PTS[ev.p] && !seenP[ev.p]) { seenP[ev.p] = 1; addDay(ev.d, PHASE_PTS[ev.p]); award('faza' + ev.p, ev.d); }
    if (ev.k === 'rung' && ev.r >= 2 && !seenR[ev.r]) { seenR[ev.r] = 1; addDay(ev.d, RUNG_PTS); if (ev.r === 5) award('szczebel5', ev.d); }
  });
  const last = days.length ? days[days.length - 1] : null;
  const alive = last && today && diff(last, today) <= 1;
  return {
    total, grade: gradeOf(total), sessions, minutes: Math.round(seconds / 60), streak: alive ? run : 0, best,
    blocks, runs, climbs, fingers, km: Math.round(km * 10) / 10, fullWeeks, chDone, recordEvents,
    climb: climbLevel(st, climbPts), run: runLevel(st, runPts),
    badges: BADGES.map(b => Object.assign({}, b, { d: earned[b.id] || null })), byEntry, byDay
  };
}
const gradeBand = g => 'g' + g.charAt(0);

// ---------- poziomy: wspinanie i bieganie ----------
// Wspinanie: wyceny dróg; punkty za wspinanie, palce i siłę (oraz ich wyzwania i rekordy). Start od poziomu, który ustawiasz
// (climbBase), każdy kolejny stopień kosztuje trochę więcej. Pełny tydzień daje ok. 100 pkt, 6a -> 7c to ok. 2300 pkt.
const CLIMB_STEP = [40, 50, 60, 70, 80, 100, 120, 150, 170, 190, 210, 240, 270, 300, 330, 360, 400, 450];
// Bieganie: nazwane stopnie aż do celu 1:20 w półmaratonie; punkty za biegi (oraz ich wyzwania i rekordy).
// Nazwy to stopnie gry, nie zmierzony czas: prawdziwą formę pokazuje osobna linia (przewidywany półmaraton).
const RUN_LEVELS = [
  ['Start', 'Start'], ['Truchtacz', 'Trucht'], ['Biegacz', 'Biegacz'], ['5 km', '5 km'], ['10 km', '10 km'], ['15 km', '15 km'],
  ['Półmaraton', 'Półmar.'], ['1:55', '1:55'], ['1:50', '1:50'], ['1:45', '1:45'], ['1:40', '1:40'], ['1:35', '1:35'],
  ['1:30', '1:30'], ['1:25', '1:25'], ['1:22', '1:22'], ['1:20', '1:20']
];
const RUN_STEP = [40, 60, 90, 120, 160, 220, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
const CLIMB_T = { wspin: 1, palce: 1, sila: 1 };
const CH_TRACK = { km: 'run', dlugi: 'run', palce2: 'climb', sila2: 'climb', drogi: 'climb' };
const REC_TRACK = { km: 'run', tempo5: 'run', tempo10: 'run', tydzien: 'run', grade: 'climb', drogi: 'climb' };
// Stopień na drabince: start na base, potem kolejne progi z steps.
function ladder(names, steps, base, pts) {
  let i = Math.max(0, Math.min(names.length - 1, base)), left = Math.max(0, pts);
  while (i < names.length - 1 && left >= steps[i]) { left -= steps[i]; i++; }
  const last = i >= names.length - 1, need = last ? 0 : steps[i];
  return { i, base, pts, name: names[i][0], short: names[i][1], next: last ? null : names[i + 1][0], toNext: last ? 0 : need - left, pct: last ? 1 : left / need, top: last };
}
const climbBaseIdx = st => { const i = GRADES.findIndex(g => g[0] === st.climbBase); return i < 0 ? GRADES.findIndex(g => g[0] === '6a') : i; };
const climbLevel = (st, pts) => ladder(GRADES.map(g => [g[0], g[0]]), CLIMB_STEP, climbBaseIdx(st), pts);
const runLevel = (st, pts) => ladder(RUN_LEVELS, RUN_STEP, Math.max(0, Math.min(RUN_LEVELS.length - 1, st.runBase | 0)), pts);

// ---------- waga ----------
const r1 = v => Math.round(v * 10) / 10;
function weightEntries(st) {
  const w = st.weight || {};
  return Object.keys(w).filter(d => w[d] && !w[d].del && typeof w[d].kg === 'number').sort().map(d => ({ d, kg: w[d].kg }));
}
// Średnia z pomiarów z ostatnich 7 dni kalendarzowych (wygładza wahania z dnia na dzień).
function weightTrend(es) {
  return es.map((e, i) => {
    let sum = 0, n = 0;
    for (let j = i; j >= 0 && diff(es[j].d, e.d) < 7; j--) { sum += es[j].kg; n++; }
    return { d: e.d, kg: r1(sum / n), raw: sum / n };
  });
}
function weightStats(st, today) {
  const es = weightEntries(st);
  if (!es.length) return null;
  const tr = weightTrend(es);
  const last = es[es.length - 1], lt = tr[tr.length - 1];
  const at = days => { const target = addDays(lt.d, -days); let v = null; tr.forEach(t => { if (t.d <= target) v = t; }); return v; };
  const w7 = at(7), w30 = at(30);
  let min = es[0], max = es[0];
  es.forEach(e => { if (e.kg < min.kg) min = e; if (e.kg > max.kg) max = e; });
  const goal = typeof st.weightGoal === 'number' ? st.weightGoal : null;
  return {
    entries: es, trend: tr, last, avg: lt.kg, first: es[0], min, max, goal, today: weightOn(st, today),
    d7: w7 ? r1(lt.kg - w7.kg) : null, d30: w30 ? r1(lt.kg - w30.kg) : null, total: es.length > 1 ? r1(lt.kg - es[0].kg) : null,
    toGoal: goal == null ? null : r1(lt.kg - goal)
  };
}
// Okno wykresu [from, to]: pomiary ze średnią, punkt tuż przed oknem (linia wchodzi z lewej krawędzi) i zmiana średniej.
// days = 0 oznacza wszystkie pomiary.
function weightWindow(st, today, days) {
  const es = weightEntries(st);
  if (!es.length) return null;
  const tr = weightTrend(es);
  const last = es[es.length - 1];
  const to = last.d > today ? last.d : today;
  const all = !(days > 0);
  // Oś zaczyna się najwcześniej od pierwszego pomiaru (bez pustego pola z lewej), ale obejmuje co najmniej tydzień.
  let from = all ? es[0].d : addDays(to, -(days - 1));
  if (es[0].d > from) from = es[0].d;
  if (diff(from, to) < 6) from = addDays(to, -6);
  const pt = i => ({ d: es[i].d, kg: es[i].kg, avg: tr[i].kg, avgRaw: tr[i].raw });
  const idx = [];
  es.forEach((e, i) => { if (e.d >= from && e.d <= to) idx.push(i); });
  const out = { from, to, days: diff(from, to) + 1, all, total: es.length, count: idx.length, last: pt(es.length - 1), empty: !idx.length };
  if (out.empty) return out;
  out.points = idx.map(pt);
  out.prev = idx[0] > 0 && diff(es[idx[0] - 1].d, from) <= 14 ? pt(idx[0] - 1) : null;
  out.ref = out.prev || out.points[0];
  out.cur = out.points[out.points.length - 1];
  out.delta = out.ref.d === out.cur.d ? null : r1(out.cur.avg - out.ref.avg);
  // „w 30 dni” tylko wtedy, gdy punkt odniesienia naprawdę leży na początku okna
  out.exact = !all && Math.abs(diff(out.ref.d, to) - days) <= 1;
  let min = out.points[0], max = out.points[0];
  out.points.forEach(p => { if (p.kg < min.kg) min = p; if (p.kg > max.kg) max = p; });
  out.min = min; out.max = max;
  return out;
}
const weightOn = (st, d) => { const e = st.weight && st.weight[d]; return e && !e.del && typeof e.kg === 'number' ? e.kg : null; };
// Najbliższy dzień przed dziś bez pomiaru (do formularza „pomiar z innego dnia”).
function weightGapDay(st, today) {
  for (let i = 1; i <= 60; i++) { const d = addDays(today, -i); if (weightOn(st, d) == null) return d; }
  return addDays(today, -1);
}
function setWeight(st, d, kg, now) { st.weight = st.weight || {}; st.weight[d] = { kg: r1(kg), at: now || Date.now() }; }
function delWeight(st, d, now) { st.weight = st.weight || {}; st.weight[d] = { del: true, at: now || Date.now() }; }
function setGoal(st, kg, now) { st.weightGoal = kg == null ? null : r1(kg); st.weightGoalAt = now || Date.now(); }
// „66,4”, „66.4”, „66”, „66,4 kg”; nic innego (literówka typu „664” albo „6,64” nie przechodzi).
function parseKg(s) {
  const m = /^(\d{2,3})(?:[.,](\d{0,2}))?\s*(?:kg)?$/i.exec(String(s == null ? '' : s).trim());
  if (!m) return null;
  const v = parseFloat(m[1] + '.' + (m[2] || '0'));
  return v >= 25 && v <= 300 ? r1(v) : null;
}

const API = {
  START, PHASES, GATES, NAMES, GRADES, BADGES, SPTS, STREAK, PHASE_PTS, RUNG_PTS, PAIN_PTS, MORNING_PTS, COMEBACK_PTS,
  ymd, parse, addDays, diff, dow, longDate, shortDate, DAYS, DSHORT, MONTHS, defaults, hasLog, isDone, doneDays, phaseDay, lastTraining, breakInfo,
  dayPlan, steps, seconds, repSec, dose, singleSession, entryPoints, gradeOf, gradeBand, progress,
  CLIMB_STEP, RUN_LEVELS, RUN_STEP, ladder, climbLevel, runLevel,
  weightEntries, weightTrend, weightStats, weightWindow, weightOn, weightGapDay, setWeight, delWeight, setGoal, parseKg,
  addEvent, actAdvance, actBack, actRestart, actSetStage
};
G.PLAN = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
