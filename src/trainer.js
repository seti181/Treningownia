/* Trener: zakładki i podstrony, sesja dnia z zegarem, postęp i punkty, waga, ustawienia, zapis na urządzeniu i synchronizacja z kontem. */
(function () {
'use strict';
const A = window.ATLAS, PL = window.PLAN, V = window.VIEWS, S = window.STORE;
const pl = document.getElementById('player');
// Panele budowane z widoków (Atlas to gotowa treść z budowania).
const panels = {};
['dzis', 'tydzien', 'dziennik', 'postep', 'wiecej', 'waga', 'plan', 'ustawienia'].forEach(k => { panels[k] = document.getElementById(k + '-in'); });
const hdr = document.getElementById('hdr-prog');
if (!A || !PL || !V || !S || !pl || !panels.dzis) return;

const byId = {};
A.EX.forEach(e => { byId[e.id] = e; });
const KEY = S.KEY, SKEY = 'treningownia-dzwiek';
const OFF = +window.__TRAINER_OFFSET || 0; // tylko do testów: przesunięcie zegara
const now = () => Date.now() + OFF;
const today = () => PL.ymd(new Date(now()));
const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => (n < 10 ? '0' : '') + n;
let reduce = false;
try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* brak */ }

// ================= stan i zapis =================
const DATE = S.DATE;
const canon = S.canon;
let ls = null;
try { ls = window.localStorage; } catch (e) { ls = null; }
function loadLocal() {
  try { const raw = ls && ls.getItem(KEY); if (raw) return S.sanitize(JSON.parse(raw), today()); } catch (e) { /* brak */ }
  return PL.defaults(today());
}
function saveLocal() { try { if (ls) ls.setItem(KEY, JSON.stringify(state)); } catch (e) { /* brak */ } }

let state = loadLocal();
let prog = PL.progress(state, today());
const SYNC = {
  local: 'Dane zapisują się na tym urządzeniu.',
  out: 'Dane zapisują się na tym urządzeniu. Zaloguj się w Ustawieniach, żeby miały kopię na koncie.',
  busy: 'Łączę się z kontem…',
  ok: 'Zsynchronizowane z kontem.',
  offline: 'Bez sieci: dane są na tym urządzeniu i wyślą się, gdy wróci połączenie.',
  error: 'Synchronizacja się nie udała. Dane są na tym urządzeniu, spróbuję ponownie.',
  denied: 'Konto nie ma dostępu do bazy. Sprawdź reguły Firestore w konsoli Firebase.',
  auth: 'Sesja na koncie wygasła. Zaloguj się ponownie w Ustawieniach.'
};
const CFG = (window.CONFIG && window.CONFIG.firebase) || {};
const cloud = window.CLOUD ? window.CLOUD.create({ apiKey: CFG.apiKey, projectId: CFG.projectId, storage: ls }) : null;
const cloudOn = !!(cloud && cloud.configured);
let syncMode = !cloudOn ? 'local' : cloud.account() ? 'busy' : 'out';
let syncing = false, syncAgain = false, syncTimer = 0, lastSync = 0;
function setSync(m) {
  const was = syncMode;
  syncMode = m;
  document.querySelectorAll('.sync').forEach(p => { p.textContent = SYNC[m]; });
  // wylogowanie (także wygaśnięcie sesji) zmienia zawartość Ustawień i Więcej
  if (m !== was && (m === 'auth' || m === 'out' || was === 'auth')) {
    stale.ustawienia = stale.wiecej = true;
    if ((tab === 'ustawienia' || tab === 'wiecej') && !P.open && !typing()) renderPanel(tab);
  }
}
// Prośba, żeby przeglądarka nie czyściła danych przy braku miejsca (raz, po pierwszym zapisie; zainstalowana aplikacja zwykle dostaje zgodę od razu).
let persistAsked = false;
function persist() {
  if (persistAsked) return;
  persistAsked = true;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { /* brak */ }); } catch (e) { /* brak */ }
}
function commit() {
  state.updated = now();
  saveLocal();
  persist();
  syncSoon();
  renderAll();
}
// Dane z chmury zmieniły stan: przerysuj, chyba że właśnie trwa trening albo ktoś pisze w polu.
function refresh() { if (P.open) return; if (typing()) pendingRender = true; else renderAll(); }
function syncSoon(ms) {
  if (!cloudOn || !cloud.account()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, ms == null ? 1500 : ms);
}
// Odczyt z chmury, scalenie, zapis scalonego stanu z warunkiem na wersję. Konflikt (inne urządzenie zapisało w międzyczasie)
// = jeszcze raz od odczytu. Nic się nie zapisuje, gdy chmura ma już ten sam stan.
async function syncNow() {
  clearTimeout(syncTimer); syncTimer = 0;
  if (!cloudOn || !cloud.account()) return;
  if (syncing) { syncAgain = true; return; }
  if (navigator.onLine === false) { setSync('offline'); return; }
  syncing = true;
  try {
    for (let tries = 0; tries < 4; tries++) {
      const r = await cloud.get();
      let remote = null;
      if (r.exists && r.json) { try { remote = S.sanitize(JSON.parse(r.json), today()); } catch (e) { remote = null; } }
      const before = canon(state);
      const merged = remote ? S.merge(state, remote) : state;
      if (canon(merged) !== before) { state = merged; saveLocal(); refresh(); }
      if (remote ? canon(state) === canon(remote) : !(state.updated > 0)) break;
      try { await cloud.put(JSON.stringify(state), state.updated, r.exists ? r.updateTime : null); break; }
      catch (e) { if (e.code !== 'conflict' || tries === 3) throw e; }
    }
    lastSync = Date.now();
    setSync('ok');
  } catch (e) {
    setSync(e.code === 'auth' ? 'auth' : e.code === 'denied' ? 'denied' : e.code === 'network' ? 'offline' : 'error');
  }
  syncing = false;
  if (syncAgain) { syncAgain = false; syncSoon(300); }
}
async function doLogin(email, password) {
  if (!email || !password) { ui.lErr = 'empty'; ui.lEmail = email; renderPanel('ustawienia'); focusIn(email ? '#l-pass' : '#l-email'); return; }
  Object.assign(ui, { lBusy: true, lErr: '', lEmail: email });
  renderPanel('ustawienia');
  try {
    await cloud.signIn(email, password);
    Object.assign(ui, { lBusy: false, lErr: '' });
    setSync('busy');
    stale.wiecej = true;
    renderPanel('ustawienia');
    toast('Zalogowano');
    focusIn('[data-act="sync-now"]');
    await syncNow();
  } catch (e) {
    Object.assign(ui, { lBusy: false, lErr: ['network', 'many', 'disabled', 'login'].indexOf(e.code) >= 0 ? e.code : 'other' });
    renderPanel('ustawienia');
    focusIn('#l-pass');
  }
}

// ================= zakładki i widoki =================
// Pasek zakładek; podstrony z Więcej podświetlają zakładkę Więcej.
const TABS = ['dzis', 'tydzien', 'dziennik', 'postep', 'wiecej'];
const SUB = { waga: 'wiecej', atlas: 'wiecej', plan: 'wiecej', ustawienia: 'wiecej' };
const PAGES = TABS.concat(Object.keys(SUB));
let tab = 'dzis', shownDay = today();
const stale = { dzis: true, tydzien: true, dziennik: true, postep: true, wiecej: true, waga: true, plan: true, ustawienia: true };
// Szkice formularzy trzymane poza DOM: panel może się przerysować w trakcie pisania (zapis, dane z innego urządzenia).
const ui = {
  rsWhen: 'today', rsDate: '', rsWipe: false, confirm: false, stPhase: 0, stDay: 0, stRung: 0, sound: 'voice', hasVoice: false,
  wToday: '', wEdit: false, wErr: '', wRange: 30, wAll: false, wDel: '', wDate: '', wKg: '', wGoal: null,
  jAll: false, lEmail: '', lErr: '', lBusy: false, bk: null, bkErr: ''
};
function renderPanel(name) {
  const box = panels[name];
  if (!box) return;
  const ae = document.activeElement;
  let sel = null, caret = null;
  if (ae && box.contains(ae)) {
    if (ae.id) sel = '#' + ae.id;
    else if (ae.dataset && ae.dataset.act) {
      sel = '[data-act="' + ae.dataset.act + '"]';
      ['i', 'v', 's', 'd'].forEach(k => { if (ae.dataset[k] != null) sel += '[data-' + k + '="' + ae.dataset[k] + '"]'; });
    } else if (ae.name) sel = '[name="' + ae.name + '"][value="' + ae.value + '"]';
    if (ae.tagName === 'INPUT' && ae.type === 'text') { try { caret = [ae.selectionStart, ae.selectionEnd]; } catch (e) { caret = null; } }
  }
  const t = shownDay, sync = SYNC[syncMode];
  ui.acct = cloudOn ? cloud.account() : null;
  if (name === 'dzis') box.innerHTML = V.todayHTML(state, t, sync, now(), prog, ui);
  else if (name === 'tydzien') box.innerHTML = V.weekHTML(state, t);
  else if (name === 'dziennik') box.innerHTML = V.journalHTML(state, t, prog, ui);
  else if (name === 'postep') box.innerHTML = V.progressHTML(state, t, prog);
  else if (name === 'wiecej') box.innerHTML = V.moreHTML(state, t, ui);
  else if (name === 'waga') { box.innerHTML = V.weightHTML(state, t, ui, sync); mountChart(); }
  else if (name === 'plan') box.innerHTML = V.planHTML(state, t, prog, ui, sync);
  else if (name === 'ustawienia') {
    Object.assign(ui, { sound: effMode(), hasVoice: !!plVoice, cloudOn, standalone: standalone(), canShare: canShareFiles() });
    box.innerHTML = V.settingsHTML(state, t, ui, sync);
  }
  stale[name] = false;
  if (sel) {
    const el2 = box.querySelector(sel);
    if (el2 && !el2.disabled) {
      el2.focus({ preventScroll: true });
      if (caret && el2.type === 'text') { try { el2.setSelectionRange(caret[0], caret[1]); } catch (e) { /* brak */ } }
    }
  }
}
function focusIn(q, select) {
  const n = panels[tab] && panels[tab].querySelector(q);
  if (!n) return;
  n.focus({ preventScroll: true });
  if (select && n.select) { try { n.select(); } catch (e) { /* brak */ } }
}
function renderAll() {
  shownDay = today();
  prog = PL.progress(state, shownDay);
  if (hdr) hdr.innerHTML = V.headChip(prog);
  Object.keys(stale).forEach(k => { stale[k] = true; });
  if (stale[tab] !== undefined) renderPanel(tab);
}
function showTab(name, opts) {
  if (PAGES.indexOf(name) < 0) name = 'dzis';
  tab = name;
  const top = SUB[name] || name;
  TABS.forEach(t => {
    const b = $('tb-' + t);
    if (b) { b.setAttribute('aria-selected', t === top ? 'true' : 'false'); b.tabIndex = t === top ? 0 : -1; }
  });
  PAGES.forEach(t => { const p = $('tab-' + t); if (p) p.hidden = t !== name; });
  if (stale[name]) renderPanel(name);
  else if (name === 'waga') fitChart();
  if (!opts || opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
  if (opts && opts.focus) { const b = $('tb-' + name); if (b) b.focus(); }
  try { history.replaceState(null, '', name === 'dzis' ? location.pathname + location.search : '#' + name); } catch (e) { /* brak */ }
}
function scrollToEl(id) {
  const n = $(id);
  if (n) setTimeout(() => n.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 30);
}
let toastTimer = 0;
function toast(text) {
  const t = $('toast');
  if (!t) return;
  t.textContent = text;
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 300); }, 2800);
}
function newBadges(before, after) { return after.badges.filter((b, i) => b.d && !before.badges[i].d); }
function withGain(fn, label) {
  const before = PL.progress(state, today());
  fn();
  commit();
  const gain = prog.total - before.total;
  const nb = newBadges(before, prog);
  let msg = label || '';
  if (gain > 0) msg += (msg ? ' · ' : '') + '+' + gain + ' pkt';
  if (prog.grade.i > before.grade.i) msg += ' · nowy poziom ' + prog.grade.name;
  if (nb.length) msg += ' · odznaka: ' + nb.map(b => b.name).join(', ');
  if (msg) toast(msg);
}

// ---------- wykres wagi ----------
// Rysowany dla zmierzonej szerokości; palec, mysz albo strzałki wskazują pomiar, a odczyt nad wykresem pokazuje jego wartości.
let wc = null;
function mountChart() {
  wc = null;
  const box = panels.waga && panels.waga.querySelector('#wchart');
  if (!box) return;
  const w = Math.round(box.clientWidth) || 326;
  const m = V.weightChart(state, shownDay, ui.wRange, w);
  if (!m) return;
  box.innerHTML = m.svg;
  wc = { box, m, w, i: -1, read: panels.waga.querySelector('#wc-read') };
  box.addEventListener('pointerdown', chartPoint);
  box.addEventListener('pointermove', chartPoint);
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') chartShow(-1); });
  box.addEventListener('blur', () => chartShow(-1));
  box.addEventListener('keydown', e => {
    if (!wc) return;
    const n = wc.m.pts.length, cur = wc.i < 0 ? n - 1 : wc.i;
    let j = -2;
    if (e.key === 'ArrowLeft') j = Math.max(0, wc.i < 0 ? n - 1 : cur - 1);
    else if (e.key === 'ArrowRight') j = Math.min(n - 1, cur + 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    else if (e.key === 'Escape') j = -1;
    if (j > -2) { e.preventDefault(); chartShow(j); }
  });
}
function fitChart() {
  if (wc && document.contains(wc.box) && Math.abs(Math.round(wc.box.clientWidth) - wc.w) > 1 && wc.box.clientWidth > 0) mountChart();
}
function chartPoint(e) {
  if (!wc) return;
  const svg = wc.box.firstElementChild;
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const vx = (e.clientX - r.left) / (r.width || 1) * wc.m.W;
  let best = 0, bd = Infinity;
  wc.m.pts.forEach((p, i) => { const dd = Math.abs(p.x - vx); if (dd < bd) { bd = dd; best = i; } });
  chartShow(best);
}
function chartShow(i) {
  if (!wc || i === wc.i) return;
  wc.i = i;
  const g = wc.box.querySelector('.wc-hover');
  const pts = wc.m.pts, p = pts[i < 0 ? pts.length - 1 : i];
  if (g) {
    if (i < 0) g.style.display = 'none';
    else {
      const x = (Math.round(p.x) + 0.5).toFixed(1);
      const ln = g.querySelector('.wc-cross'), hd = g.querySelector('.wc-hd'), ha = g.querySelector('.wc-ha');
      ln.setAttribute('x1', x); ln.setAttribute('x2', x);
      hd.setAttribute('cx', p.x.toFixed(1)); hd.setAttribute('cy', p.yd.toFixed(1));
      ha.setAttribute('cx', p.x.toFixed(1)); ha.setAttribute('cy', p.ya.toFixed(1));
      g.style.display = '';
    }
  }
  if (wc.read) {
    const ro = V.weightReadout(p, shownDay);
    const put = (q, text) => { const n = wc.read.querySelector(q); if (n) n.textContent = text; };
    put('.wc-when', ro.when); put('.wc-rd', ro.kg); put('.wc-ra', ro.avg);
  }
}
// Po dotyku wskazany punkt zostaje do następnego dotknięcia poza wykresem.
document.addEventListener('pointerdown', e => { if (wc && wc.i >= 0 && !wc.box.contains(e.target)) chartShow(-1); });
let fitTimer = 0;
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { if (tab === 'waga' && !P.open) fitChart(); }, 150); });

// ---------- kliknięcia w zakładkach ----------
document.addEventListener('click', e => {
  const tb = e.target.closest('[role="tab"][data-tab]');
  if (tb) { showTab(tb.dataset.tab); return; }
  const ex = e.target.closest('[data-ex]');
  if (ex) { startSingle(ex.dataset.ex, ex); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || pl.contains(b)) return;
  const act = b.dataset.act, t = today();
  switch (act) {
    case 'start': startSession(b.dataset.s, b); break;
    case 'tab': showTab(b.dataset.v); break;
    case 'morning': withGain(() => { state.morning[t] = b.dataset.v; }, 'Poranna ocena zapisana'); break;
    case 'snooze': state.snooze = PL.addDays(t, 7); commit(); toast('Zostajesz w tej fazie jeszcze tydzień'); break;
    case 'open-gates': showTab('postep', { scroll: false }); scrollToEl('gates-h'); break;
    case 'advance': withGain(() => PL.actAdvance(state, t), PL.PHASES[Math.min(5, state.phase + 1)].name); showTab('dzis'); break;
    case 'back': PL.actBack(state, t); commit(); toast('Wracasz do: ' + PL.PHASES[state.phase].name); showTab('dzis'); break;
    case 'break-continue': state.breakAck = t; commit(); toast('Kontynuujesz od dnia ' + (PL.phaseDay(state, t) + 1)); break;
    case 'go-restart': ui.rsWhen = 'today'; ui.confirm = false; stale.plan = true; showTab('plan', { scroll: false }); scrollToEl('restart'); break;
    case 'restart-ask': ui.confirm = true; renderPanel('plan'); { const c = panels.plan.querySelector('[data-act="restart-do"]'); if (c) c.focus(); } break;
    case 'restart-cancel': ui.confirm = false; renderPanel('plan'); break;
    case 'restart-do': {
      const d = ui.rsWhen === 'today' ? t : ui.rsWhen === 'tomorrow' ? PL.addDays(t, 1) : (DATE.test(ui.rsDate) && ui.rsDate >= t ? ui.rsDate : PL.addDays(t, 1));
      const wipe = ui.rsWipe;
      PL.actRestart(state, d, wipe, now());
      Object.assign(ui, { confirm: false, rsWipe: false, rsWhen: 'today', stPhase: 0, stDay: 0, stRung: 0 });
      commit();
      showTab('dzis');
      toast(d === t ? 'Zaczynasz od nowa: Faza 1, dzień 1' : 'Faza 1 zacznie się ' + PL.longDate(d));
      break;
    }
    case 'stage-set': {
      const ph = ui.stPhase || state.phase;
      const len = PL.PHASES[ph].len;
      const day = len ? Math.max(1, Math.min(len + 14, ui.stDay || (ph === state.phase ? PL.phaseDay(state, t) + 1 : 1))) : 1;
      PL.actSetStage(state, ph, day, t, ph === 4 ? (ui.stRung || state.rung) : 0);
      Object.assign(ui, { stPhase: 0, stDay: 0, stRung: 0 });
      commit();
      toast('Ustawione: ' + PL.PHASES[ph].name + (len ? ', dzień ' + day : ''));
      break;
    }
    case 'w-edit': {
      const cur = state.weight[t];
      Object.assign(ui, { wEdit: true, wErr: '', wToday: cur && typeof cur.kg === 'number' ? V.kg1(cur.kg) : '' });
      stale.dzis = stale.waga = true;
      renderPanel(tab);
      focusIn('.wq-i', true);
      break;
    }
    case 'w-cancel': cancelEdit(); break;
    case 'w-range': Object.assign(ui, { wRange: +b.dataset.v || 0, wAll: false, wDel: '' }); renderPanel('waga'); break;
    case 'w-all': ui.wAll = !ui.wAll; renderPanel('waga'); break;
    case 'w-del': ui.wDel = b.dataset.d; renderPanel('waga'); focusIn('[data-act="w-del-no"]'); break;
    case 'w-del-no': { const d = b.dataset.d; ui.wDel = ''; renderPanel('waga'); focusIn('[data-act="w-del"][data-d="' + d + '"]'); break; }
    case 'w-del-yes': {
      const d = b.dataset.d;
      if (!DATE.test(d) || !state.weight[d]) break;
      PL.delWeight(state, d, now());
      ui.wDel = '';
      if (d === t) Object.assign(ui, { wEdit: false, wToday: '' });
      commit();
      toast('Usunięto pomiar: ' + V.relDay(d, t));
      break;
    }
    case 'w-goal-clear': PL.setGoal(state, null, now()); Object.assign(ui, { wGoal: null, wErr: '' }); commit(); toast('Cel usunięty'); focusIn('#w-goal-kg'); break;
    case 'w-submit': { const f = b.closest('form[data-form]'); if (f) submitForm(f); break; }
    case 'j-all': ui.jAll = !ui.jAll; renderPanel('dziennik'); focusIn('[data-act="j-all"]'); break;
    case 'login': { const f = b.closest('form[data-form]'); if (f) submitForm(f); break; }
    case 'logout': cloud.signOut(); setSync('out'); stale.wiecej = true; renderPanel('ustawienia'); toast('Wylogowano. Dane zostają na tym urządzeniu.'); focusIn('#l-email'); break;
    case 'sync-now': syncNow().then(() => toast(SYNC[syncMode])); break;
    case 'bk-save': saveBackup(false); break;
    case 'bk-share': saveBackup(true); break;
    case 'bk-pick': { const f = $('bk-file'); if (f) { f.value = ''; f.click(); } break; }
    case 'bk-cancel': Object.assign(ui, { bk: null, bkErr: '' }); renderPanel('ustawienia'); focusIn('[data-act="bk-pick"]'); break;
    case 'bk-apply': {
      if (!ui.bk) break;
      const c = ui.bk.counts;
      state = S.merge(state, ui.bk.state);
      Object.assign(ui, { bk: null, bkErr: '' });
      commit();
      toast('Kopia wczytana: ' + c.sessions + ' sesji, ' + c.weights + ' pomiarów wagi');
      focusIn('[data-act="bk-pick"]');
      break;
    }
  }
});
// ---------- kopia zapasowa ----------
const canShareFiles = () => { try { return typeof File === 'function' && !!navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'k.json', { type: 'application/json' })] }); } catch (e) { return false; } };
const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
function saveBackup(share) {
  const name = S.backupName(today());
  const text = JSON.stringify(S.backup(state, now()), null, 1);
  const blob = new Blob([text], { type: 'application/json' });
  if (share && canShareFiles()) {
    navigator.share({ files: [new File([blob], name, { type: 'application/json' })], title: name }).catch(() => { /* anulowane */ });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Kopia zapisana: ' + name);
}
function readBackupFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const res = S.readBackup(String(r.result || ''), today());
    Object.assign(ui, res.error ? { bk: null, bkErr: res.error } : { bk: res, bkErr: '' });
    renderPanel('ustawienia');
    focusIn(res.error ? '[data-act="bk-pick"]' : '[data-act="bk-apply"]');
  };
  r.onerror = () => { Object.assign(ui, { bk: null, bkErr: 'Nie udało się odczytać pliku.' }); renderPanel('ustawienia'); };
  r.readAsText(file);
}
// ---------- formularze wagi ----------
// Zapis działa trzema drogami: kliknięcie przycisku, Enter w polu i zdarzenie submit (np. klawisz „Gotowe” klawiatury ekranowej).
// Pierwsze dwie nie zależą od wysyłania formularzy, które osadzona ramka może blokować.
function submitForm(f) {
  const t = today();
  const val = name => { const n = f.elements && f.elements[name]; return n ? n.value : ''; };
  const fail = (code, q) => { ui.wErr = code; stale.dzis = stale.waga = true; renderPanel(tab); focusIn(q, true); };
  if (f.dataset.form === 'weight-today') {
    const kg = PL.parseKg(val('kg'));
    if (kg == null) { ui.wToday = val('kg'); fail('today', '.wq-i'); return; }
    PL.setWeight(state, t, kg, now());
    Object.assign(ui, { wToday: '', wEdit: false, wErr: '' });
    commit();
    focusIn('[data-act="w-edit"]');
    toast('Waga zapisana: ' + V.kg1(kg) + ' kg');
  } else if (f.dataset.form === 'weight-add') {
    const d = val('d'), kg = PL.parseKg(val('kg'));
    ui.wKg = val('kg');
    if (!DATE.test(d) || d > t || d < '2000-01-01') { fail('add-date', '#w-add-date'); return; }
    ui.wDate = d;
    if (kg == null) { fail('add-kg', '#w-add-kg'); return; }
    PL.setWeight(state, d, kg, now());
    Object.assign(ui, { wKg: '', wErr: '', wDel: '' });
    if (d === t) Object.assign(ui, { wEdit: false, wToday: '' });
    commit();
    toast('Pomiar zapisany: ' + V.relDay(d, t) + ', ' + V.kg1(kg) + ' kg');
  } else if (f.dataset.form === 'login') {
    if (ui.lBusy) return;
    doLogin(val('email').trim(), val('password'));
  } else if (f.dataset.form === 'weight-goal') {
    const kg = PL.parseKg(val('kg'));
    if (kg == null) { ui.wGoal = val('kg'); fail('goal', '#w-goal-kg'); return; }
    PL.setGoal(state, kg, now());
    Object.assign(ui, { wGoal: null, wErr: '' });
    commit();
    toast('Cel zapisany: ' + V.kg1(kg) + ' kg');
  }
}
document.addEventListener('submit', e => {
  const f = e.target;
  if (!f || !f.dataset || !f.dataset.form || pl.contains(f)) return;
  e.preventDefault();
  submitForm(f);
});
function cancelEdit() {
  Object.assign(ui, { wEdit: false, wErr: '', wToday: '' });
  stale.dzis = stale.waga = true;
  renderPanel(tab);
  focusIn('[data-act="w-edit"]');
}
document.addEventListener('keydown', e => {
  if (P.open || e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
  const n = e.target;
  const f = n && n.tagName === 'INPUT' && n.closest ? n.closest('form[data-form]') : null;
  if (!f) return;
  if (e.key === 'Enter') { e.preventDefault(); submitForm(f); }
  else if (f.dataset.form === 'weight-today' && ui.wEdit && state.weight[today()] && !state.weight[today()].del) { e.preventDefault(); cancelEdit(); }
});
document.addEventListener('change', e => {
  const n = e.target;
  if (pl.contains(n)) return;
  if (n.dataset && n.dataset.act === 'gate') {
    const ph = state.phase, len = (PL.GATES[ph] || []).length, g = state.gates[ph] || [];
    state.gates[ph] = Array.from({ length: len }, (x, j) => (j === +n.dataset.i ? n.checked : !!g[j]));
    commit();
  } else if (n.name === 'rs-when') {
    ui.rsWhen = n.value;
    const d = $('rs-date');
    if (d) d.hidden = n.value !== 'date';
    if (ui.confirm) renderPanel('plan');
    if (n.value === 'date' && d) d.focus();
  } else if (n.id === 'rs-date') { ui.rsDate = n.value; if (ui.confirm) renderPanel('plan'); }
  else if (n.id === 'rs-wipe') { ui.rsWipe = n.checked; if (ui.confirm) renderPanel('plan'); }
  else if (n.id === 'st-phase') { ui.stPhase = +n.value; ui.stDay = 1; ui.stRung = 0; renderPanel('plan'); }
  else if (n.id === 'st-rung') ui.stRung = +n.value;
  else if (n.name === 'snd') setMode(n.value);
  else if (n.id === 'w-add-date') { ui.wDate = n.value; paintAddHint(); }
  else if (n.id === 'bk-file') readBackupFile(n.files && n.files[0]);
});
document.addEventListener('input', e => {
  const n = e.target;
  if (n.id === 'st-day') ui.stDay = Math.max(1, Math.min(60, parseInt(n.value, 10) || 1));
  else if (n.id === 'rs-date') ui.rsDate = n.value;
  else if (n.classList && n.classList.contains('wq-i')) { ui.wToday = n.value; clearErr(n, 'today'); stale[tab === 'waga' ? 'dzis' : 'waga'] = true; }
  else if (n.id === 'w-add-kg') { ui.wKg = n.value; clearErr(n, 'add-kg'); }
  else if (n.id === 'w-add-date') { ui.wDate = n.value; paintAddHint(); }
  else if (n.id === 'w-goal-kg') { ui.wGoal = n.value; clearErr(n, 'goal'); }
  else if (n.id === 'l-email') ui.lEmail = n.value;
});
// Błąd znika przy pierwszym znaku, bez przerysowania panelu (pole nie traci klawiatury ekranowej).
function clearErr(n, code) {
  if (ui.wErr !== code) return;
  ui.wErr = '';
  n.removeAttribute('aria-invalid');
  const h = $(n.getAttribute('aria-describedby') || '');
  if (h) { h.classList.remove('is-err'); h.removeAttribute('role'); }
}
function paintAddHint() {
  const h = $('w-add-h'), dn = $('w-add-date');
  if (!h || !dn) return;
  if (ui.wErr === 'add-date') ui.wErr = '';
  dn.removeAttribute('aria-invalid');
  const e = state.weight[dn.value];
  h.classList.remove('is-err'); h.removeAttribute('role');
  h.textContent = e && !e.del && typeof e.kg === 'number' ? 'Ten dzień ma już pomiar: ' + V.kg1(e.kg) + ' kg. Zapis go zastąpi.' : '';
}
// Panel nie przerysowuje się sam (zegar, dane z innego urządzenia), gdy ktoś właśnie pisze w jego polu.
let pendingRender = false;
function typing() {
  const ae = document.activeElement;
  return !!ae && ae.tagName === 'INPUT' && /^(text|date|number|email|password)$/.test(ae.type) && !!panels[tab] && panels[tab].contains(ae);
}
document.addEventListener('focusout', () => {
  if (pendingRender) setTimeout(() => { if (pendingRender && !typing() && !P.open) { pendingRender = false; renderAll(); } }, 0);
});
const tablist = document.querySelector('[role="tablist"]');
if (tablist) tablist.addEventListener('keydown', e => {
  const i = TABS.indexOf(SUB[tab] || tab);
  let j = -1;
  if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
  else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length;
  else if (e.key === 'Home') j = 0;
  else if (e.key === 'End') j = TABS.length - 1;
  if (j >= 0) { e.preventDefault(); showTab(TABS[j], { focus: true }); }
});

// ================= dźwięk, głos, wibracje, blokada ekranu =================
let ac = null, plVoice = null;
let mode = 'voice';
try { const m = localStorage.getItem(SKEY); if (m === 'voice' || m === 'beep' || m === 'off') mode = m; } catch (e) { /* brak */ }
const hasSpeech = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
function pickVoice() {
  if (!hasSpeech) return;
  try {
    const vs = window.speechSynthesis.getVoices() || [];
    plVoice = vs.find(v => /^pl([-_]|$)/i.test(v.lang) && v.localService) || vs.find(v => /^pl([-_]|$)/i.test(v.lang)) || null;
  } catch (e) { plVoice = null; }
  paintSound();
  if (ui.hasVoice !== !!plVoice) { ui.hasVoice = !!plVoice; stale.ustawienia = true; if (tab === 'ustawienia' && !P.open && !typing()) renderPanel('ustawienia'); }
}
function setMode(m) {
  if (['voice', 'beep', 'off'].indexOf(m) < 0) return;
  mode = m;
  try { localStorage.setItem(SKEY, mode); } catch (er) { /* brak */ }
  paintSound();
  stale.ustawienia = true;
}
const effMode = () => (mode === 'voice' && !plVoice ? 'beep' : mode);
function audioInit() {
  try {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === 'suspended') ac.resume();
  } catch (e) { ac = null; }
}
function tone(f, d, at, g) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  gn.gain.setValueAtTime(0.0001, at);
  gn.gain.exponentialRampToValueAtTime(g, at + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(gn); gn.connect(ac.destination);
  o.start(at); o.stop(at + d + 0.03);
}
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* brak */ } }
function beep(kind) {
  if (kind === 'go') buzz(260); else if (kind === 'stop') buzz([90, 70, 90]); else if (kind === 'done') buzz([120, 80, 120, 80, 220]);
  if (effMode() === 'off' || !ac) return;
  try {
    const t = ac.currentTime + 0.01;
    if (kind === 'tick') tone(880, 0.1, t, 0.28);
    else if (kind === 'go') tone(1320, 0.4, t, 0.34);
    else if (kind === 'stop') { tone(700, 0.13, t, 0.3); tone(700, 0.13, t + 0.19, 0.3); }
    else if (kind === 'next') tone(990, 0.15, t, 0.26);
    else if (kind === 'done') { tone(660, 0.16, t, 0.3); tone(880, 0.16, t + 0.18, 0.3); tone(1320, 0.45, t + 0.36, 0.32); }
  } catch (e) { /* brak */ }
}
function speak(text) {
  if (effMode() !== 'voice' || !plVoice) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.voice = plVoice; u.lang = plVoice.lang; u.rate = 1.05;
    s.speak(u);
  } catch (e) { /* brak */ }
}
function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}
function doseWords(b) {
  if (b.kind === 'time') { const m = Math.round(b.dur / 60); return m + ' ' + plural(m, 'minuta', 'minuty', 'minut'); }
  const sets = b.sets + ' ' + plural(b.sets, 'seria', 'serie', 'serii');
  if (b.kind === 'hold') return sets + ' po ' + b.hold + ' ' + plural(b.hold, 'sekundzie', 'sekundy', 'sekund');
  const r = b.reps.replace('–', ' do ');
  return sets + ' po ' + (/m/.test(b.reps) ? r.replace(/(\d+) m\b/, '$1 metrów') : r + ' powtórzeń');
}
let wake = null, wakeOk = null;
async function lockScreen() {
  if (wake) return;
  try {
    if (!('wakeLock' in navigator)) { wakeOk = false; return; }
    wake = await navigator.wakeLock.request('screen');
    wakeOk = true;
    wake.addEventListener('release', () => { wake = null; });
  } catch (e) { wakeOk = false; wake = null; }
  paintHint();
}
function unlockScreen() { try { if (wake) wake.release(); } catch (e) { /* brak */ } wake = null; }

// ================= odtwarzacz =================
const el = {
  body: $('pl-body'), svg: $('pl-svg'), set: $('pl-set'), paused: $('pl-paused'), view: $('pl-view'),
  ex: $('pl-ex'), left: $('pl-left'), bar: $('pl-bar'), state: $('pl-state'), up: $('pl-upnext'), time: $('pl-time'), unit: $('pl-unit'),
  sub: $('pl-sub'), track: $('pl-track'), name: $('pl-name'), note: $('pl-note'), cues: $('pl-cues'), main: $('pl-main'),
  more: $('pl-more'), skipex: $('pl-skipex'), nx: $('pl-nx'), nxSvg: $('pl-nx-svg'), nxName: $('pl-nx-name'), nxDose: $('pl-nx-dose'),
  hint: $('pl-hint'), live: $('pl-live'), sound: $('pl-sound'), soundT: $('pl-sound-t'),
  done: $('pl-done'), dnEyebrow: $('dn-eyebrow'), dnTitle: $('dn-title'), dnMsg: $('dn-msg'), dnMsgT: $('dn-msg-t'), dnNote: $('dn-note'), dnSaved: $('dn-saved'),
  sheet: $('pl-sheet'), shD: $('sh-d')
};
const LBL = { prep: 'Przygotuj się', hold: 'Trzymaj', time: 'Ćwicz', reps: 'Ćwicz', rest: 'Przerwa' };
const P = { open: false };

function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
function fmtLen(sec) {
  if (sec < 60) return sec + ' s';
  return sec % 60 ? Math.floor(sec / 60) + ' min ' + (sec % 60) + ' s' : sec / 60 + ' min';
}
function estOf(s) { return s.k === 'done' ? 0 : s.dur != null ? s.dur : PL.repSec(s.b); }
function elapsed() { return ((P.paused ? P.pausedAt : Date.now()) - P.t0) / 1000; }
function setInert(v) {
  ['header.app-head', 'nav.tabs', 'main', 'footer'].forEach(q => { const n = document.querySelector(q); if (n) n.inert = v; });
}

function startSession(sid, btn) {
  const t = today(), dp = PL.dayPlan(t, state);
  const s = dp.sessions.find(x => x.id === sid);
  if (!s) return;
  audioInit();
  openPlayer(s, t, dp.practice, btn);
}
function startSingle(exId, btn) {
  const s = PL.singleSession(exId);
  if (!s) return;
  audioInit();
  openPlayer(s, today(), true, btn);
}
function openPlayer(session, date, practice, btn) {
  Object.assign(P, {
    open: true, finished: false, session, date, practice, single: !!session.single, steps: PL.steps(session), i: 0,
    paused: false, pausedAt: 0, autoPaused: false, t0: Date.now(), startedAt: Date.now(),
    ex: null, bi: -1, animT: 0, last: 0, beeped: {}, pain: null, partial: false, returnFocus: btn || null,
    base: { rung: state.rung, rungGreen: state.rungGreen }, key: date + '|' + session.id,
    redo: !practice && PL.isDone(state, date, session.id), before: PL.progress(state, date)
  });
  P.est = P.steps.map(estOf);
  P.cum = [];
  let c = 0;
  P.est.forEach(x => { P.cum.push(c); c += x; });
  P.total = c;
  pl.style.setProperty('--c', 'var(' + PL.PHASES[state.phase].c + ')');
  el.done.hidden = true; el.sheet.hidden = true; el.body.hidden = false;
  pl.hidden = false;
  document.body.classList.add('in-player');
  setInert(true);
  lockScreen();
  enterStep(0, 0);
  paintHint();
  el.main.focus({ preventScroll: true });
  cancelAnimationFrame(P.raf);
  P.raf = requestAnimationFrame(loop);
}
function closePlayer() {
  P.open = false;
  cancelAnimationFrame(P.raf);
  pl.hidden = true;
  document.body.classList.remove('in-player');
  setInert(false);
  unlockScreen();
  try { if (hasSpeech) window.speechSynthesis.cancel(); } catch (e) { /* brak */ }
  renderAll();
  let b = P.returnFocus && document.contains(P.returnFocus) ? P.returnFocus : null;
  if (!b && !P.single) b = panels.dzis.querySelector('[data-act="start"][data-s="' + (P.session && P.session.id) + '"]');
  if (b) b.focus({ preventScroll: true });
}

function upnextText(i) {
  const n = P.steps[i + 1];
  if (!n) return '';
  if (n.k === 'done') return 'Dalej: koniec i ocena bólu';
  if (n.k === 'rest') return 'Dalej: przerwa ' + fmtLen(n.dur);
  if (n.k === 'prep') return 'Dalej: ' + byId[n.b.ex].name;
  if (n.b.kind === 'time') return 'Dalej: start, ' + fmtLen(n.dur);
  return 'Dalej: seria ' + n.set + ' z ' + n.sets + (n.b.kind === 'hold' ? ', ' + n.dur + ' s' : '');
}
function drawStage(t) { el.svg.innerHTML = A.render(P.ex, t, 'pl', { full: true }).svg; }

function enterStep(i, carry) {
  P.i = i;
  P.t0 = Date.now() - (carry || 0) * 1000;
  if (P.paused) P.pausedAt = Date.now();
  P.beeped = {};
  const s = P.steps[i];
  if (s.k === 'done') { finish(false); return; }
  const kind = s.k === 'work' ? s.b.kind : s.k;
  P.kind = kind;
  pl.dataset.kind = kind;
  const ex = byId[s.b.ex];
  if (ex !== P.ex) {
    P.ex = ex; P.animT = 0;
    el.svg.setAttribute('viewBox', A.view(ex).map(v => v.toFixed(1)).join(' '));
    el.svg.setAttribute('aria-label', 'Animacja: ' + ex.name);
    el.view.textContent = ex.view || ''; el.view.hidden = !ex.view;
  }
  if (kind === 'rest' || reduce) drawStage(A.stillTime(ex)); else drawStage(P.animT);
  if (s.bi !== P.bi) {
    P.bi = s.bi;
    el.body.scrollTop = 0;
    el.name.textContent = ex.name;
    el.ex.textContent = P.single ? 'Ćwiczenie z atlasu' : 'Ćwiczenie ' + (s.bi + 1) + ' z ' + P.session.blocks.length;
    el.cues.innerHTML = '';
    ex.cues.slice(0, 3).forEach(c => { const li = document.createElement('li'); li.textContent = c; el.cues.appendChild(li); });
    const nb = P.session.blocks[s.bi + 1];
    if (nb) {
      const ne = byId[nb.ex];
      el.nxSvg.setAttribute('viewBox', A.view(ne).map(v => v.toFixed(1)).join(' '));
      el.nxSvg.innerHTML = A.render(ne, A.stillTime(ne), 'nx', { full: true }).svg;
      el.nxName.textContent = ne.name;
      el.nxDose.textContent = PL.dose(nb) + (nb.note ? ' · ' + nb.note : '');
      el.nx.classList.remove('is-last');
    } else {
      el.nxSvg.innerHTML = '';
      el.nxName.textContent = 'To ostatnie ćwiczenie';
      el.nxDose.textContent = 'Potem krótka ocena bólu';
      el.nx.classList.add('is-last');
    }
  }
  el.state.textContent = LBL[kind];
  el.set.hidden = s.b.kind === 'time';
  el.set.textContent = s.b.kind === 'time' ? '' : 'Seria ' + (s.k === 'prep' ? 1 : s.k === 'rest' ? s.set + 1 : s.set) + ' z ' + s.b.sets;
  el.up.textContent = upnextText(i);
  let note = s.b.note || '';
  if (s.k === 'prep') note = PL.dose(s.b) + (s.b.note ? ' · ' + s.b.note : '');
  if (s.b.side && s.k !== 'rest') note += (note ? ' · ' : '') + s.b.side;
  el.note.textContent = note;
  if (kind === 'reps') {
    el.time.textContent = s.b.reps.replace(/ na rękę$/, '');
    el.unit.textContent = /m/.test(s.b.reps) ? (/na rękę/.test(s.b.reps) ? 'na rękę' : '') : 'powt.';
  } else el.unit.textContent = '';
  el.more.hidden = !(s.k === 'prep' || s.k === 'rest');
  el.more.textContent = s.k === 'prep' ? '+15 s na przygotowanie' : '+15 s przerwy';
  paintControls();
  paint();
  // dźwięk i komunikat
  let say = '';
  if (kind === 'prep') {
    beep('next');
    say = (s.bi === 0 ? 'Zaczynamy. ' : 'Następne ćwiczenie: ') + ex.name.replace(' — ', ', ') + '. ' + doseWords(s.b) + (s.b.side ? '. ' + s.b.side : '') + '.';
    speak(say);
  } else if (kind === 'hold' || kind === 'time') {
    beep('go');
    if (s.set === 1) speak(kind === 'time' ? 'Start' : 'Trzymaj');
    say = LBL[kind] + (kind === 'hold' ? ', seria ' + s.set + ' z ' + s.sets : '');
  } else if (kind === 'reps') {
    beep('go');
    say = 'Seria ' + s.set + ' z ' + s.sets + ', ' + s.b.reps.replace('–', ' do ');
    speak('Seria ' + s.set + (s.b.side && s.set === 1 ? '. ' + s.b.side : ''));
  } else if (kind === 'rest') {
    speak('Przerwa');
    say = 'Przerwa ' + s.dur + ' sekund';
  }
  el.live.textContent = say ? say.replace(' — ', ', ') : '';
}
function paintControls() {
  const reps = P.kind === 'reps';
  el.main.textContent = reps ? 'Seria zrobiona' : P.paused ? 'Wznów' : 'Pauza';
  el.main.classList.toggle('is-done-btn', reps);
  el.main.setAttribute('aria-pressed', !reps && P.paused ? 'true' : 'false');
  el.paused.hidden = !P.paused || reps;
  pl.classList.toggle('is-paused', P.paused && !reps);
}
function paint() {
  const s = P.steps[P.i];
  if (!s || s.k === 'done') return;
  const e = elapsed();
  if (s.dur != null) {
    el.time.textContent = fmt(s.dur - e);
    el.track.style.transform = 'scaleX(' + Math.min(1, Math.max(0, e / s.dur)).toFixed(4) + ')';
    el.sub.textContent = '';
  } else {
    el.track.style.transform = 'scaleX(0)';
    el.sub.textContent = 'Czas serii ' + fmt(e);
  }
  const doneSec = P.cum[P.i] + Math.min(Math.max(0, e), P.est[P.i]);
  el.bar.style.transform = 'scaleX(' + Math.min(1, doneSec / P.total).toFixed(4) + ')';
  const left = Math.max(0, P.total - doneSec);
  const mins = left < 60 ? 'mniej niż minuta' : 'ok. ' + Math.ceil(left / 60) + ' min';
  el.left.textContent = P.single ? mins : P.practice ? 'próba · ' + mins : mins + ' do końca';
}
function paintHint() {
  if (!P.open) return;
  const first = P.steps && P.i <= 1;
  el.hint.hidden = !(first && wakeOk === false);
  el.hint.textContent = 'Ekran może się wygasić w trakcie. Na czas treningu wydłuż autoblokadę w ustawieniach telefonu.';
}
function setPaused(v) {
  if (v === P.paused) return;
  if (v) { P.paused = true; P.pausedAt = Date.now(); }
  else { P.t0 += Date.now() - P.pausedAt; P.paused = false; P.pausedAt = 0; }
  paintControls();
  paint();
}
function loop(ts) {
  if (!P.open) return;
  P.raf = requestAnimationFrame(loop);
  const dt = P.last ? Math.min(0.1, (ts - P.last) / 1000) : 0;
  P.last = ts;
  if (P.finished) return;
  const s = P.steps[P.i];
  if (s.dur != null && !P.paused) {
    const rem = s.dur - elapsed();
    const c = Math.ceil(rem);
    const ticks = s.k !== 'work' || s.b.kind === 'time' || s.dur >= 15;
    if (ticks && c >= 1 && c <= 3 && !P.beeped[c] && s.dur > 4) { P.beeped[c] = 1; beep('tick'); }
    if (rem <= 0) { advance(Math.min(-rem, 15)); return; }
  }
  paint();
  if (!P.paused && P.kind !== 'rest' && !reduce) {
    P.animT += dt;
    drawStage(P.animT);
  }
  if (P.i > 1 && !el.hint.hidden) el.hint.hidden = true;
}
function advance(carry) {
  const s = P.steps[P.i], n = P.steps[P.i + 1];
  // Koniec napięcia sygnalizuje dwutonowy dźwięk; przed nowym ćwiczeniem i na końcu grają ich własne sygnały.
  if (s.k === 'work' && s.b.kind !== 'reps' && n && n.k === 'rest') beep('stop');
  enterStep(P.i + 1, carry || 0);
}
function goNext() { if (!P.finished) advance(0); }
function goBack() {
  if (P.finished) return;
  if (P.kind !== 'reps' && elapsed() > 3) enterStep(P.i, 0);
  else enterStep(Math.max(0, P.i - 1), 0);
}
function skipExercise() {
  const bi = P.steps[P.i].bi;
  let j = P.i + 1;
  while (j < P.steps.length && P.steps[j].k !== 'done' && P.steps[j].bi === bi) j++;
  enterStep(j, 0);
}
function mainAction() {
  if (P.finished) return;
  if (P.kind === 'reps') advance(0);
  else setPaused(!P.paused);
}

// ---------- koniec sesji: ocena bólu, punkty, poziom, odznaki ----------
const MSG = {
  ok: 'Zielone: tak trzymaj, następny trening według planu.',
  warn: 'Żółte: następnym razem ten sam poziom i lżej, aż wróci zielone.',
  bad: 'Czerwone: przerwij ćwiczenie, które bolało, i cofnij się o krok. Ostry ból, przeskakiwanie albo mrowienie: skonsultuj się z fizjoterapeutą.'
};
function logEntry() { return state.log[P.date] && state.log[P.date][P.session.id]; }
function finish(partial) {
  P.finished = true; P.partial = partial;
  const secs = Math.round((Date.now() - P.startedAt) / 1000);
  beep('done');
  speak(partial ? 'Koniec.' : 'Koniec treningu. Oceń ból.');
  el.live.textContent = partial ? 'Trening przerwany' : 'Sesja zrobiona';
  if (!P.practice) {
    const x = { done: true, at: now(), dur: secs, pain: null, label: P.session.label };
    if (partial) x.partial = true;
    (state.log[P.date] = state.log[P.date] || {})[P.session.id] = x;
    commit();
  }
  el.body.hidden = true; el.sheet.hidden = true; el.done.hidden = false;
  pl.dataset.kind = 'done';
  el.bar.style.transform = 'scaleX(' + (partial ? Math.min(1, (P.cum[P.i] || 0) / P.total) : 1) + ')';
  el.left.textContent = '';
  el.ex.textContent = partial ? 'Przerwane' : 'Koniec';
  el.dnEyebrow.textContent = P.session.label + ' · ' + Math.max(1, Math.round(secs / 60)) + ' min' + (P.practice && !P.single ? ' · próba' : '');
  el.dnTitle.textContent = partial ? 'Trening przerwany' : P.single ? 'Ćwiczenie skończone' : P.practice ? 'Próba skończona' : 'Sesja zrobiona';
  el.done.querySelectorAll('[data-pain]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  el.dnMsg.hidden = true;
  el.dnNote.value = '';
  $('dn-note-wrap').hidden = P.practice;
  el.dnSaved.textContent = P.single ? 'Ćwiczenia z atlasu się nie zapisują i nie dają punktów.'
    : P.practice ? 'Próba: nic się nie zapisuje. Plan zaczyna się ' + PL.longDate(state.start) + '.'
    : 'Zapisane. Jutro rano zapytam, jak bark po treningu.';
  paintGain();
  el.dnTitle.focus({ preventScroll: true });
}
function paintGain() {
  const box = $('dn-pts');
  if (!box) return;
  if (P.practice) { box.hidden = true; return; }
  box.hidden = false;
  const before = P.before, after = prog;
  const gain = Math.max(0, after.total - before.total);
  const e = logEntry();
  const lines = [];
  if (P.redo) lines.push(['Ta sesja była już dziś zaliczona, punkty liczą się raz', '']);
  else if (e) {
    const base = PL.entryPoints(P.session.id, Object.assign({}, e, { pain: null }));
    lines.push([e.partial ? 'Przerwana sesja (połowa)' : 'Sesja', '+' + base]);
    lines.push(e.pain != null ? ['Ocena bólu', '+' + PL.PAIN_PTS] : ['Oceń ból poniżej', '+' + PL.PAIN_PTS + ' do zdobycia']);
    const other = gain - base - (e.pain != null ? PL.PAIN_PTS : 0);
    if (other > 0) {
      const nb = newBadges(before, after).map(b => b.id);
      const label = nb.indexOf('powrot') >= 0 ? 'Powrót po przerwie' : PL.STREAK.some(x => x[0] === after.streak) ? after.streak + ' dni z rzędu' : 'Bonus';
      lines.push([label, '+' + other]);
    }
  }
  $('dn-gain').textContent = '+' + gain;
  $('dn-why').innerHTML = lines.map(l => `<li><span>${V.esc(l[0])}</span><b>${V.esc(l[1])}</b></li>`).join('');
  const g = after.grade;
  $('dn-level').innerHTML = (g.i > before.grade.i ? `<p class="dn-up">Nowy poziom ${V.gtag(g.name, 'lg')}</p>` : '') +
    `<div class="dn-grade">${V.gtag(g.name)}<div>${V.bar(g.pct)}<p>${V.gradeLine(g)}</p></div></div>`;
  const nb = newBadges(before, after);
  $('dn-badges').innerHTML = nb.length ? '<p class="dn-bh">Nowa odznaka</p><ul>' + nb.map(b => `<li><b>${V.esc(b.name)}</b> ${V.esc(b.desc)}</li>`).join('') + '</ul>' : '';
}
function setPain(v) {
  P.pain = v;
  el.done.querySelectorAll('[data-pain]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.pain === v ? 'true' : 'false'));
  const lv = V.painLevel(v);
  let text = MSG[lv];
  if (!P.practice) {
    const e = logEntry();
    if (e) e.pain = v;
    if (P.session.ladder) text += ' ' + ladder(v);
    commit();
    paintGain();
  }
  el.dnMsg.className = 'alert ' + lv;
  el.dnMsgT.textContent = text;
  el.dnMsg.hidden = false;
}
function ladder(p) {
  let r = P.base.rung, g = P.base.rungGreen;
  let msg;
  if (p <= 2) {
    g += 1;
    if (g >= 2 && r < 5) { r += 1; g = 0; msg = 'Drugi trening bez bólu: od następnego razu szczebel ' + r + ' (+' + PL.RUNG_PTS + ' pkt).'; }
    else msg = 'Szczebel ' + r + ': ' + Math.min(g, 2) + '/2 treningów bez bólu.';
  } else if (p >= 6) { g = 0; r = Math.max(1, r - 1); msg = 'Następnym razem szczebel ' + r + '.'; }
  else if (p >= 4) { g = 0; msg = 'Licznik treningów bez bólu wraca do 0/2.'; }
  else msg = 'Szczebel ' + r + ' bez zmian: do awansu liczy się ból 0–2.';
  state.rung = r; state.rungGreen = Math.min(g, 2);
  state.events = (state.events || []).filter(ev => ev.s !== P.key);
  if (r > P.base.rung) PL.addEvent(state, { k: 'rung', r, d: P.date, s: P.key });
  return msg;
}
let noteTimer = 0;
el.dnNote.addEventListener('input', () => {
  if (P.practice) return;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    noteTimer = 0;
    const e = logEntry();
    if (!e) return;
    const v = el.dnNote.value.trim().slice(0, 140);
    if (v) e.note = v; else delete e.note;
    commit();
  }, 700);
});
function flushNote() { if (noteTimer) { clearTimeout(noteTimer); noteTimer = 0; const e = logEntry(); if (e && !P.practice) { const v = el.dnNote.value.trim().slice(0, 140); if (v) e.note = v; else delete e.note; commit(); } } }

// ---------- przerwanie ----------
function openSheet() {
  P.sheetPaused = !P.paused;
  setPaused(true);
  const bi = P.steps[P.i].bi;
  el.shD.textContent = P.single ? 'Ćwiczenie z atlasu się nie zapisuje.' : 'Zrobione ćwiczenia: ' + bi + ' z ' + P.session.blocks.length + '.' + (P.practice ? ' To próba, więc nic się nie zapisze.' : ' Przerwana sesja daje połowę punktów.');
  el.sheet.hidden = false;
  const r = el.sheet.querySelector('[data-pl="resume"]');
  if (r) r.focus();
}
function closeSheet() {
  el.sheet.hidden = true;
  if (P.sheetPaused) setPaused(false);
  el.main.focus({ preventScroll: true });
}

// ---------- obsługa przycisków odtwarzacza ----------
pl.addEventListener('click', e => {
  const b = e.target.closest('[data-pl],[data-pain]');
  if (!b || !pl.contains(b)) return;
  audioInit();
  if (b.dataset.pain != null) { setPain(+b.dataset.pain); return; }
  switch (b.dataset.pl) {
    case 'main': mainAction(); break;
    case 'next': goNext(); break;
    case 'back': goBack(); break;
    case 'more': P.t0 += 15000; paint(); break;
    case 'skipex': skipExercise(); break;
    case 'exit': if (P.finished) { flushNote(); closePlayer(); } else openSheet(); break;
    case 'resume': closeSheet(); break;
    case 'finish': el.sheet.hidden = true; P.paused = false; finish(true); break;
    case 'quit': closePlayer(); break;
    case 'close': flushNote(); closePlayer(); break;
    case 'sound': {
      const order = plVoice ? ['voice', 'beep', 'off'] : ['beep', 'off'];
      const cur = order.indexOf(effMode());
      setMode(order[(cur + 1) % order.length]);
      if (mode !== 'off') beep('next');
      break;
    }
  }
});
function paintSound() {
  if (!el.sound) return;
  const m = effMode();
  el.soundT.textContent = m === 'voice' ? 'Głos' : m === 'beep' ? 'Sygnały' : 'Cisza';
  el.sound.dataset.mode = m;
  el.sound.setAttribute('aria-label', 'Dźwięk: ' + (m === 'voice' ? 'sygnały i głos' : m === 'beep' ? 'tylko sygnały' : 'wyciszony') + '. Zmień');
}
document.addEventListener('keydown', e => {
  if (!P.open) return;
  const tag = (e.target && e.target.tagName) || '';
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!el.sheet.hidden) closeSheet();
    else if (P.finished) { flushNote(); closePlayer(); }
    else openSheet();
    return;
  }
  if (P.finished || !el.sheet.hidden || tag === 'INPUT') return;
  if (e.key === ' ' || e.key === 'Enter') { if (tag === 'BUTTON') return; e.preventDefault(); mainAction(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
});
// Krótkie wyjście z aplikacji nie zatrzymuje zegara; po dłuższym (ekran zgasł) trening czeka na „Wznów”.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (syncTimer) syncNow();
    if (P.open && !P.finished && !P.paused) { P.autoPaused = true; P.paused = true; P.pausedAt = Date.now(); }
    return;
  }
  if (P.open) {
    if (P.autoPaused) {
      P.autoPaused = false;
      if (Date.now() - P.pausedAt <= 15000) { P.paused = false; P.pausedAt = 0; }
      paintControls();
    }
    lockScreen();
  }
  if (today() !== shownDay && !P.open) renderAll();
  if (Date.now() - lastSync > 30000) syncSoon(0);
});
window.addEventListener('pagehide', () => { if (syncTimer) syncNow(); });
window.addEventListener('online', () => syncSoon(0));
window.addEventListener('offline', () => { if (cloudOn && cloud.account()) setSync('offline'); });
setInterval(() => {
  if (!P.open && !typing() && (today() !== shownDay || (tab === 'dzis' && panels.dzis.querySelector('.sess-wait')))) renderAll();
  if (!document.hidden && Date.now() - lastSync > 5 * 60000) syncSoon(0);
}, 60000);

// ================= start =================
paintSound();
if (hasSpeech) {
  pickVoice();
  try { window.speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { window.speechSynthesis.onvoiceschanged = pickVoice; }
}
renderAll();
const h0 = (location.hash || '').replace('#', '');
if (PAGES.indexOf(h0) >= 0) showTab(h0, { scroll: false });
else if (/^faza-|^rozgrzewka$/.test(h0)) { showTab('atlas', { scroll: false }); scrollToEl(h0); }
else showTab('dzis', { scroll: false });
setSync(syncMode);
syncNow();
// Praca bez sieci (PWA): tylko na https i localhost, nigdy z pliku.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* brak */ }); });
}
})();
