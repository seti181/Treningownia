/* Stan aplikacji: walidacja (sanitize), scalanie dwóch kopii (merge), porównanie (canon), kopia zapasowa. Czyste funkcje, bez DOM. */
(function (G) {
'use strict';
const PL = G.PLAN;
const KEY = 'treningownia-v1';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SID = /^[a-z]{2,12}$/;
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const clone = o => JSON.parse(JSON.stringify(o));

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
    return mergeWeight(clone(win), win === a ? b : a);
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
  return mergeWeight(out, other);
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
function counts(st) {
  let sessions = 0;
  Object.keys(st.log).forEach(d => Object.keys(st.log[d]).forEach(s => { if (st.log[d][s].done) sessions++; }));
  const weights = Object.keys(st.weight).filter(d => !st.weight[d].del).length;
  return { sessions, weights, days: PL.doneDays(st).length };
}

const API = { KEY, DATE, canon, sanitize, merge, clone, isObj, backup, backupName, readBackup, counts };
G.STORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
