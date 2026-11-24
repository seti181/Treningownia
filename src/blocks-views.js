/* Widoki bloków treningowych: karty na Dziś, planer Tydzień, formularz wpisu, biblioteka bloków z Moim tygodniem, edytor bloku.
   Dopisuje funkcje do window.VIEWS (czyste funkcje, bez DOM). */
(function (G) {
'use strict';
const PL = G.PLAN, BL = G.BLOCKS, V = G.VIEWS;
const { esc, cap, dayMon, relDay, plural, ICON, painLevel } = V;
const TR = BL.TRACKS;
const ttape = t => `<span class="tape" style="--c:var(${TR[t].c})"><span>${TR[t].tape}</span></span>`;
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MORE = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="12.5" cy="8" r="1.6" fill="currentColor"/></svg>';
const PLUS = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const UP = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 10L8 5.5l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DOWN = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6L8 10.5 12.5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const backHead = (to, label, eyebrow, title) => `<header class="t-head"><button type="button" class="back-btn" data-act="tab" data-v="${to}">${ICON.left}${esc(label)}</button><p class="eyebrow">${esc(eyebrow)}</p><h1 class="t-title">${esc(title)}</h1></header>`;
const PAGE_NAME = { dzis: 'Dziś', tydzien: 'Tydzień', dziennik: 'Dziennik', postep: 'Postęp', wiecej: 'Więcej', bloki: 'Bloki' };

// ---------- teksty ----------
function summary(b) {
  if (!b) return '';
  if (b.kind === 'timed' && b.items && b.items.length) {
    const names = [];
    b.items.forEach(x => { const n = BL.exName(x.ex); if (names.indexOf(n) < 0) names.push(n); });
    return names.join(' · ');
  }
  return b.note || '';
}
function detail(e) {
  const out = [];
  if (e.kind === 'run' || e.t === 'bieg') {
    if (e.km) out.push(BL.fmtKm(e.km) + ' km');
    if (e.sec) out.push(BL.fmtDur(e.sec));
    const p = BL.pace(e.km, e.sec);
    if (p) out.push(p);
  } else if (e.kind === 'climb') {
    if (e.place) out.push(e.place);
    if (e.grade) out.push('max ' + e.grade);
    if (e.routes) out.push(e.routes + ' ' + plural(e.routes, 'droga', 'drogi', 'dróg'));
  }
  if (!e.sec && e.dur) out.push(Math.max(1, Math.round(e.dur / 60)) + ' min');
  if (e.rpe != null) out.push('wysiłek ' + e.rpe + '/10');
  if (e.pain != null) out.push('ból ' + e.pain + '/10');
  if (e.partial) out.push('przerwane');
  return out.join(' · ');
}
const minsOf = b => (b ? 'ok. ' + BL.blockMinutes(b) + ' min' : '');
const ptsOf = b => (b ? TR[b.t].pts : 0);

// ---------- wyzwania tygodnia i rekordy ----------
function chValue(c) {
  if (c.unit === 'km') return BL.fmtKm(c.value) + ' / ' + BL.fmtKm(c.target) + ' km';
  return c.value + ' / ' + c.target + (c.unit ? ' ' + c.unit : '');
}
function challengesHTML(list, opts) {
  const o = opts || {}, done = list.filter(c => c.done).length;
  let h = `<section class="card ch${o.compact ? ' ch-c' : ''}" aria-label="Wyzwania tygodnia: ${done} z ${list.length}">`;
  if (o.title) h += `<div class="ch-head"><h2 class="ch-t">${esc(o.title)}</h2><span class="ch-n">${done} z ${list.length}</span></div>`;
  h += '<ul class="ch-list">' + list.map(c => `<li class="ch-i${c.done ? ' done' : ''}"><div class="ch-top"><b>${c.done ? ICON.check : ''}${esc(c.name)}</b><span class="ch-pts">${c.done ? '' : '+'}${c.pts} pkt</span></div>` +
    `<p class="ch-d">${o.compact ? '' : esc(c.desc) + ' · '}${esc(chValue(c))}</p>${V.bar(c.target ? c.value / c.target : 0)}</li>`).join('') + '</ul>';
  if (o.link) h += `<button type="button" class="linkish ch-link" data-act="tab" data-v="tydzien">Plan tygodnia</button>`;
  return h + '</section>';
}
function recordsHTML(st, today) {
  const r = BL.records(BL.entries(st));
  const list = BL.REC_DEFS.filter(d => r.best[d.id]);
  if (!list.length) return '<p class="empty">Rekordy pojawią się po pierwszych biegach z dystansem i czasem oraz wspinaniach z wyceną i liczbą dróg. Pobity rekord to +' + BL.REC_PTS + ' pkt.</p>';
  return '<ul class="recs">' + list.map(d => {
    const b = r.best[d.id];
    return `<li class="card rec"><span class="rec-l">${esc(d.name)}</span><b class="rec-v">${esc(b.text)}</b><span class="rec-d">${esc(cap(relDay(b.d, today)))}</span></li>`;
  }).join('') + '</ul><p class="w-note">Pobity rekord: +' + BL.REC_PTS + ' pkt. Pierwszy wynik ustawia poprzeczkę.</p>';
}

// ---------- wykresy ----------
// Kolumny w HTML/CSS: jeden kolor (rodzaj treningu), słupki od zera, odczyt nad wykresem po dotknięciu słupka
// (domyślnie ostatni), podpisy osi co kilka kolumn, tabela z wszystkimi wartościami pod wykresem.
// o: { id, title, color, kind: 'bar' | 'dot', pts: [{ short, label, val, text }], ref: { val, label }, lo, hi, up, axis: v => tekst }
function colChart(o) {
  const vals = o.pts.map(p => p.val).filter(v => v != null);
  let lo = o.kind === 'bar' ? 0 : (o.lo != null ? o.lo : Math.min.apply(null, vals.concat(o.ref ? [o.ref.val] : [])));
  let hi = o.hi != null ? o.hi : Math.max.apply(null, vals.concat(o.ref ? [o.ref.val] : []).concat([o.kind === 'bar' ? 1 : lo + 1]));
  if (o.kind !== 'bar') { const pad = (hi - lo) * 0.12 || 60; lo -= pad; hi += pad; }
  const pos = v => { const f = (v - lo) / ((hi - lo) || 1); return Math.max(0, Math.min(1, o.up ? 1 - f : f)) * 100; };
  const last = o.pts.map(p => p.val != null).lastIndexOf(true);
  const cur = last >= 0 ? o.pts[last] : null;
  const every = o.pts.length > 8 ? 3 : 1;
  let h = `<figure class="cc" style="--cc:var(${o.color})" id="${o.id}"><figcaption class="cc-h">${esc(o.title)}</figcaption>` +
    `<p class="cc-read" aria-live="polite">${cur ? `<span>${esc(cur.label)}</span><b>${esc(cur.text)}</b>` : '<span>Brak danych</span>'}</p>` +
    `<div class="cc-plot cc-k-${o.kind}" role="group" aria-label="${esc(o.title)}">`;
  if (o.ref) h += `<i class="cc-ref" style="bottom:${pos(o.ref.val).toFixed(1)}%"><em>${esc(o.ref.label)}</em></i>`;
  h += `<span class="cc-ax cc-ax-hi">${esc(o.axis(o.up ? lo : hi))}</span><span class="cc-ax cc-ax-lo">${esc(o.axis(o.up ? hi : lo))}</span>`;
  o.pts.forEach((p, i) => {
    const has = p.val != null;
    const mark = o.kind === 'bar' ? `<i class="cc-bar" style="height:${has ? Math.max(p.val > 0 ? 2 : 0, pos(p.val)).toFixed(1) : 0}%"></i>` : (has ? `<i class="cc-dot" style="bottom:${pos(p.val).toFixed(1)}%"></i>` : '');
    h += `<button type="button" class="cc-col${i === last ? ' is-cur' : ''}" data-act="cc" data-l="${esc(p.label)}" data-t="${esc(has ? p.text : 'brak')}" aria-label="${esc(p.label + ': ' + (has ? p.text : 'brak'))}">${mark}<span class="cc-x">${i % every === (o.pts.length - 1) % every ? esc(p.short) : ''}</span></button>`;
  });
  h += `</div><details class="cc-tab"><summary>Tabela</summary><table><tbody>${o.pts.map(p => `<tr><th scope="row">${esc(p.label)}</th><td>${esc(p.val != null ? p.text : '—')}</td></tr>`).join('')}</tbody></table></details></figure>`;
  return h;
}
// Poziome słupki z podpisem wartości (mało kategorii): piramida wycen, miejsca.
function hBars(title, color, rows, unit) {
  const max = Math.max.apply(null, rows.map(r => r.n).concat([1]));
  return `<figure class="cc hb" style="--cc:var(${color})"><figcaption class="cc-h">${esc(title)}</figcaption>` + (rows.length
    ? `<ul class="hb-l">${rows.map(r => `<li><span class="hb-k">${esc(r.k)}</span><span class="hb-b"><i style="width:${(r.n / max * 100).toFixed(1)}%"></i></span><span class="hb-n">${r.n}${unit ? ' ' + esc(unit) : ''}</span></li>`).join('')}</ul>`
    : '<p class="empty">Brak danych z tego okresu.</p>') + '</figure>';
}
function chartsRunHTML(st, today) {
  const ws = BL.runWeeks(st, today, 12);
  const sh = w => PL.parse(w.from).getDate() + '.' + (PL.parse(w.from).getMonth() + 1);
  const lab = w => 'Tydzień od ' + dayMon(w.from);
  const km = v => BL.fmtKm(v) + ' km';
  let h = '<div class="charts">';
  h += colChart({ id: 'cc-km', title: 'Kilometry w tygodniu', color: '--p2', kind: 'bar', axis: v => BL.fmtKm(Math.round(v)) + ' km',
    pts: ws.map(w => ({ short: sh(w), label: lab(w), val: w.km, text: km(w.km) })) });
  h += colChart({ id: 'cc-long', title: 'Najdłuższy bieg w tygodniu', color: '--p2', kind: 'bar', axis: v => BL.fmtKm(Math.round(v)) + ' km',
    pts: ws.map(w => ({ short: sh(w), label: lab(w), val: w.long, text: km(w.long) })) });
  const hm = ws.filter(w => w.hm != null);
  h += hm.length
    ? colChart({ id: 'cc-hm', title: 'Przewidywany półmaraton (wyżej = szybciej)', color: '--p2', kind: 'dot', up: true, axis: v => BL.fmtDur(Math.round(v / 60) * 60).replace(/:00$/, ''),
      ref: { val: 80 * 60, label: 'cel 1:20' }, pts: ws.map(w => ({ short: sh(w), label: lab(w), val: w.hm, text: w.hm != null ? BL.fmtDur(w.hm) : '' })) })
    : `<figure class="cc"><figcaption class="cc-h">Przewidywany półmaraton</figcaption><p class="empty">Pojawi się po pierwszym biegu od 3 km z czasem.</p></figure>`;
  return h + '</div>';
}
const MON_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
function chartsClimbHTML(st, today) {
  const cs = BL.climbStats(st, today, 90, 6);
  const grades = BL.GRADE_LIST.filter(g => cs.byGrade[g]).reverse().map(g => ({ k: g, n: cs.byGrade[g] }));
  const places = BL.PLACES.concat(['Bez miejsca']).filter(p => cs.byPlace[p]).map(p => ({ k: p, n: cs.byPlace[p] }));
  let h = '<div class="charts">';
  h += hBars('Najtrudniejsza droga sesji, 90 dni', '--p4', grades, '');
  h += hBars('Gdzie się wspinasz, 90 dni', '--p4', places, '');
  const got = cs.monthly.filter(m => m.i >= 0);
  h += got.length
    ? colChart({ id: 'cc-grade', title: 'Najtrudniejsza droga w miesiącu', color: '--p4', kind: 'dot', axis: v => BL.GRADE_LIST[Math.max(0, Math.min(BL.GRADE_LIST.length - 1, Math.round(v)))],
      lo: Math.max(0, Math.min.apply(null, got.map(m => m.i)) - 1), hi: Math.max.apply(null, got.map(m => m.i).concat([BL.GRADE_LIST.indexOf('7c')])),
      ref: { val: BL.GRADE_LIST.indexOf('7c'), label: 'cel 7c' },
      pts: cs.monthly.map(m => ({ short: MON_SHORT[m.month], label: MON_SHORT[m.month] + ' ' + m.year, val: m.i >= 0 ? m.i : null, text: m.grade || '' })) })
    : `<figure class="cc"><figcaption class="cc-h">Najtrudniejsza droga w miesiącu</figcaption><p class="empty">Pojawi się po wspinaniu z wyceną najtrudniejszej drogi.</p></figure>`;
  return h + '</div>';
}

// ---------- Dziś ----------
const timedRun = b => !!b && (b.kind === 'timed' || b.kind === 'run') && !!(b.items && b.items.length);
// Linia tempa i ostrzeżenie dla bloków, które mają sens dopiero po teście 5 km.
function runInfo(st, b, today) {
  if (!b || b.kind !== 'run') return '';
  const pc = BL.paces(st, today);
  let h = `<p class="blk-pace">${esc(BL.paceText(b, pc))}</p>`;
  if (b.after === 'test' && !pc) h += `<p class="blk-warn">Na razie tylko spokojne biegi: ten blok ma sens po teście 5 km.</p>`;
  return h;
}
// Etap cyklu (budowanie / odciążenie) jako jedna linia.
function phaseLine(st, d) {
  const p = BL.phaseOf(st, d);
  if (!p) return '';
  return `<p class="phase-line${p.kind === 'odciazenie' ? ' is-rec' : ''}"><b>${esc(p.name)}</b> · tydzień ${p.week} z ${p.of}${p.kind === 'odciazenie' ? ' · ok. 60% objętości, wszystko spokojnie, bez zwiększeń' : ''}</p>`;
}
// Propozycje zwiększeń: nic nie zmienia się samo.
function proposalsHTML(st, today) {
  const ps = BL.proposals(st, today);
  const alarm = BL.shoulderAlarm(st, today) && !BL.isRecovery(st, today);
  if (!ps.length && !alarm) return '';
  let h = `<section class="card props" aria-label="Propozycje"><h2 class="ch-t">Propozycje</h2>`;
  if (alarm) h += `<p class="props-note">Zwiększenia wstrzymane: ból barku od 4/10 albo czerwony poranek w ostatnich 7 dniach.</p>`;
  h += '<ul class="props-list">' + ps.map(p => `<li><p class="props-t"><b>${esc(p.title)}</b></p><p class="props-x">${esc(p.text)}</p>` +
    `<div class="choices"><button type="button" class="chip-btn sm primary" data-act="pr-ok" data-v="${esc(p.id)}">Przyjmij</button><button type="button" class="chip-btn sm" data-act="pr-no" data-v="${esc(p.id)}">Nie teraz</button></div></li>`).join('') + '</ul></section>';
  return h;
}
function todayBlocksHTML(st, today, prog) {
  const items = BL.dayView(st, today);
  let h = `<h2 class="sub-h">Trening <button type="button" class="linkish sub-link" data-act="tab" data-v="tydzien">Plan tygodnia</button></h2>${phaseLine(st, today)}${proposalsHTML(st, today)}`;
  if (!items.length) return h + `<p class="empty blk-empty">Dziś bez bloków. Dodasz je w zakładce Tydzień.</p>`;
  h += '<div class="sessions blk-list">';
  const firstOpen = items.findIndex(x => !x.entry && !x.skip && x.block);
  items.forEach((x, i) => {
    const b = x.block, e = x.entry;
    const t = b ? b.t : (e && e.t) || 'rozc';
    const name = b ? b.name : (e && e.name) || 'Usunięty blok';
    const pts = e ? (prog.byEntry[today + '|b:' + x.k] || 0) : ptsOf(b) + BL.RATE_PTS;
    const ds = `data-d="${today}" data-k="${esc(x.k)}"`;
    h += `<article class="sess blk${e ? ' is-done' : ''}${x.skip ? ' is-skip' : ''}${i === firstOpen ? ' is-next' : ''}" style="--c:var(${TR[t].c})">
<div class="sess-top"><p class="sess-label">${esc(TR[t].name)}${b && !e ? ' · ' + minsOf(b) : ''}</p><span class="sess-pts${e ? ' got' : ''}">${e ? '' : '+'}${pts} pkt</span></div>
<h2 class="sess-title">${esc(name)}</h2>`;
    if (e) {
      h += `<p class="sess-state ${painLevel(e.pain)}">${ICON.check}Zrobione${detail(e) ? ' · ' + esc(detail(e)) : ''}</p>${e.note ? `<p class="blk-note">${esc(e.note)}</p>` : ''}` +
        `<div class="choices blk-acts"><button type="button" class="chip-btn sm" data-act="b-log" ${ds}>Popraw wpis</button></div>`;
    } else if (x.skip) {
      h += `<p class="sess-state">Pominięte</p><div class="choices blk-acts"><button type="button" class="chip-btn sm" data-act="b-skip" data-v="0" ${ds}>Przywróć</button></div>`;
    } else if (!b) {
      h += `<p class="sess-list">Tego bloku nie ma już w bibliotece.</p><div class="choices blk-acts"><button type="button" class="chip-btn sm" data-act="b-remove" ${ds}>Usuń z dnia</button></div>`;
    } else {
      h += `<p class="sess-list">${esc(b.kind === 'run' ? b.note : summary(b))}</p>${runInfo(st, b, today)}${b.kind === 'climb' ? `<p class="blk-warn">${esc(BL.CLIMB_NOTE)}</p>` : ''}`;
      h += timedRun(b)
        ? `<button type="button" class="go${i === firstOpen ? '' : ' secondary'}" data-act="b-start" ${ds}>${b.kind === 'run' ? 'Zacznij z zegarem' : 'Zacznij'}</button>`
        : `<button type="button" class="go${i === firstOpen ? '' : ' secondary'}" data-act="b-log" ${ds}>Zapisz trening</button>`;
      h += `<div class="choices blk-acts">${timedRun(b) ? `<button type="button" class="chip-btn sm" data-act="b-log" ${ds}>${b.kind === 'run' ? 'Zapisz bez zegara' : 'Zapisz bez zegara'}</button>` : ''}` +
        `<button type="button" class="chip-btn sm" data-act="b-move-open" ${ds}>Przenieś</button><button type="button" class="chip-btn sm" data-act="b-skip" data-v="1" ${ds}>Pomiń</button></div>`;
    }
    h += '</article>';
  });
  h += '</div>';
  return h + challengesHTML(BL.challenges(st, BL.weekStart(today)), { compact: true, title: 'Wyzwania tygodnia', link: true });
}

// ---------- Tydzień ----------
function weekRange(from) {
  const a = PL.parse(from), b = PL.parse(PL.addDays(from, 6));
  return a.getMonth() === b.getMonth() ? a.getDate() + '–' + b.getDate() + ' ' + dayMon(PL.addDays(from, 6)).split(' ')[1] : dayMon(from) + ' – ' + dayMon(PL.addDays(from, 6));
}
function weekHTML(st, today, ui, prog) {
  const off = ui.wkOff || 0;
  const from = PL.addDays(BL.weekStart(today), off * 7);
  const ws = BL.weekStats(st, from);
  const rel = off === 0 ? 'Ten tydzień' : off === 1 ? 'Następny tydzień' : off === -1 ? 'Poprzedni tydzień' : '';
  let h = `<header class="t-head"><p class="eyebrow">Tydzień</p><h1 class="t-title">Plan tygodnia</h1></header>`;
  h += `<div class="wk-nav"><button type="button" class="icon-btn" data-act="wk-prev" aria-label="Poprzedni tydzień">${ICON.left}</button>` +
    `<p class="wk-range" aria-live="polite"><b>${esc(weekRange(from))}</b>${rel ? '<small>' + rel + '</small>' : ''}</p>` +
    `<button type="button" class="icon-btn" data-act="wk-next" aria-label="Następny tydzień">${ICON.chev}</button></div>`;
  h += `<div class="wk-sum card"><span>Biegi <b>${ws.runs}</b>/${BL.WEEK_RUNS}</span><span>Wspinanie <b>${ws.climbs}</b>/${BL.WEEK_CLIMBS}</span><span><b>${BL.fmtKm(ws.km)}</b> km</span></div>`;
  h += phaseLine(st, from);
  h += challengesHTML(BL.challenges(st, from), { title: 'Wyzwania tygodnia' });
  h += '<ol class="wk">';
  for (let i = 0; i < 7; i++) {
    const d = PL.addDays(from, i), isToday = d === today, past = d < today;
    h += `<li class="wk-day card${isToday ? ' is-today' : ''}${past ? ' is-past' : ''}" id="wk-${d}"><h2 class="wk-h"><span>${isToday ? 'Dziś' : esc(cap(PL.DAYS[PL.dow(d)]))}</span><small>${esc(dayMon(d))}</small></h2><ul class="wk-list">`;
    // rehabilitacja: automatycznie z planu, bez przenoszenia
    const dp = PL.dayPlan(d, st);
    if (!dp.practice || d >= st.start) {
      const done = dp.sessions.filter(s => PL.isDone(st, d, s.id)).length;
      h += `<li class="wk-s wk-rehab"><span class="wk-k"><span class="tape" style="--c:var(${PL.PHASES[dp.phase].c})"><span>${PL.PHASES[dp.phase].tape}</span></span></span><span class="wk-t"><b>Rehabilitacja</b><small>${esc(dp.sessions.map(s => s.label).join(', '))}${done ? ' · zrobione ' + done + '/' + dp.sessions.length : ''}</small></span>${done && done >= dp.sessions.length ? ICON.check : ''}</li>`;
    }
    BL.dayView(st, d).forEach(x => {
      const b = x.block, e = x.entry, t = b ? b.t : (e && e.t) || 'rozc';
      const key = d + '|' + x.k, open = ui.wkOpen === key;
      const name = b ? b.name : (e && e.name) || 'Usunięty blok';
      const ds = `data-d="${d}" data-k="${esc(x.k)}"`;
      const st2 = e ? 'zrobione' + (detail(e) ? ' · ' + detail(e) : '') : x.skip ? 'pominięte' : TR[t].name + (b ? ' · ' + minsOf(b) : '');
      h += `<li class="wk-s${e ? ' is-done' : ''}${x.skip ? ' is-skip' : ''}"><span class="wk-k">${ttape(t)}</span><span class="wk-t"><b>${esc(name)}</b><small>${esc(st2)}</small></span>` +
        (e ? ICON.check : '') + `<button type="button" class="icon-btn" data-act="wk-open" ${ds} aria-expanded="${open ? 'true' : 'false'}" aria-label="Opcje: ${esc(name)}, ${esc(dayMon(d))}">${MORE}</button></li>`;
      if (open) {
        h += '<li class="wk-acts"><div class="choices">';
        if (e) h += `<button type="button" class="chip-btn sm" data-act="b-log" ${ds}>Popraw wpis</button>`;
        else if (b && !x.skip) {
          h += timedRun(b) ? `<button type="button" class="chip-btn sm primary" data-act="b-start" ${ds}>Zacznij</button><button type="button" class="chip-btn sm" data-act="b-log" ${ds}>Zapisz bez zegara</button>`
            : `<button type="button" class="chip-btn sm primary" data-act="b-log" ${ds}>Zapisz trening</button>`;
        }
        if (!e) {
          h += `<button type="button" class="chip-btn sm" data-act="wk-move" ${ds} aria-expanded="${ui.wkMove === key ? 'true' : 'false'}">Przenieś</button>`;
          h += x.skip ? `<button type="button" class="chip-btn sm" data-act="b-skip" data-v="0" ${ds}>Przywróć</button>` : `<button type="button" class="chip-btn sm" data-act="b-skip" data-v="1" ${ds}>Pomiń</button>`;
          h += `<button type="button" class="chip-btn sm" data-act="b-remove" ${ds}>Usuń z dnia</button>`;
        }
        h += '</div>';
        if (ui.wkMove === key && !e) {
          h += `<p class="wk-mv-l">Przenieś na:</p><div class="choices wk-days">`;
          for (let j = 0; j < 7; j++) {
            const t2 = PL.addDays(from, j);
            if (t2 === d) continue;
            h += `<button type="button" class="chip-btn sm" data-act="b-move" ${ds} data-v="${t2}">${t2 === today ? 'Dziś' : esc(PL.DSHORT[PL.dow(t2)] + ' ' + PL.parse(t2).getDate())}</button>`;
          }
          h += `<button type="button" class="chip-btn sm" data-act="b-move" ${ds} data-v="${PL.addDays(d, 7)}">Za tydzień</button></div>`;
        }
        h += '</li>';
      }
    });
    h += '</ul>';
    if (ui.wkAdd === d) {
      h += `<div class="wk-add"><p class="wk-mv-l">Dodaj blok:</p>${blockChips(st, 'b-add', `data-d="${d}"`)}<button type="button" class="linkish" data-act="wk-add" data-d="">Anuluj</button></div>`;
    } else h += `<button type="button" class="chip-btn sm wk-plus" data-act="wk-add" data-d="${d}">${PLUS}Dodaj blok</button>`;
    h += '</li>';
  }
  h += '</ol>';
  h += `<p class="w-note">Ten plan powstaje z Twojego domyślnego tygodnia. Zmienisz go razem z blokami w <button type="button" class="linkish" data-act="tab" data-v="bloki">Bloki treningowe</button>.</p>`;
  return h;
}
// Wybór bloku: przyciski pogrupowane według rodzaju.
function blockChips(st, act, attrs) {
  let h = '<div class="pick">';
  BL.TRACK_IDS.forEach(t => {
    const list = BL.allBlocks(st).filter(b => b.t === t);
    if (!list.length) return;
    h += `<p class="pick-g">${esc(TR[t].name)}</p><div class="choices">` + list.map(b => `<button type="button" class="chip-btn sm" data-act="${act}" ${attrs} data-s="${esc(b.id)}">${esc(b.name)}</button>`).join('') + '</div>';
  });
  return h + '</div>';
}

// ---------- wpis ----------
function chipRow(field, cur, from, to, label, lv) {
  let h = `<div class="lg-row" role="group" aria-label="${esc(label)}">`;
  for (let v = from; v <= to; v++) h += `<button type="button" class="${lv ? 'p-' + (v <= 3 ? 'ok' : v <= 5 ? 'warn' : 'bad') : ''}" data-act="lg-set" data-v="${field}:${v}" aria-pressed="${cur === v ? 'true' : 'false'}">${v}</button>`;
  return h + '</div>';
}
function logFormHTML(st, today, ui) {
  const lg = ui.lg;
  if (!lg) return backHead('dzis', 'Dziś', 'Wpis', 'Nic do zapisania');
  const b = BL.getBlock(st, lg.b);
  const f = lg.f || {};
  const back = PAGE_NAME[lg.back] || 'Wróć';
  let h = backHead(lg.back || 'dzis', back, (b ? TR[b.t].name + ' · ' : '') + relDay(lg.d, today), lg.adhoc ? 'Dodaj trening' : (b ? b.name : 'Wpis'));
  h += `<form class="card form lg" data-form="blog" novalidate>`;
  if (lg.adhoc) {
    h += `<div class="row"><label class="fld sm"><span>Dzień</span><input type="date" id="lg-date" value="${esc(lg.d)}" max="${today}"></label>` +
      `<label class="fld"><span>Blok</span><select id="lg-b">${BL.TRACK_IDS.map(t => `<optgroup label="${esc(TR[t].name)}">` + BL.allBlocks(st).filter(x => x.t === t).map(x => `<option value="${esc(x.id)}"${x.id === lg.b ? ' selected' : ''}>${esc(x.name)}</option>`).join('') + '</optgroup>').join('')}</select></label></div>`;
  }
  if (b && b.note && !lg.edit) h += `<p class="lg-note">${esc(b.note)}</p>`;
  const kind = b ? b.kind : 'simple';
  if (kind === 'run') {
    const km = BL.parseKm(f.km), sec = BL.parseTime(f.time);
    h += `<div class="row"><label class="fld sm"><span>Dystans (km)</span><input type="text" id="lg-km" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="0,0" value="${esc(f.km || '')}"${lg.err === 'km' ? ' aria-invalid="true"' : ''}></label>` +
      `<label class="fld sm"><span>Czas</span><input type="text" id="lg-time" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="np. 34:10" value="${esc(f.time || '')}"${lg.err === 'time' ? ' aria-invalid="true"' : ''}></label>` +
      `<p class="lg-pace" id="lg-pace" aria-live="polite">${km && sec ? 'Tempo: <b>' + BL.pace(km, sec) + '</b>' : 'Tempo policzy się samo.'}</p></div>`;
  } else if (kind === 'climb') {
    h += `<div class="fld"><span>Gdzie</span><div class="choices" role="group" aria-label="Gdzie">${BL.PLACES.map(p => `<button type="button" class="chip-btn sm" data-act="lg-set" data-v="place:${p}" aria-pressed="${f.place === p ? 'true' : 'false'}">${p}</button>`).join('')}</div></div>` +
      `<div class="row"><label class="fld sm"><span>Czas (min)</span><input type="text" id="lg-min" inputmode="numeric" autocomplete="off" maxlength="4" value="${esc(f.min || '')}"${lg.err === 'min' ? ' aria-invalid="true"' : ''}></label>` +
      `<label class="fld sm"><span>Najtrudniejsza droga</span><select id="lg-grade"><option value="">—</option>${BL.GRADE_LIST.map(g => `<option${f.grade === g ? ' selected' : ''}>${g}</option>`).join('')}</select></label>` +
      `<label class="fld sm"><span>Liczba dróg</span><input type="text" id="lg-routes" inputmode="numeric" autocomplete="off" maxlength="3" value="${esc(f.routes || '')}"></label></div>`;
  } else {
    h += `<div class="row"><label class="fld sm"><span>Czas (min)</span><input type="text" id="lg-min" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="${b ? BL.blockMinutes(b) : ''}" value="${esc(f.min || '')}"${lg.err === 'min' ? ' aria-invalid="true"' : ''}></label></div>`;
  }
  h += `<div class="fld"><span id="lg-rpe-l">Wysiłek (1 lekko, 10 maksymalnie)</span>${chipRow('rpe', f.rpe, 1, 10, 'Wysiłek', false)}</div>`;
  if (b && b.t !== 'bieg') h += `<div class="fld"><span>Ból barku w trakcie (0–10)</span>${chipRow('pain', f.pain, 0, 10, 'Ból barku', true)}</div>`;
  h += `<label class="fld"><span>Notatka (opcjonalnie)</span><input type="text" id="lg-note" maxlength="200" autocomplete="off" value="${esc(f.note || '')}"></label>`;
  const errTxt = { km: 'Wpisz dystans w kilometrach, np. 6,5.', time: 'Wpisz czas jako minuty:sekundy (34:10) albo godziny:minuty:sekundy.', min: 'Wpisz czas w minutach, np. 45.', b: 'Wybierz blok.' }[lg.err] || '';
  h += `<p class="wq-h${errTxt ? ' is-err' : ''}" id="lg-h"${errTxt ? ' role="alert"' : ''}>${esc(errTxt || (b ? '+' + ptsOf(b) + ' pkt za trening, +' + BL.RATE_PTS + ' za ocenę wysiłku lub bólu.' : ''))}</p>`;
  h += `<button type="button" class="go" data-act="lg-save">Zapisz</button><div class="choices"><button type="button" class="chip-btn" data-act="lg-cancel">Anuluj</button>${lg.edit ? '<button type="button" class="chip-btn danger" data-act="lg-del">Usuń wpis</button>' : ''}</div></form>`;
  return h;
}

// ---------- biblioteka i Mój tydzień ----------
function libraryHTML(st, ui) {
  let h = backHead('wiecej', 'Więcej', 'Bloki treningowe', 'Bloki i tydzień');
  const pat = BL.pattern(st);
  h += `<section class="card form" id="moj-tydzien"><h2>Mój tydzień</h2><p>Domyślny plan na każdy tydzień. Zmiany jednego dnia (przeniesienie, pominięcie) robisz w zakładce Tydzień.</p><ul class="pat">`;
  DOW_ORDER.forEach(dw => {
    const list = pat[dw] || [];
    h += `<li><b class="pat-d">${esc(cap(PL.DAYS[dw]))}</b><div class="choices">` + list.map((id, i) => {
      const b = BL.getBlock(st, id), nm = b ? b.name : 'Usunięty blok';
      return `<span class="pat-c"${b ? ` style="--c:var(${TR[b.t].c})"` : ''}>${esc(nm)}<button type="button" class="pat-x" data-act="pat-del" data-v="${dw}" data-i="${i}" aria-label="Usuń ${esc(nm)}: ${esc(PL.DAYS[dw])}">${ICON.x}</button></span>`;
    }).join('') + `<button type="button" class="chip-btn sm" data-act="pat-open" data-v="${dw}" aria-expanded="${ui.patAdd === dw ? 'true' : 'false'}" aria-label="Dodaj blok: ${esc(PL.DAYS[dw])}">${PLUS}</button></div>`;
    if (ui.patAdd === dw) h += `<div class="wk-add">${blockChips(st, 'pat-add', `data-v="${dw}"`)}<button type="button" class="linkish" data-act="pat-open" data-v="-1">Anuluj</button></div>`;
    h += '</li>';
  });
  h += '</ul>' + (st.week ? '<div class="choices"><button type="button" class="chip-btn sm" data-act="pat-reset">Przywróć tydzień startowy</button></div>' : '') + '</section>';
  // cykl: tygodnie budowania i odciążenia
  const c = st.cycle || { start: BL.weekStart(PL.ymd(new Date())), build: 0, recover: 1 };
  h += `<section class="card form" id="cykl"><h2>Cykl treningowy</h2><p>Kilka tygodni budowania, potem tydzień odciążenia (ok. 60% objętości, bez zwiększeń). Propozycje zwiększeń pojawiają się tylko w tygodniach budowania.</p><div class="row">` +
    `<label class="fld sm"><span>Budowanie (tygodnie)</span><select id="cy-build"><option value="0"${!st.cycle ? ' selected' : ''}>bez cyklu</option>${[2, 3, 4, 5, 6].map(n => `<option value="${n}"${st.cycle && st.cycle.build === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` +
    `<label class="fld sm"><span>Odciążenie (tygodnie)</span><select id="cy-rec">${[1, 2].map(n => `<option value="${n}"${c.recover === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` +
    `<label class="fld sm"><span>Początek (poniedziałek)</span><input type="date" id="cy-start" value="${esc(c.start)}"></label></div>` +
    (st.cycle ? phaseLine(st, PL.ymd(new Date())) : '') + '</section>';
  BL.TRACK_IDS.forEach(t => {
    const list = BL.allBlocks(st).filter(b => b.t === t);
    h += `<h2 class="sub-h">${esc(TR[t].name)}</h2><ul class="lib">`;
    list.forEach(b => {
      const own = !BL.isBuiltin(b.id), edited = BL.isEdited(st, b.id);
      h += `<li class="card lib-i" style="--c:var(${TR[t].c})"><div class="lib-top">${ttape(t)}<span class="wk-t"><b>${esc(b.name)}</b><small>${esc(minsOf(b))} · +${TR[t].pts} pkt${own ? ' · własny' : edited ? ' · zmieniony' : ''}</small></span></div>` +
        `<p class="lib-sum">${esc(b.kind === 'run' ? b.note : summary(b))}</p>` + (b.kind === 'run' ? `<p class="blk-pace">${esc(BL.paceText(b, BL.paces(st, PL.ymd(new Date()))))}${b.after === 'test' ? ' · po teście 5 km' : ''}</p>` : '');
      if (ui.blDel === b.id) {
        h += `<div class="confirm"><p><b>${own ? 'Usunąć ten blok?' : 'Przywrócić wersję startową?'}</b>${own ? ' Zniknie też z Twojego tygodnia.' : ''}</p><div class="choices"><button type="button" class="chip-btn sm danger" data-act="bl-del-yes" data-v="${esc(b.id)}">${own ? 'Usuń' : 'Przywróć'}</button><button type="button" class="chip-btn sm" data-act="bl-del" data-v="">Anuluj</button></div></div>`;
      } else {
        h += `<div class="choices"><button type="button" class="chip-btn sm" data-act="bl-edit" data-v="${esc(b.id)}">Edytuj</button><button type="button" class="chip-btn sm" data-act="bl-copy" data-v="${esc(b.id)}">Kopiuj</button>` +
          (own ? `<button type="button" class="chip-btn sm" data-act="bl-del" data-v="${esc(b.id)}">Usuń</button>` : edited ? `<button type="button" class="chip-btn sm" data-act="bl-del" data-v="${esc(b.id)}">Przywróć startowy</button>` : '') + '</div>';
      }
      h += '</li>';
    });
    h += '</ul>';
  });
  h += `<div class="lib-new">${ui.blNew ? `<p class="wk-mv-l">Nowy blok, rodzaj:</p><div class="choices">${BL.TRACK_IDS.map(t => `<button type="button" class="chip-btn" data-act="bl-new-t" data-v="${t}">${esc(TR[t].name)}</button>`).join('')}<button type="button" class="linkish" data-act="bl-new" data-v="0">Anuluj</button></div>`
    : `<button type="button" class="go secondary" data-act="bl-new" data-v="1">${PLUS}Nowy blok</button>`}</div>`;
  return h;
}

// ---------- edytor bloku ----------
const KIND_NAMES = { timed: 'Ćwiczenia z zegarem', run: 'Bieg', climb: 'Wspinanie', simple: 'Bez zegara (tylko czas)' };
function editorHTML(st, ui) {
  const ed = ui.ed;
  if (!ed) return backHead('bloki', 'Bloki', 'Blok', 'Brak bloku');
  let h = backHead('bloki', 'Bloki', ed.id ? 'Edycja bloku' : 'Nowy blok', ed.name || 'Nowy blok');
  h += `<form class="card form ed" data-form="block" novalidate>`;
  h += `<label class="fld"><span>Nazwa</span><input type="text" id="ed-name" maxlength="60" autocomplete="off" value="${esc(ed.name || '')}"${ui.edErr === 'name' ? ' aria-invalid="true"' : ''}></label>`;
  h += `<div class="row"><label class="fld sm"><span>Rodzaj</span><select id="ed-t">${BL.TRACK_IDS.map(t => `<option value="${t}"${ed.t === t ? ' selected' : ''}>${esc(TR[t].name)}</option>`).join('')}</select></label>` +
    `<label class="fld"><span>Jak zapisywać</span><select id="ed-kind">${BL.KINDS.map(k => `<option value="${k}"${ed.kind === k ? ' selected' : ''}>${esc(KIND_NAMES[k])}</option>`).join('')}</select></label></div>`;
  h += `<label class="fld"><span>Opis i wskazówki</span><input type="text" id="ed-note" maxlength="300" autocomplete="off" value="${esc(ed.note || '')}"></label>`;
  if (ed.kind !== 'timed') {
    h += `<div class="row"><label class="fld sm"><span>Czas (min)</span><input type="text" id="ed-min" inputmode="numeric" maxlength="3" autocomplete="off" value="${esc(ed.min == null ? '' : ed.min)}"></label>` +
      (ed.kind === 'run' ? `<label class="fld sm"><span>Dystans (km, opcjonalnie)</span><input type="text" id="ed-km" inputmode="decimal" maxlength="6" autocomplete="off" value="${esc(ed.km == null ? '' : ed.km)}"></label>` : '') + '</div>';
  } else {
    h += `<div class="row"><label class="fld sm"><span>Przerwa między ćwiczeniami (s)</span><input type="text" id="ed-gap" inputmode="numeric" maxlength="3" autocomplete="off" value="${esc(ed.gap == null ? '' : ed.gap)}"></label></div>`;
    h += '<ol class="ed-items">';
    (ed.items || []).forEach((it, i) => {
      const nm = BL.exName(it.ex);
      const f = (fld, label, val, w) => `<label class="fld xs"><span>${label}</span><input type="text" class="ed-f" data-i="${i}" data-f="${fld}" inputmode="${fld === 'reps' || fld === 'note' ? 'text' : 'numeric'}" maxlength="${w || 4}" autocomplete="off" value="${esc(val == null ? '' : val)}"></label>`;
      h += `<li class="ed-it"><div class="ed-top"><b>${i + 1}. ${esc(nm)}</b><span class="ed-btns"><button type="button" class="icon-btn" data-act="ed-up" data-i="${i}" aria-label="W górę: ${esc(nm)}"${i ? '' : ' disabled'}>${UP}</button>` +
        `<button type="button" class="icon-btn" data-act="ed-down" data-i="${i}" aria-label="W dół: ${esc(nm)}"${i < ed.items.length - 1 ? '' : ' disabled'}>${DOWN}</button><button type="button" class="icon-btn" data-act="ed-del" data-i="${i}" aria-label="Usuń: ${esc(nm)}">${ICON.trash}</button></span></div>` +
        `<div class="row ed-row"><label class="fld xs"><span>Typ</span><select class="ed-f" data-i="${i}" data-f="kind"><option value="hold"${it.kind === 'hold' ? ' selected' : ''}>Trzymanie</option><option value="reps"${it.kind === 'reps' ? ' selected' : ''}>Powtórzenia</option><option value="time"${it.kind === 'time' ? ' selected' : ''}>Czas</option></select></label>` +
        (it.kind === 'time' ? f('dur', 'Czas (s)', it.dur) : f('sets', 'Serie', it.sets) + (it.kind === 'hold' ? f('hold', 'Sekundy', it.hold) : f('reps', 'Powtórzenia', it.reps, 12)) + f('rest', 'Przerwa (s)', it.rest)) +
        `</div><label class="fld"><span>Uwagi</span><input type="text" class="ed-f" data-i="${i}" data-f="note" maxlength="80" autocomplete="off" value="${esc(it.note || '')}"></label></li>`;
    });
    h += '</ol>';
    if (ui.edAdd) {
      const cat = BL.catalog(), groups = [];
      cat.forEach(c => { if (groups.indexOf(c.group) < 0) groups.push(c.group); });
      h += `<div class="row ed-add"><label class="fld"><span>Ćwiczenie</span><select id="ed-add-ex">${groups.map(g => `<optgroup label="${esc(g)}">` + cat.filter(c => c.group === g).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('') + '</optgroup>').join('')}</select></label>` +
        `<button type="button" class="chip-btn primary" data-act="ed-add">Dodaj</button><button type="button" class="chip-btn" data-act="ed-add-open" data-v="0">Anuluj</button></div>`;
    } else h += `<button type="button" class="chip-btn" data-act="ed-add-open" data-v="1">${PLUS}Dodaj ćwiczenie</button>`;
  }
  const err = { name: 'Wpisz nazwę bloku.', items: 'Dodaj co najmniej jedno ćwiczenie.', num: 'Sprawdź liczby: serie, sekundy i przerwy to liczby całkowite.' }[ui.edErr] || '';
  h += `<p class="wq-h${err ? ' is-err' : ''}" id="ed-h"${err ? ' role="alert"' : ''}>${esc(err || (ed.kind === 'timed' ? 'Ćwiczenia z zegarem prowadzi odtwarzacz: głos, sygnały i przerwy.' : ''))}</p>`;
  h += `<button type="button" class="go" data-act="ed-save">Zapisz blok</button><div class="choices"><button type="button" class="chip-btn" data-act="ed-cancel">Anuluj</button></div></form>`;
  return h;
}

Object.assign(V, { chartsRunHTML, chartsClimbHTML, phaseLine, proposalsHTML, challengesHTML, recordsHTML, todayBlocksHTML, weekHTML, logFormHTML, libraryHTML, editorHTML, blockSummary: summary, entryDetail: detail, ttape });
if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
