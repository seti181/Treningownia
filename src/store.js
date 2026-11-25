/* Stan aplikacji: walidacja (sanitize), scalanie dwóch kopii (merge), porównanie (canon), kopia zapasowa. Czyste funkcje, bez DOM. */
(function (G) {
'use strict';
const PL = G.PLAN;
const KEY = 'treningownia-v1';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// Nazwy z Object.prototype („constructor”, „toString”, „__proto__”) nigdy nie są id ani kluczem: zwykły obiekt zwróciłby
// dla nich wbudowaną funkcję zamiast braku wpisu (wrogi plik kopii psuł tak punkty i ekrany Dziś i Tydzień).
const PROTO = k => k in Object.prototype;
const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const idRe = re => ({ test: s => typeof s === 'string' && re.test(s) && !PROTO(s) });
const SID = idRe(/^[a-z]{2,12}$/);
const BID = idRe(/^[a-z0-9][a-z0-9-]{1,39}$/);
const KID = idRe(/^[a-z0-9][a-z0-9:_-]{0,59}$/i);
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const clone = o => JSON.parse(JSON.stringify(o));
const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const at = o => +o.at || 0;
// ---------- bloki treningowe ----------
function cleanItem(x) {
  if (!isObj(x) || typeof x.ex !== 'string' || !BID.test(x.ex) || ['hold', 'reps', 'time'].indexOf(x.kind) < 0) return null;
  const o = { ex: x.ex, kind: x.kind, sets: num(x.sets, 1, 20) ? Math.round(x.sets) : 1, note: str(x.note, 80) };
  if (x.kind === 'hold') o.hold = num(x.hold, 1, 600) ? Math.round(x.hold) : 10;
  if (x.kind === 'reps') o.reps = str(x.reps, 20) || '10';
  if (x.kind === 'time') { o.dur = num(x.dur, 5, 7200) ? Math.round(x.dur) : 60; o.sets = 1; }
  if (x.kind !== 'time') o.rest = num(x.rest, 0, 600) ? Math.round(x.rest) : 30;
  if (typeof x.side === 'string' && x.side) o.side = str(x.side, 40);
  ['lbl', 'restLbl', 'doneLbl'].forEach(f => { if (typeof x[f] === 'string' && x[f].trim()) o[f] = str(x[f], 20); });
  if (x.measure) o.measure = true;
  if (num(x.est, 10, 14400)) o.est = Math.round(x.est);
  if (num(x.kg, -100, 60)) o.kg = Math.round(x.kg * 10) / 10;
  return o;
}
function cleanBlock(id, b) {
  if (!isObj(b)) return null;
  if (b.del) return { del: true, at: at(b) };
  const BL = G.BLOCKS;
  if (!BL || BL.KINDS.indexOf(b.kind) < 0 || !own(BL.TRACKS, b.t)) return null;
  const o = { id, name: str(b.name, 60) || 'Blok', kind: b.kind, t: b.t, min: num(b.min, 0, 600) ? Math.round(b.min) : 0, note: str(b.note, 300), at: at(b) };
  if (num(b.km, 0.1, 200)) o.km = Math.round(b.km * 100) / 100;
  if (b.kind === 'timed' || (b.kind === 'run' && Array.isArray(b.items) && b.items.length)) {
    o.gap = num(b.gap, 0, 300) ? Math.round(b.gap) : 30;
    o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map(cleanItem).filter(Boolean);
  }
  if (b.kind === 'run' && BL.ZONES && (own(BL.ZONES, b.zone) || b.zone === 'test')) o.zone = b.zone;
  if (b.after === 'test') o.after = 'test';
  return o;
}
function cleanEntry(e) {
  if (!isObj(e)) return null;
  if (e.del) return { del: true, at: at(e) };
  const BL = G.BLOCKS;
  if (!e.done || typeof e.b !== 'string' || !BID.test(e.b) || !BL || !own(BL.TRACKS, e.t)) return null;
  const o = { b: e.b, t: e.t, kind: BL.KINDS.indexOf(e.kind) >= 0 ? e.kind : 'simple', name: str(e.name, 60), done: true, at: at(e) };
  if (num(e.dur, 0, 86400)) o.dur = Math.round(e.dur);
  if (num(e.km, 0.01, 300)) o.km = Math.round(e.km * 100) / 100;
  if (num(e.sec, 1, 86400)) o.sec = Math.round(e.sec);
  if (num(e.rpe, 1, 10)) o.rpe = Math.round(e.rpe);
  if (num(e.pain, 0, 10)) o.pain = Math.round(e.pain);
  if (num(e.routes, 0, 200)) o.routes = Math.round(e.routes);
  if (BL.GRADE_LIST.indexOf(e.grade) >= 0) o.grade = e.grade;
  if (BL.PLACES.indexOf(e.place) >= 0) o.place = e.place;
  if (Array.isArray(e.rl)) {
    const rl = e.rl.filter(r => isObj(r) && BL.GRADE_LIST.indexOf(r.g) >= 0 && BL.STYLE_IDS.indexOf(r.s) >= 0).slice(0, 60)
      .map(r => (typeof r.p === 'string' && BID.test(r.p) ? { g: r.g, s: r.s, p: r.p } : { g: r.g, s: r.s }));
    if (rl.length) o.rl = rl;
  }
  if (num(e.kg, -100, 60)) o.kg = Math.round(e.kg * 10) / 10;
  if (e.mm === 20 || e.mm === 15) o.mm = e.mm;
  if (str(e.note, 200)) o.note = str(e.note, 200);
  if (e.partial) o.partial = true;
  return o;
}
// projekt wspinaczkowy albo znacznik usunięcia
function cleanProject(id, p) {
  if (!isObj(p)) return null;
  if (p.del) return { del: true, at: at(p) };
  const BL = G.BLOCKS;
  if (!BL || BL.GRADE_LIST.indexOf(p.grade) < 0 || !DATE.test(p.start || '')) return null;
  const o = { id, name: str(p.name, 60) || 'Projekt', grade: p.grade, start: p.start, at: at(p) };
  if (BL.PLACES.indexOf(p.place) >= 0) o.place = p.place;
  if (str(p.note, 200)) o.note = str(p.note, 200);
  return o;
}
function sanitizeBlocks(o, d) {
  if (isObj(o.projects)) Object.keys(o.projects).slice(0, 300).forEach(id => { if (BID.test(id)) { const p = cleanProject(id, o.projects[id]); if (p) d.projects[id] = p; } });
  if (isObj(o.blocks)) Object.keys(o.blocks).slice(0, 300).forEach(id => { if (BID.test(id)) { const b = cleanBlock(id, o.blocks[id]); if (b) d.blocks[id] = b; } });
  if (isObj(o.week)) {
    d.week = {};
    for (let i = 0; i < 7; i++) d.week[i] = (Array.isArray(o.week[i]) ? o.week[i] : []).filter(x => typeof x === 'string' && BID.test(x)).slice(0, 8);
  }
  d.weekAt = +o.weekAt || 0;
  if (isObj(o.days)) Object.keys(o.days).sort().slice(-800).forEach(day => {
    const x = o.days[day];
    if (!DATE.test(day) || !isObj(x)) return;
    const items = (Array.isArray(x.items) ? x.items : []).filter(i => isObj(i) && typeof i.k === 'string' && KID.test(i.k) && typeof i.b === 'string' && BID.test(i.b)).slice(0, 12)
      .map(i => (i.skip ? { k: i.k, b: i.b, skip: true } : { k: i.k, b: i.b }));
    d.days[day] = { items, at: at(x) };
  });
  if (isObj(o.blog)) Object.keys(o.blog).sort().slice(-4000).forEach(day => {
    if (!DATE.test(day) || !isObj(o.blog[day])) return;
    Object.keys(o.blog[day]).slice(0, 20).forEach(k => {
      if (!KID.test(k)) return;
      const e = cleanEntry(o.blog[day][k]);
      if (e) (d.blog[day] = d.blog[day] || {})[k] = e;
    });
  });
}
// Bloki, tydzień, dni i dziennik bloków łączą się zawsze (także po wyczyszczeniu historii rehabilitacji):
// dla każdego bloku, dnia i wpisu wygrywa późniejszy zapis, znaczniki usunięcia też.
function mergeBlocks(out, other) {
  ['blocks', 'days', 'projects'].forEach(key => Object.keys(other[key] || {}).forEach(id => {
    out[key] = out[key] || {};
    const x = other[key][id], y = out[key][id];
    if (!y || at(x) > at(y)) out[key][id] = clone(x);
  }));
  Object.keys(other.blog || {}).forEach(day => Object.keys(other.blog[day]).forEach(k => {
    const x = other.blog[day][k], y = out.blog[day] && out.blog[day][k];
    if (!y || at(x) > at(y)) (out.blog[day] = out.blog[day] || {})[k] = clone(x);
  }));
  if ((other.weekAt || 0) > (out.weekAt || 0)) { out.week = other.week ? clone(other.week) : null; out.weekAt = other.weekAt; }
  if ((other.levelsAt || 0) > (out.levelsAt || 0)) { out.climbBase = other.climbBase; out.runBase = other.runBase; out.levelsAt = other.levelsAt; }
  if ((other.rehabDoneAt || 0) > (out.rehabDoneAt || 0)) { out.rehabDone = other.rehabDone || null; out.rehabDoneAt = other.rehabDoneAt; }
  if ((other.cycleAt || 0) > (out.cycleAt || 0)) { out.cycle = other.cycle ? clone(other.cycle) : null; out.cycleAt = other.cycleAt; }
  out.props = out.props || {};
  Object.keys(other.props || {}).forEach(id => { const x = other.props[id], y = out.props[id]; if (!y || at(x) > at(y)) out.props[id] = clone(x); });
  return out;
}

// JSON z kluczami w kolejności alfabetycznej: dwie kopie tego samego stanu dają ten sam tekst.
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (isObj(v)) return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
// Wszystko, co przychodzi z pamięci, z chmury albo z pliku kopii: tylko znane klucze i poprawne wartości.
function sanitize(o, fallbackDay) {
  const d = PL.defaults(fallbackDay);
  if (!isObj(o)) return d;
  if (typeof o.start === 'string' && DATE.test(o.start)) d.start = o.start;
  if ([1, 2, 3, 4, 5].indexOf(o.phase) >= 0) d.phase = o.phase;
  if (typeof o.phaseStart === 'string' && DATE.test(o.phaseStart)) d.phaseStart = o.phaseStart;
  if (o.dayOffset >= 0 && o.dayOffset <= 60) d.dayOffset = Math.round(o.dayOffset);
  if (o.rung >= 1 && o.rung <= 5) d.rung = Math.round(o.rung);
  if (o.rungGreen >= 0 && o.rungGreen <= 2) d.rungGreen = Math.round(o.rungGreen);
  if (typeof o.snooze === 'string' && DATE.test(o.snooze)) d.snooze = o.snooze;
  if (typeof o.breakAck === 'string' && DATE.test(o.breakAck)) d.breakAck = o.breakAck;
  if (typeof o.epoch === 'number' && o.epoch > 0) d.epoch = o.epoch;
  if (isObj(o.gates)) Object.keys(o.gates).forEach(k => { if (/^[1-4]$/.test(k) && Array.isArray(o.gates[k])) d.gates[k] = o.gates[k].slice(0, 5).map(Boolean); });
  if (isObj(o.morning)) Object.keys(o.morning).forEach(k => { if (DATE.test(k) && ['green', 'yellow', 'red'].indexOf(o.morning[k]) >= 0) d.morning[k] = o.morning[k]; });
  if (isObj(o.log)) Object.keys(o.log).forEach(day => {
    if (!DATE.test(day) || !isObj(o.log[day])) return;
    Object.keys(o.log[day]).forEach(sid => {
      const e = o.log[day][sid];
      if (!SID.test(sid) || !isObj(e) || !e.done) return;
      const x = { done: true, at: +e.at || 0, dur: +e.dur || 0, pain: (typeof e.pain === 'number' && e.pain >= 0 && e.pain <= 10) ? Math.round(e.pain) : null, label: typeof e.label === 'string' ? e.label.slice(0, 40) : '' };
      if (e.partial) x.partial = true;
      if (typeof e.note === 'string' && e.note.trim()) x.note = e.note.trim().slice(0, 140);
      (d.log[day] = d.log[day] || {})[sid] = x;
    });
  });
  if (Array.isArray(o.events)) o.events.slice(-300).forEach(ev => {
    if (!isObj(ev) || !DATE.test(ev.d) || ['phase', 'rung', 'restart'].indexOf(ev.k) < 0) return;
    const x = { k: ev.k, d: ev.d };
    if (ev.p >= 1 && ev.p <= 5) x.p = Math.round(ev.p);
    if (ev.r >= 1 && ev.r <= 5) x.r = Math.round(ev.r);
    if (['gate', 'manual', 'back'].indexOf(ev.via) >= 0) x.via = ev.via;
    if (typeof ev.s === 'string' && ev.s.length <= 40) x.s = ev.s;
    d.events.push(x);
  });
  // waga: pomiar { kg, at } albo znacznik usunięcia { del, at } (żeby usunięty pomiar nie wrócił z innego urządzenia)
  if (isObj(o.weight)) Object.keys(o.weight).sort().slice(-4000).forEach(day => {
    const e = o.weight[day];
    if (!DATE.test(day) || !isObj(e)) return;
    if (e.del) d.weight[day] = { del: true, at: +e.at || 0 };
    else if (typeof e.kg === 'number' && e.kg >= 25 && e.kg <= 300) d.weight[day] = { kg: Math.round(e.kg * 10) / 10, at: +e.at || 0 };
  });
  if (typeof o.weightGoal === 'number' && o.weightGoal >= 25 && o.weightGoal <= 300) d.weightGoal = Math.round(o.weightGoal * 10) / 10;
  d.weightGoalAt = +o.weightGoalAt || 0;
  sanitizeBlocks(o, d);
  if (PL.GRADES.some(g => g[0] === o.climbBase)) d.climbBase = o.climbBase;
  if (isObj(o.cycle) && typeof o.cycle.start === 'string' && DATE.test(o.cycle.start)) {
    d.cycle = { start: o.cycle.start, build: num(o.cycle.build, 1, 8) ? Math.round(o.cycle.build) : 3, recover: num(o.cycle.recover, 0, 3) ? Math.round(o.cycle.recover) : 1 };
  } else if (o.cycle === null) d.cycle = null;
  d.cycleAt = +o.cycleAt || 0;
  if (typeof o.rehabDone === 'string' && DATE.test(o.rehabDone)) d.rehabDone = o.rehabDone;
  d.rehabDoneAt = +o.rehabDoneAt || 0;
  if (isObj(o.props)) Object.keys(o.props).slice(0, 500).forEach(id => {
    const p = o.props[id];
    // '__proto__' podmieniłby prototyp obiektu props zamiast dodać wpis; inne nazwy z Object.prototype też odpadają
    if (typeof id !== 'string' || id.length > 80 || PROTO(id) || !isObj(p)) return;
    if (p.del) { d.props[id] = { del: true, at: at(p) }; return; }
    if ((p.s === 'ok' || p.s === 'no') && typeof p.d === 'string' && DATE.test(p.d)) d.props[id] = { s: p.s, d: p.d, at: at(p), text: str(p.text, 200) };
  });
  if (o.runBase >= 0 && o.runBase < PL.RUN_LEVELS.length) d.runBase = Math.round(o.runBase);
  d.levelsAt = +o.levelsAt || 0;
  d.updated = +o.updated || 0;
  return d;
}
// Nowszy stan jest bazą; zapisane sesje, poranki i zdarzenia z obu stron się sumują.
// Wyczyszczenie historii (nowa epoka) wygrywa w całości, żeby stare wpisy nie wracały z innego urządzenia.
// Waga nie należy do historii planu: pomiary z obu stron łączą się zawsze, dla każdego dnia wygrywa późniejszy zapis.
function mergeWeight(out, other) {
  Object.keys(other.weight || {}).forEach(d => {
    const x = other.weight[d], y = out.weight[d];
    if (!y || (x.at || 0) > (y.at || 0)) out.weight[d] = clone(x);
  });
  if ((other.weightGoalAt || 0) > (out.weightGoalAt || 0)) { out.weightGoal = other.weightGoal; out.weightGoalAt = other.weightGoalAt; }
  return out;
}
function merge(a, b) {
  if ((a.epoch || 0) !== (b.epoch || 0)) {
    const win = (a.epoch || 0) > (b.epoch || 0) ? a : b;
    return mergeBlocks(mergeWeight(clone(win), win === a ? b : a), win === a ? b : a);
  }
  const base = (b.updated || 0) > (a.updated || 0) ? b : a;
  const other = base === b ? a : b;
  const out = clone(base);
  Object.keys(other.log).forEach(d => Object.keys(other.log[d]).forEach(s => {
    const x = other.log[d][s], y = out.log[d] && out.log[d][s];
    if (!y || (x.at || 0) > (y.at || 0)) (out.log[d] = out.log[d] || {})[s] = clone(x);
  }));
  Object.keys(other.morning).forEach(d => { if (!out.morning[d]) out.morning[d] = other.morning[d]; });
  const seen = {};
  out.events = out.events.concat(other.events).filter(ev => { const k = canon(ev); if (seen[k]) return false; seen[k] = 1; return true; })
    .sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0)).slice(-300);
  return mergeBlocks(mergeWeight(out, other), other);
}

// ---------- kopia zapasowa (plik JSON) ----------
const BACKUP_APP = 'treningownia', BACKUP_FORMAT = 1;
function backup(st, now) { return { app: BACKUP_APP, format: BACKUP_FORMAT, exported: new Date(now || Date.now()).toISOString(), state: clone(st) }; }
function backupName(day) { return 'treningownia-kopia-' + day + '.json'; }
// Odczyt pliku kopii: { state, exported, counts } albo { error } z polskim opisem.
function readBackup(text, fallbackDay) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return { error: 'To nie jest plik kopii (zły format).' }; }
  if (!isObj(o) || o.app !== BACKUP_APP || !isObj(o.state)) return { error: 'To nie jest plik kopii Treningowni.' };
  if (o.format > BACKUP_FORMAT) return { error: 'Ta kopia pochodzi z nowszej wersji aplikacji. Odśwież aplikację i spróbuj ponownie.' };
  const st = sanitize(o.state, fallbackDay);
  return { state: st, exported: typeof o.exported === 'string' ? o.exported : '', counts: counts(st) };
}
// Ile pozycji z tego urządzenia zniknie po scaleniu z kopią: wpisy, pomiary, projekty i bloki, które kopia oznacza
// jako usunięte, oraz sesje rehabilitacji, gdy w kopii historia była wyczyszczona (nowsza epoka). Pokazywane przed wczytaniem.
function lossOf(local, merged) {
  let n = 0;
  const gone = (x, y) => isObj(x) && !x.del && (!isObj(y) || !!y.del);
  const get = (o, a, b) => (o && o[a] && b !== undefined ? o[a][b] : o && o[a]);
  Object.keys(local.log || {}).forEach(d => Object.keys(local.log[d]).forEach(s => { if (local.log[d][s].done && !get(merged.log, d, s)) n++; }));
  Object.keys(local.weight || {}).forEach(d => { if (gone(local.weight[d], get(merged.weight, d))) n++; });
  Object.keys(local.blog || {}).forEach(d => Object.keys(local.blog[d]).forEach(k => { if (gone(local.blog[d][k], get(merged.blog, d, k))) n++; }));
  ['projects', 'blocks'].forEach(key => Object.keys(local[key] || {}).forEach(id => { if (gone(local[key][id], get(merged[key], id))) n++; }));
  return n;
}
function counts(st) {
  let sessions = 0;
  Object.keys(st.log).forEach(d => Object.keys(st.log[d]).forEach(s => { if (st.log[d][s].done) sessions++; }));
  const weights = Object.keys(st.weight).filter(d => !st.weight[d].del).length;
  Object.keys(st.blog || {}).forEach(d => Object.keys(st.blog[d]).forEach(k => { if (st.blog[d][k].done) sessions++; }));
  return { sessions, weights, days: PL.doneDays(st).length };
}

const API = { KEY, DATE, canon, sanitize, merge, clone, isObj, backup, backupName, readBackup, counts, lossOf };
G.STORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
