/* Widoki HTML: Dziś, Tydzień, Dziennik, Postęp, Więcej (Waga, Rehabilitacja, Ustawienia) i pasek postępu w nagłówku (czyste funkcje, bez DOM). */
(function (G) {
'use strict';
const PL = G.PLAN;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pad = n => (n < 10 ? '0' : '') + n;
const painLevel = p => (p == null ? '' : p <= 3 ? 'ok' : p <= 5 ? 'warn' : 'bad');
const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};
const dni = n => n + ' ' + plural(n, 'dzień', 'dni', 'dni');
const SHORTMON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const dayMon = d => { const x = PL.parse(d); return x.getDate() + ' ' + SHORTMON[x.getMonth()]; };
const longNoDay = d => { const x = PL.parse(d); return x.getDate() + ' ' + PL.MONTHS[x.getMonth()]; };

const ICON = {
  check: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flame: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.6 1.2c.3 2.1-.8 3.2-1.9 4.4C5.5 6.9 4.2 8.3 4.2 10.4A3.8 3.8 0 008 14.6a3.8 3.8 0 003.8-4.2c-.1-1.6-.9-2.6-1.6-3.4.1 1.2-.3 2-1.1 2.4.4-2.6-.1-5.6-.5-8.2z" fill="currentColor"/></svg>',
  peak: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 13.5L6 5l2.6 4.6L10.3 7l4.2 6.5z" fill="currentColor"/><path d="M6 5V1.8l3 1.1L6 4" fill="currentColor"/></svg>',
  star: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.3-3 4.4-.5z" fill="currentColor"/></svg>',
  sun: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 1.3v2M8 12.7v2M1.3 8h2M12.7 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  pulse: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8.5h3l1.6-4 2.6 8 1.8-5 1 1h3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3L2.5 6.5 6 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 6.5h6.2a4.2 4.2 0 010 8.4H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  ring: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="10.2" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  x: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  chev: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 4.5h10.4M6.3 4.5V2.9h3.4v1.6M4.3 4.5l.6 8.6h6.2l.6-8.6M6.7 7v3.6M9.3 7v3.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const BADGE_ICON = {
  pierwszy: 'star', pelny: 'sun', dni3: 'flame', dni7: 'flame', dni14: 'flame', dni30: 'flame', poranek: 'sun', bol: 'pulse',
  powrot: 'back', faza2: 'peak', faza3: 'peak', faza4: 'peak', faza5: 'peak', szczebel5: 'ring', sesje25: 'check', sesje50: 'check', sesje100: 'check',
  bieg1: 'star', wspin1: 'peak', palce1: 'pulse', tydzien: 'sun', km50: 'flame', km100: 'flame', wspin10: 'peak'
};
const BLK = () => G.BLOCKS;
const kg1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const signedKg = v => (Math.abs(v) < 0.05 ? 'bez zmian' : (v > 0 ? '+' : '\u2212') + kg1(Math.abs(v)) + ' kg');
const dayMonY = (d, today) => dayMon(d) + (today && d.slice(0, 4) !== today.slice(0, 4) ? ' ' + d.slice(0, 4) : '');
const relDay = (d, today) => (d === today ? 'dziś' : d === PL.addDays(today, -1) ? 'wczoraj' : today && d.slice(0, 4) !== today.slice(0, 4) ? dayMonY(d, today) : PL.DSHORT[PL.dow(d)].toLowerCase() + ' ' + dayMon(d));
const ago = (d, today) => { const n = PL.diff(d, today); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : dni(n) + ' temu'; };
const pomiary = n => n + ' ' + plural(n, 'pomiar', 'pomiary', 'pomiarów');
const gtag = (name, cls) => `<span class="gtag ${PL.gradeBand(name)}${cls ? ' ' + cls : ''}"><span>${esc(name)}</span></span>`;
const tape = ph => `<span class="tape" style="--c:var(${PL.PHASES[ph].c})"><span>${PL.PHASES[ph].tape}</span></span>`;
// Nagłówek podstrony z zakładki Więcej: przycisk powrotu nad tytułem.
function subHead(eyebrow, title) {
  return `<header class="t-head"><button type="button" class="back-btn" data-act="tab" data-v="wiecej">${ICON.left}Więcej</button><p class="eyebrow">${esc(eyebrow)}</p><h1 class="t-title">${esc(title)}</h1></header>`;
}
function sessPreview(s) { return (PL.SPTS[s.id] || 10) + PL.PAIN_PTS; }
function bar(pct, cls) { return `<span class="bar${cls ? ' ' + cls : ''}" aria-hidden="true"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 1000) / 10}%"></i></span>`; }
function gradeLine(g) {
  return g.next ? `Jeszcze <b>${g.toNext} pkt</b> do ${esc(g.next)}` : 'Najwyższy poziom w atlasie';
}

// ---------- nagłówek ----------
// Poziom biegania: etykieta w stylu wyceny, w kolorze biegu.
const rtag = (name, cls) => `<span class="gtag rtag${cls ? ' ' + cls : ''}"><span>${esc(name)}</span></span>`;
function headChip(prog) {
  const c = prog.climb, r = prog.run;
  return `<button type="button" class="hp" data-act="tab" data-v="postep" aria-label="Wspinanie ${esc(c.name)}, bieganie ${esc(r.name)}, ${prog.total} pkt, ${dni(prog.streak)} z rzędu. Otwórz postęp">` +
    gtag(c.name) + rtag(r.short) + `<span class="hp-pts"><b>${prog.total}</b> pkt</span>` +
    `<span class="hp-streak${prog.streak ? '' : ' is-zero'}">${ICON.flame}${prog.streak}</span></button>`;
}
function levelLine(l) { return l.top ? 'Najwyższy poziom' : `Jeszcze <b>${l.toNext} pkt</b> do ${esc(l.next)}`; }
// Prawdziwa forma: wspinanie z najtrudniejszej drogi w 30 dni, bieganie z przewidywanego półmaratonu.
const HM_GOAL = 80 * 60;
function climbFormText(st, today) {
  const f = BLK() && BLK().climbForm(st, today);
  return f ? `Forma: najtrudniejsza droga w 30 dni <b>${esc(f.grade)}</b> (${esc(relDay(f.d, today))})` : 'Forma: zapisz wspinanie z wyceną najtrudniejszej drogi.';
}
function runFormText(st, today) {
  const f = BLK() && BLK().runForm(st, today);
  if (!f) return 'Forma: zapisz bieg od 3 km z czasem, a policzę przewidywany półmaraton.';
  const gap = f.hm - HM_GOAL;
  return `Forma: przewidywany półmaraton <b>${BLK().fmtDur(f.hm)}</b>` + (gap > 0 ? `, do 1:20 brakuje ${BLK().fmtDur(gap)}` : ', cel 1:20 w zasięgu') +
    ` <small>(z biegu ${BLK().fmtKm(f.km)} km w ${BLK().fmtDur(f.sec)}, ${esc(relDay(f.d, today))})</small>`;
}

// ---------- Dziś ----------
function todayHTML(st, today, sync, now, prog, ui) {
  const dp = PL.dayPlan(today, st), P = PL.PHASES[dp.phase];
  const until = PL.diff(today, st.start);
  const dateLine = dp.practice ? 'Dziś ' + PL.longDate(today) : cap(PL.longDate(today));
  const title = dp.practice ? (until === 1 ? 'Start jutro' : 'Start ' + longNoDay(st.start)) : 'Trening dnia';
  const dayTxt = P.len ? 'dzień treningowy ' + (dp.day + 1) + ' z ok. ' + P.len : 'na stałe';
  let h = `<header class="t-head"><p class="eyebrow">${esc(dateLine)}</p><h1 class="t-title">${esc(title)}</h1>` +
    `<p class="phase-meta">${tape(dp.phase)}<span>${esc(P.name.replace(/^Faza \d · |^Na stałe · /, ''))} · ${esc(dayTxt)}${dp.phase === 4 ? ' · szczebel ' + st.rung + ' z 5' : ''}</span></p></header>`;

  // alerty
  if (dp.practice) h += `<div class="alert info"><p>Do startu możesz przećwiczyć sesję i sprawdzić zegar. Próbne sesje się nie zapisują. Datę startu zmienisz w zakładce Plan.</p></div>`;
  const br = dp.practice ? null : PL.breakInfo(st, today);
  if (br) {
    const day = PL.phaseDay(st, today) + 1;
    h += `<div class="alert ask"><p><b>Ostatni trening: ${esc(longNoDay(br.last))}, ${dni(br.days)} temu.</b> Plan liczy dni, w które trenujesz, więc po przerwie czeka tam, gdzie skończyłeś. Możesz też zacząć od nowa, od najlżejszych dawek.</p><div class="choices">` +
      `<button type="button" class="chip-btn primary" data-act="break-continue">Kontynuuj od dnia ${day}</button>` +
      `<button type="button" class="chip-btn" data-act="go-restart">Zacznij od nowa…</button>` +
      (dp.phase > 1 ? `<button type="button" class="chip-btn" data-act="back">Cofnij się o fazę</button>` : '') + `</div></div>`;
  }
  if (!dp.practice && !st.morning[today] && PL.hasLog(st, PL.addDays(today, -1))) {
    h += `<div class="alert ask"><p><b>Jak bark dziś rano, po wczorajszym treningu?</b> <span class="pts-hint">+${PL.MORNING_PTS} pkt</span></p><div class="choices">
<button type="button" class="chip-btn ok" data-act="morning" data-v="green"><i></i>Jak zwykle</button>
<button type="button" class="chip-btn warn" data-act="morning" data-v="yellow"><i></i>Trochę gorzej</button>
<button type="button" class="chip-btn bad" data-act="morning" data-v="red"><i></i>Gorzej i nie mija</button></div></div>`;
  }
  if (dp.advice) h += `<div class="alert ${dp.advice.level}"><p>${esc(dp.advice.text)}</p></div>`;
  const gateDue = !dp.practice && P.len && dp.day >= P.len && !(st.snooze && PL.diff(today, st.snooze) > 0);
  if (gateDue) {
    h += `<div class="alert ask"><p><b>Za Tobą typowa liczba dni tej fazy.</b> Sprawdź progi: jeśli wszystkie spełniasz, przejdź dalej i zgarnij +${PL.PHASE_PTS[dp.phase + 1] || 0} pkt; jeśli nie, zostań jeszcze tydzień.</p><div class="choices"><button type="button" class="chip-btn primary" data-act="open-gates">Sprawdź progi</button><button type="button" class="chip-btn" data-act="snooze">Zostaję jeszcze tydzień</button></div></div>`;
  }

  h += weightQuickHTML(st, today, ui || {}, 'wq', true);
  if (API.todayBlocksHTML) h += API.todayBlocksHTML(st, today, prog);

  // sesje rehabilitacji
  h += '<h2 class="sub-h">Rehabilitacja barku</h2>';
  const firstOpen = dp.practice ? 0 : dp.sessions.findIndex(s => !PL.isDone(st, today, s.id));
  h += '<div class="sessions">';
  dp.sessions.forEach((s, i) => {
    const lg = !dp.practice && st.log[today] && st.log[today][s.id];
    const done = !!(lg && lg.done);
    const mins = Math.round(PL.seconds(s) / 60);
    const list = [];
    s.blocks.forEach(b => { const nm = /^izo-/.test(b.ex) ? 'Izometria w 5 kierunkach' : PL.NAMES[b.ex]; if (list.indexOf(nm) < 0) list.push(nm); });
    let wait = '';
    if (!dp.practice && !done && s.id === 'wieczor') {
      const am = st.log[today] && st.log[today].rano;
      if (am && am.done && am.at && now && now < am.at + 6 * 3600e3) {
        const t = new Date(am.at + 6 * 3600e3);
        wait = `<p class="sess-wait">Najlepiej po ${pad(t.getHours())}:${pad(t.getMinutes())}, 6 h po porannej sesji.</p>`;
      }
    }
    const pts = done ? (prog.byEntry[today + '|' + s.id] || 0) : sessPreview(s);
    const state = done ? `<p class="sess-state ${painLevel(lg.pain)}">${ICON.check}${lg.partial ? 'Przerwane' : 'Zrobione'}${lg.pain != null ? ' · ból ' + lg.pain + '/10' : ''}</p>` : '';
    const btn = dp.practice ? 'Wypróbuj teraz' : done ? 'Zrób jeszcze raz' : 'Zacznij';
    const next = i === firstOpen;
    h += `<article class="sess${done ? ' is-done' : ''}${next ? ' is-next' : ''}" style="--c:var(${P.c})">
<div class="sess-top"><p class="sess-label">${esc(s.label)} · ok. ${mins} min</p><span class="sess-pts${done ? ' got' : ''}">${dp.practice ? 'próba' : (done ? '' : '+') + pts + ' pkt'}</span></div>
<h2 class="sess-title">${esc(s.title)}</h2>
<p class="sess-list">${list.map(esc).join(' · ')}</p>
${state}${wait}
<button type="button" class="go${next ? '' : ' secondary'}" data-act="start" data-s="${s.id}">${btn}</button>
</article>`;
  });
  h += '</div>';
  h += '<p class="pain-rule"><b>Ból w trakcie najwyżej 3/10</b>, a następnego ranka jak zwykle. Ostry ból, przeskakiwanie w barku albo mrowienie: przerwij i skonsultuj się.</p>';
  // wspinanie jest teraz blokiem w planie tygodnia (z przypomnieniem o barku), więc notatka rehabilitacji o nim znika
  const notes = dp.notes.filter(n => n.tag !== 'Wspinanie');
  if (notes.length) h += '<ul class="notes">' + notes.map(n => `<li><span class="note-tag">${esc(n.tag)}</span>${esc(n.text)}</li>`).join('') + '</ul>';

  // mini postęp
  const lc = prog.climb, lr = prog.run;
  h += `<section class="mini card" aria-label="Twoje poziomy"><div class="mini-main"><p class="mini-top"><b>${prog.total} pkt</b><span class="mini-streak${prog.streak ? '' : ' is-zero'}">${ICON.flame}${dni(prog.streak)} z rzędu</span></p>` +
    `<div class="mini-lv">${gtag(lc.name)}<div><p class="mini-k">Wspinanie</p>${bar(lc.pct)}<p class="mini-next">${levelLine(lc)}</p></div></div>` +
    `<div class="mini-lv">${rtag(lr.short)}<div><p class="mini-k">Bieganie</p>${bar(lr.pct, 'run')}<p class="mini-next">${levelLine(lr)}</p></div></div></div>` +
    `<button type="button" class="chip-btn" data-act="tab" data-v="postep">Postęp</button></section>`;

  // tydzień
  const base = dp.practice ? st.start : today;
  h += '<h2 class="sub-h">Najbliższe 7 dni <button type="button" class="linkish sub-link" data-act="tab" data-v="tydzien">Cały tydzień</button></h2><ol class="week">';
  for (let i = 0; i < 7; i++) {
    const d = PL.addDays(base, i), p = PL.dayPlan(d, st), wd = PL.dow(d);
    const isToday = d === today;
    const nDone = p.sessions.filter(s => PL.isDone(st, d, s.id)).length;
    const full = nDone > 0 && nDone >= p.sessions.length;
    const bl = BLK() ? BLK().dayView(st, d).filter(x => x.block && !x.skip) : [];
    const tracks = [];
    bl.forEach(x => { if (x.block.t !== 'rozc' && tracks.indexOf(x.block.t) < 0) tracks.push(x.block.t); });
    const what = tracks.length ? tracks.map(t => BLK().TRACKS[t].short).join(' ') : p.sessions[0].short;
    const label = (isToday ? 'Dziś, ' : '') + PL.longDate(d) + ': ' + bl.map(x => x.block.name).concat(p.sessions.map(s => 'rehabilitacja ' + s.label)).join(', ') + (full ? '; rehabilitacja zrobiona' : '');
    h += `<li class="day${isToday ? ' is-today' : ''}${full ? ' is-done' : ''}" aria-label="${esc(label)}"><span class="d-name">${isToday ? 'Dziś' : PL.DSHORT[wd]}</span><span class="d-num">${PL.parse(d).getDate()}</span><span class="d-what">${full ? ICON.check : ''}${esc(what)}</span>${tracks.length ? `<span class="d-extra">${esc(p.sessions[0].short)}</span>` : ''}</li>`;
  }
  h += '</ol>';
  h += `<p class="sync">${esc(sync || '')}</p>`;
  return h;
}

// ---------- Postęp ----------
function calendarHTML(st, today) {
  const t = PL.parse(today), wd = (t.getDay() + 6) % 7; // pn = 0
  const end = PL.addDays(today, 6 - wd), first = PL.addDays(end, -41);
  let h = '<div class="cal" role="table" aria-label="Kalendarz treningów, ostatnie 6 tygodni"><div class="cal-row cal-hd" role="row">' + ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(x => `<span role="columnheader">${x}</span>`).join('') + '</div>';
  for (let w = 0; w < 6; w++) {
    h += '<div class="cal-row" role="row">';
    for (let k = 0; k < 7; k++) {
      const d = PL.addDays(first, w * 7 + k), l = st.log[d] || {}, bl = (st.blog && st.blog[d]) || {};
      const ids = Object.keys(l).filter(x => l[x] && l[x].done);
      const bids = Object.keys(bl).filter(x => bl[x] && bl[x].done);
      let lv = 0;
      if (ids.length) lv = (ids.indexOf('rano') >= 0) !== (ids.indexOf('wieczor') >= 0) && ids.length === 1 ? 1 : 2;
      if (bids.length) lv = 2;
      let mx = null;
      ids.forEach(x => { if (l[x].pain != null) mx = Math.max(mx == null ? 0 : mx, l[x].pain); });
      bids.forEach(x => { if (bl[x].pain != null) mx = Math.max(mx == null ? 0 : mx, bl[x].pain); });
      const fut = d > today;
      const names = ids.map(x => l[x].label || x).concat(bids.map(x => bl[x].name));
      const lab = PL.longDate(d) + (names.length ? ': ' + names.join(', ') + (mx != null ? ', ból do ' + mx : '') : fut ? '' : ': bez treningu');
      h += `<span role="cell" class="cd l${lv}${d === today ? ' is-today' : ''}${fut ? ' is-fut' : ''}" title="${esc(lab)}" aria-label="${esc(lab)}"><em>${PL.parse(d).getDate()}</em>${mx != null ? `<i class="pd ${painLevel(mx)}"></i>` : ''}</span>`;
    }
    h += '</div>';
  }
  return h + '</div><p class="cal-key"><span class="cd l2"></span>trening <span class="cd l1"></span>część rehabilitacji <i class="pd ok"></i><i class="pd warn"></i><i class="pd bad"></i>najwyższy ból dnia</p>';
}
function painChartHTML(st, today) {
  const N = 28, pts = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = PL.addDays(today, -i), l = st.log[d] || {};
    let mx = null;
    Object.keys(l).forEach(x => { if (l[x] && l[x].done && l[x].pain != null) mx = Math.max(mx == null ? 0 : mx, l[x].pain); });
    pts.push({ d, p: mx });
  }
  if (!pts.some(x => x.p != null)) return '<p class="empty">Wykres pojawi się po pierwszych ocenach bólu po sesji.</p>';
  const W = 320, Hh = 132, x0 = 24, y0 = 10, ch = 96, bw = (W - x0 - 6) / N;
  const y = v => y0 + ch - v / 10 * ch;
  let s = `<svg class="painchart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Najwyższy ból dnia z ostatnich 4 tygodni">`;
  s += `<rect x="${x0}" y="${y(3)}" width="${W - x0 - 6}" height="${y(0) - y(3)}" class="pc-zone"/>`;
  [0, 3, 6, 10].forEach(v => { s += `<line x1="${x0}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="pc-grid${v === 3 ? ' lim' : ''}"/><text x="${x0 - 6}" y="${y(v) + 3.5}" class="pc-t" text-anchor="end">${v}</text>`; });
  pts.forEach((q, i) => {
    if (q.p == null) return;
    const cx = x0 + i * bw + bw / 2, hgt = Math.max(2.5, y(0) - y(q.p));
    s += `<rect x="${(cx - bw * 0.32).toFixed(1)}" y="${(y(0) - hgt).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${hgt.toFixed(1)}" rx="1.5" class="pc-bar ${painLevel(q.p)}"><title>${esc(PL.longDate(q.d))}: ${q.p}/10</title></rect>`;
  });
  [0, 14, 27].forEach(i => { s += `<text x="${(x0 + i * bw + bw / 2).toFixed(1)}" y="${Hh - 6}" class="pc-t" text-anchor="${i === 0 ? 'start' : i === 27 ? 'end' : 'middle'}">${esc(i === 27 ? 'dziś' : dayMon(pts[i].d))}</text>`; });
  return s + '</svg><p class="pc-key">Zielone pole to bezpieczny zakres w trakcie ćwiczeń: ból do 3/10.</p>';
}
function progressHTML(st, today, prog) {
  const lc = prog.climb, lr = prog.run;
  const top = PL.GRADES.findIndex(x => x[0] === '7c');
  let h = `<header class="t-head"><p class="eyebrow">Postęp</p><h1 class="t-title">Droga do 7c i 1:20</h1></header>`;
  h += `<div class="lvls"><section class="hero card lvl">${gtag(lc.name, 'xl')}<div class="hero-main"><p class="eyebrow">Wspinanie</p><p class="hero-pts"><b>${lc.pts}</b> pkt</p>${bar(lc.pct, 'lg')}<p class="hero-next">${levelLine(lc)}</p><p class="lvl-form">${climbFormText(st, today)}</p></div></section>` +
    `<section class="hero card lvl lvl-run">${rtag(lr.short, 'xl')}<div class="hero-main"><p class="eyebrow">Bieganie · ${esc(lr.name)}</p><p class="hero-pts"><b>${lr.pts}</b> pkt</p>${bar(lr.pct, 'lg run')}<p class="hero-next">${levelLine(lr)}</p><p class="lvl-form">${runFormText(st, today)}</p></div></section></div>`;
  if (BLK()) {
    const pc = BLK().paces(st, today);
    h += `<section class="card paces"><h2 class="w-h2">Tempa treningowe</h2>` + (pc
      ? `<p class="lvl-form">Z testu 5 km: ${esc(BLK().fmtDur(pc.test.sec))} (${esc(relDay(pc.test.d, today))}), ${BLK().fmtPace(pc.pace)}/km.</p><table class="pc-t2"><tbody>` +
        ['easy', 'steady', 'tempo', 'interval', 'strides'].map(z => `<tr><th scope="row">${esc(cap(pc.zones[z].name))}</th><td>${BLK().fmtPace(pc.zones[z].lo)}–${BLK().fmtPace(pc.zones[z].hi)}/km</td></tr>`).join('') + '</tbody></table>'
      : `<p class="lvl-form">Policzę je z testu 5 km (blok „Test 5 km” w bibliotece; dodaj go w Tygodniu na wybrany dzień). Do tego czasu biegaj spokojnie, na rozmowę.</p>`) + '</section>';
  }
  h += `<p class="lvl-note">Razem <b>${prog.total} pkt</b>. Poziom wspinania rośnie za wspinanie, palce i siłę, biegania za biegi (z ich wyzwaniami i rekordami). Rehabilitacja, rozciąganie i serie dni liczą się do sumy. Poziomy startowe zmienisz w Ustawieniach.</p>`;
  const hrs = Math.floor(prog.minutes / 60), mins = prog.minutes % 60;
  const all = prog.sessions + (prog.blocks || 0);
  h += `<div class="stats"><div class="stat"><b>${all}</b><span>${plural(all, 'trening', 'treningi', 'treningów')}</span></div><div class="stat"><b>${prog.streak}</b><span>dni z rzędu</span></div><div class="stat"><b>${prog.best}</b><span>najdłuższa seria dni</span></div><div class="stat"><b>${hrs ? hrs + ' h ' : ''}${mins} min</b><span>czasu treningu</span></div></div>`;
  if (BLK()) {
    const ws = BLK().weekStats(st, today);
    h += `<h2 class="sub-h">Ten tydzień</h2><section class="card wsum"><dl class="wsum-dl"><div><dt>Biegi</dt><dd><b>${ws.runs}</b>/${BLK().WEEK_RUNS}</dd></div><div><dt>Wspinanie</dt><dd><b>${ws.climbs}</b>/${BLK().WEEK_CLIMBS}</dd></div><div><dt>Kilometry</dt><dd><b>${BLK().fmtKm(ws.km)}</b></dd></div>` +
      `<div><dt>Pełny tydzień</dt><dd>${ws.full ? 'zaliczony' : '+' + BLK().WEEK_PTS + ' pkt'}</dd></div></dl><button type="button" class="chip-btn" data-act="tab" data-v="tydzien">Plan tygodnia</button></section>`;
    h += `<div class="stats stats-3"><div class="stat"><b>${BLK().fmtKm(prog.km || 0)}</b><span>km biegu łącznie</span></div><div class="stat"><b>${prog.climbs || 0}</b><span>${plural(prog.climbs || 0, 'wspinanie', 'wspinania', 'wspinań')}</span></div><div class="stat"><b>${(prog.chDone || []).length}</b><span>zaliczone wyzwania</span></div></div>`;
    if (API.challengesHTML) h += `<h2 class="sub-h">Wyzwania tygodnia</h2>${API.challengesHTML(BLK().challenges(st, BLK().weekStart(today)), {})}<h2 class="sub-h">Rekordy</h2>${API.recordsHTML(st, today)}`;
  }
  // drogi: wspinanie od poziomu startowego do 7c, bieganie od startu do 1:20
  const cFrom = lc.base, cTo = Math.max(top, lc.i);
  h += `<h2 class="sub-h">Droga wspinania</h2><div class="route" style="--n:${cTo - cFrom + 1}" role="img" aria-label="Wspinanie: poziom ${esc(lc.name)} na drodze od ${esc(PL.GRADES[cFrom][0])} do ${esc(PL.GRADES[cTo][0])}">`;
  for (let i = cFrom; i <= cTo; i++) {
    const nm = PL.GRADES[i][0];
    const f = i < lc.i ? 1 : i === lc.i ? (lc.top ? 1 : lc.pct) : 0;
    h += `<span class="rs ${PL.gradeBand(nm)}${i === lc.i ? ' cur' : ''}${i < lc.i ? ' done' : ''}"><i style="width:${Math.round(f * 100)}%"></i><em>${esc(nm)}</em></span>`;
  }
  h += '</div>';
  h += `<h2 class="sub-h">Droga biegania</h2><div class="route route-run" style="--n:${PL.RUN_LEVELS.length - lr.base}" role="img" aria-label="Bieganie: poziom ${esc(lr.name)} na drodze do 1:20">`;
  for (let i = lr.base; i < PL.RUN_LEVELS.length; i++) {
    const f = i < lr.i ? 1 : i === lr.i ? (lr.top ? 1 : lr.pct) : 0;
    h += `<span class="rs rr${i === lr.i ? ' cur' : ''}${i < lr.i ? ' done' : ''}"><i style="width:${Math.round(f * 100)}%"></i><em>${esc(PL.RUN_LEVELS[i][1])}</em></span>`;
  }
  h += '</div>';
  if (API.chartsRunHTML) h += `<h2 class="sub-h">Bieganie w liczbach</h2>${API.chartsRunHTML(st, today)}<h2 class="sub-h">Wspinanie w liczbach</h2>${API.chartsClimbHTML(st, today)}`;
  // odznaki
  const got = prog.badges.filter(b => b.d).length;
  h += `<h2 class="sub-h">Odznaki <span class="sub-count">${got} z ${prog.badges.length}</span></h2><ul class="badges">`;
  prog.badges.slice().sort((a, b) => (b.d ? 1 : 0) - (a.d ? 1 : 0)).forEach(b => {
    h += `<li class="badge${b.d ? ' got' : ''}"><span class="b-ico">${ICON[BADGE_ICON[b.id] || 'star']}</span><span class="b-txt"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span>${b.d ? `<span class="b-date">${esc(dayMon(b.d))}</span>` : ''}</span></li>`;
  });
  h += '</ul>';
  h += weightCardHTML(st, today);
  h += `<h2 class="sub-h">Ból po sesjach</h2>${painChartHTML(st, today)}`;
  // progi
  const ph = st.phase;
  h += `<h2 class="sub-h" id="gates-h">Przejście do następnej fazy</h2><section class="card gates-card">`;
  if (PL.GATES[ph]) {
    const gg = st.gates[ph] || [];
    h += `<p class="pg-lead">${tape(ph)} Do kolejnej fazy przechodzisz, gdy spełniasz wszystkie progi:</p><ul class="gates">`;
    PL.GATES[ph].forEach((t, i) => { h += `<li><label><input type="checkbox" data-act="gate" data-i="${i}"${gg[i] ? ' checked' : ''}><span>${esc(t)}</span></label></li>`; });
    const all = PL.GATES[ph].every((t, i) => gg[i]);
    h += `</ul><div class="choices"><button type="button" class="chip-btn primary" data-act="advance"${all ? '' : ' disabled'}>Przejdź: ${esc(PL.PHASES[ph + 1].name)} · +${PL.PHASE_PTS[ph + 1]} pkt</button>${ph > 1 ? '<button type="button" class="chip-btn" data-act="back">Wróć do poprzedniej fazy</button>' : ''}</div>`;
  } else h += `<p class="pg-lead">Plan główny ukończony. Dwa krótkie treningi w tygodniu utrzymują bark w formie.</p><div class="choices"><button type="button" class="chip-btn" data-act="back">Wróć do Fazy 4</button></div>`;
  if (ph === 4) h += `<p class="pg-rung">Szczebel drabinki: <b>${st.rung} z 5</b> · treningi bez bólu na tym szczeblu: ${st.rungGreen}/2. Po dwóch wchodzisz wyżej sam (+${PL.RUNG_PTS} pkt).</p>`;
  h += '</section>';
  // zasady punktów
  const TRS = BLK() ? BLK().TRACKS : {};
  h += `<details class="how card"><summary>Jak zdobywasz punkty</summary><table class="how-t"><tbody>
${Object.keys(TRS).map(t => `<tr><td>Blok: ${esc(TRS[t].name.toLowerCase())}</td><td>${TRS[t].pts}</td></tr>`).join('')}
${BLK() ? `<tr><td>Ocena wysiłku albo bólu przy bloku</td><td>+${BLK().RATE_PTS}</td></tr><tr><td>Wyzwanie tygodnia (pełny tydzień +${BLK().WEEK_PTS})</td><td>+10 do +25</td></tr><tr><td>Pobity rekord</td><td>+${BLK().REC_PTS}</td></tr>` : ''}
<tr><td>Sesja rehabilitacji rano lub po pracy (Faza 1)</td><td>${PL.SPTS.rano}</td></tr>
<tr><td>Lekki dzień</td><td>${PL.SPTS.lekki}</td></tr>
<tr><td>Trening siłowy</td><td>${PL.SPTS.sila}</td></tr>
<tr><td>Drabinka zwisów (Faza 4)</td><td>${PL.SPTS.drabinka}</td></tr>
<tr><td>Przerwana sesja</td><td>połowa</td></tr>
<tr><td>Ocena bólu po sesji (każda wartość, także wysoka)</td><td>+${PL.PAIN_PTS}</td></tr>
<tr><td>Poranna ocena barku</td><td>+${PL.MORNING_PTS}</td></tr>
<tr><td>Dni z rzędu (każdy trening): ${PL.STREAK.map(x => x[0]).join(', ')}</td><td>${PL.STREAK.map(x => '+' + x[1]).join(', ')}</td></tr>
<tr><td>Powrót po co najmniej 5 dniach przerwy</td><td>+${PL.COMEBACK_PTS}</td></tr>
<tr><td>Nowa faza po spełnieniu progów</td><td>${[2, 3, 4, 5].map(p => '+' + PL.PHASE_PTS[p]).join(', ')}</td></tr>
<tr><td>Nowy szczebel drabinki</td><td>+${PL.RUNG_PTS}</td></tr>
</tbody></table><p class="how-note">Punkty nigdy nie zależą od tego, jak mało boli. Lekki dzień po czerwonym poranku liczy się tak samo jak każdy inny.</p></details>`;
  return h;
}

// ---------- Waga ----------
// Wiersz „Waga dziś”: pole do wpisania albo zapisany pomiar. Ten sam na zakładkach Dziś (pfx wq) i Waga (pfx ww).
// Przyciski mają type="button", a zapis idzie przez kliknięcie i Enter obsłużone w trenerze:
// w ramce bez uprawnienia allow-forms przeglądarka nie wysyła zdarzenia submit.
function weightQuickHTML(st, today, ui, pfx, link) {
  const ws = PL.weightStats(st, today);
  const has = !!ws && ws.today != null;
  const id = pfx + '-kg';
  if (has && !ui.wEdit) {
    return `<section class="wq card is-set" aria-label="Waga dziś"><p class="wq-l">Waga dziś</p><p class="wq-v"><b>${kg1(ws.today)}</b> kg</p>` +
      `<p class="wq-h">Średnia z 7 dni: ${kg1(ws.avg)} kg.${link ? ' <button type="button" class="linkish" data-act="tab" data-v="waga">Wykres</button>' : ''}</p>` +
      `<button type="button" class="chip-btn" data-act="w-edit">Zmień</button></section>`;
  }
  const err = ui.wErr === 'today';
  const hint = err ? 'Wpisz wagę w kilogramach, np. 66,4.'
    : has ? 'Zapisane dziś: ' + kg1(ws.today) + ' kg.'
    : ws ? 'Ostatnio ' + kg1(ws.last.kg) + ' kg, ' + ago(ws.last.d, today) + '.'
    : 'Waż się rano, po toalecie, przed jedzeniem: wtedy pomiary da się porównać.';
  return `<form class="wq card${has ? ' is-edit' : ''}" data-form="weight-today" novalidate><label class="wq-l" for="${id}">Waga dziś</label>` +
    `<span class="wq-f"><input class="wq-i" id="${id}" name="kg" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="8" placeholder="00,0" value="${esc(ui.wToday || '')}" aria-describedby="${id}-h"${err ? ' aria-invalid="true"' : ''}><span class="wq-u" aria-hidden="true">kg</span></span>` +
    `<button type="button" class="chip-btn primary" data-act="w-submit" data-v="today">Zapisz</button>${has ? `<button type="button" class="icon-btn" data-act="w-cancel" aria-label="Anuluj zmianę">${ICON.x}</button>` : ''}` +
    `<p class="wq-h${err ? ' is-err' : ''}" id="${id}-h"${err ? ' role="alert"' : ''}>${esc(hint)}${!err && ws && link ? ' <button type="button" class="linkish" data-act="tab" data-v="waga">Wykres</button>' : ''}</p></form>`;
}
// Teksty odczytu nad wykresem (domyślnie ostatni pomiar, przy wskazaniu punktu: ten punkt).
function weightReadout(p, today) { return { when: relDay(p.d, today), kg: kg1(p.kg) + ' kg', avg: kg1(p.avg) + ' kg' }; }
// Wykres: punkty to pomiary (szare, w tle), linia to średnia z 7 dni (jedyny kolor), przerywana linia to cel.
// Rysowany w rzeczywistych pikselach dla podanej szerokości, żeby tekst i kreski nie skalowały się z ekranem.
function weightChart(st, today, range, width) {
  const win = PL.weightWindow(st, today, range);
  if (!win || win.empty) return null;
  const W = Math.max(240, Math.min(1200, Math.round(width || 326)));
  const H = W < 400 ? 200 : W < 620 ? 232 : 260;
  const goal = typeof st.weightGoal === 'number' ? st.weightGoal : null;
  let lo = Infinity, hi = -Infinity;
  win.points.forEach(p => { lo = Math.min(lo, p.kg, p.avgRaw); hi = Math.max(hi, p.kg, p.avgRaw); });
  let goalIn = false;
  if (goal != null) {
    goalIn = Math.max(hi, goal) - Math.min(lo, goal) <= Math.max(8, (hi - lo) * 3);
    if (goalIn) { lo = Math.min(lo, goal); hi = Math.max(hi, goal); }
  }
  const padv = Math.max(0.2, (hi - lo) * 0.08);
  lo -= padv; hi += padv;
  if (hi - lo < 2) { const mid = (lo + hi) / 2; lo = mid - 1; hi = mid + 1; }
  const y0 = 14, y1 = H - 28;
  // oś Y nie zaczyna się od zera (to linia, nie słupki): okrągłe wartości wewnątrz zakresu danych
  const maxT = Math.max(2, Math.floor((y1 - y0) / 34));
  let step = 50;
  [0.5, 1, 2, 5, 10, 20, 50].some(k => { step = k; return Math.floor(hi / k + 1e-9) - Math.ceil(lo / k - 1e-9) + 1 <= maxT; });
  const tl = v => (step < 1 ? kg1(v) : String(Math.round(v)));
  const ticks = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) ticks.push(v);
  const endT = kg1(win.cur.avg);
  const fs = W >= 600 ? 11.5 : 10.5, cw = fs * 0.61; // rozmiar podpisów i szerokość znaku pisma o stałej szerokości
  const x0 = Math.round(12 + Math.max.apply(null, ticks.map(v => tl(v).length).concat(2)) * cw), x1 = W - Math.round(16 + endT.length * cw * 1.15);
  const span = Math.max(1, PL.diff(win.from, win.to));
  const pxDay = (x1 - x0) / span;
  const X = d => x0 + PL.diff(win.from, d) * pxDay;
  const Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
  const f = v => String(Math.round(v * 10) / 10);
  let s = `<svg class="wc-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-size="${fs}" aria-hidden="true" focusable="false">` +
    `<defs><clipPath id="wc-clip"><rect x="${x0}" y="${y0 - 3}" width="${W - x0}" height="${y1 - y0 + 6}"/></clipPath></defs>` +
    `<line class="wc-grid" x1="${x0}" x2="${x1}" y1="${y1 + 0.5}" y2="${y1 + 0.5}"/>`;
  ticks.forEach(v => {
    const y = Math.round(Y(v)) + 0.5;
    s += `<line class="wc-grid" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/><text class="wc-t" x="${x0 - 8}" y="${y + 3.5}" text-anchor="end">${tl(v)}</text>`;
  });
  // oś X: od prawej (dziś) wstecz, w odstępach, w których podpisy się mieszczą
  let iv = 365;
  [1, 2, 7, 14, 30, 61, 91, 182, 365].some(k => { iv = k; return k * pxDay >= 54; });
  for (let k = 0; k * iv <= span; k++) {
    const d = PL.addDays(win.to, -k * iv), x = Math.round(X(d)) + 0.5;
    const lab = k === 0 && win.to === today ? 'dziś' : span > 330 ? SHORTMON[PL.parse(d).getMonth()] + ' ' + d.slice(2, 4) : dayMon(d);
    s += `<line class="wc-grid" x1="${x}" x2="${x}" y1="${y1}" y2="${y1 + 5}"/><text class="wc-t" x="${k === 0 ? x1 : x}" y="${y1 + 19}" text-anchor="${k === 0 ? 'end' : 'middle'}">${esc(lab)}</text>`;
  }
  // cel
  if (goal != null && goalIn) {
    const gy = Math.round(Y(goal)) + 0.5;
    s += `<line class="wc-goal" x1="${x0}" x2="${x1}" y1="${gy}" y2="${gy}"/><text class="wc-gt" x="${x0 + 6}" y="${gy - 16 >= y0 ? gy - 6 : gy + 14}">cel ${kg1(goal)}</text>`;
  } else if (goal != null) {
    s += `<text class="wc-gt" x="${x0 + 6}" y="${goal > hi ? y0 + 12 : y1 - 8}">cel ${kg1(goal)} kg ${goal > hi ? 'wyżej' : 'niżej'}</text>`;
  }
  // pomiary
  const r = pxDay >= 9 ? 3.2 : pxDay >= 4.5 ? 2.7 : 2.2;
  const pts = win.points.map(p => ({ x: X(p.d), yd: Y(p.kg), ya: Y(p.avgRaw), d: p.d, kg: p.kg, avg: p.avg }));
  pts.forEach(p => { s += `<circle class="wc-dot" cx="${f(p.x)}" cy="${f(p.yd)}" r="${r}"/>`; });
  // średnia z 7 dni: przerwa w linii, gdy między pomiarami minęły ponad 2 tygodnie
  let path = '', pv = null;
  (win.prev ? [win.prev] : []).concat(win.points).forEach(p => {
    path += (pv && PL.diff(pv.d, p.d) <= 14 ? 'L' : 'M') + f(X(p.d)) + ' ' + f(Y(p.avgRaw));
    pv = p;
  });
  const e = pts[pts.length - 1];
  s += `<path class="wc-line" d="${path}" clip-path="url(#wc-clip)"/>` +
    `<circle class="wc-end" cx="${f(e.x)}" cy="${f(e.ya)}" r="4.5"/><text class="wc-et" x="${f(e.x + 10)}" y="${f(e.ya + 4)}">${endT}</text>` +
    `<g class="wc-hover" style="display:none"><line class="wc-cross" y1="${y0}" y2="${y1}"/><circle class="wc-hd" r="5"/><circle class="wc-ha" r="5.5"/></g></svg>`;
  return { svg: s, W, H, pts, win };
}
function weightHTML(st, today, ui, sync) {
  const ws = PL.weightStats(st, today);
  const range = ui.wRange === 90 ? 90 : ui.wRange === 0 ? 0 : 30;
  const win = PL.weightWindow(st, today, range);
  const goal = ws ? ws.goal : (typeof st.weightGoal === 'number' ? st.weightGoal : null);
  let h = subHead('Waga', 'Pomiar i trend');
  h += weightQuickHTML(st, today, ui, 'ww', false);
  // zakres: jeden wiersz nad wszystkim, czego dotyczy (wykres, zmiana, lista pomiarów)
  if (ws) h += `<div class="wseg" role="group" aria-label="Zakres">` + [[30, '30 dni'], [90, '90 dni'], [0, 'Wszystko']].map(o =>
    `<button type="button" data-act="w-range" data-v="${o[0]}" aria-pressed="${o[0] === range ? 'true' : 'false'}">${o[1]}</button>`).join('') + `</div>`;
  h += `<div class="w-grid"><section class="card wcard" aria-labelledby="wc-h">`;
  if (!ws) {
    h += `<p class="eyebrow" id="wc-h">Wykres</p><p class="empty">Wpisz pierwszy pomiar. Tu pojawi się wykres, a po kilku dniach także linia średniej z 7 dni.</p>`;
  } else {
    const stale = PL.diff(ws.last.d, today) > 1;
    h += `<div class="w-head"><div class="w-now"><p class="eyebrow" id="wc-h">Średnia z 7 dni</p><p class="w-big"><b>${kg1(ws.avg)}</b> kg</p>` +
      (stale ? `<p class="w-asof">ostatni pomiar: ${esc(dayMonY(ws.last.d, today))}</p>` : '') + `</div><dl class="w-deltas">`;
    if (win && !win.empty && win.delta != null) {
      let dir = '';
      if (goal != null) {
        const was = Math.abs(win.ref.avg - goal), is = Math.abs(win.cur.avg - goal);
        dir = is < was - 0.05 ? ' · bliżej celu' : is > was + 0.05 ? ' · dalej od celu' : '';
      }
      h += `<div><dt>${win.exact ? 'w ' + range + ' dni' : 'od ' + esc(dayMonY(win.ref.d, today))}${dir}</dt><dd>${signedKg(win.delta)}</dd></div>`;
    }
    if (goal != null) {
      const left = Math.round((ws.avg - goal) * 10) / 10;
      const reached = Math.abs(left) < 0.05 || (ws.first.kg > goal ? left < 0 : ws.first.kg < goal ? left > 0 : false);
      h += `<div><dt>${reached ? 'cel' : 'do celu'} ${kg1(goal)} kg</dt><dd>${reached ? 'osiągnięty' : kg1(Math.abs(left)) + ' kg'}</dd></div>`;
    }
    h += `</dl></div>`;
    if (!win || win.empty) {
      h += `<p class="empty">Brak pomiarów w tym okresie. Ostatni: ${esc(dayMonY(ws.last.d, today))}, ${kg1(ws.last.kg)} kg. Starsze zobaczysz po wybraniu „Wszystko”.</p>`;
    } else {
      const ro = weightReadout(win.cur, today);
      const label = `Wykres wagi, ${win.all ? 'wszystkie pomiary' : 'ostatnie ' + range + ' dni'}: ${pomiary(win.count)}, od ${kg1(win.min.kg)} do ${kg1(win.max.kg)} kg. Średnia z 7 dni: ${kg1(win.cur.avg)} kg${win.delta != null ? ', zmiana ' + signedKg(win.delta) : ''}. Strzałki w lewo i w prawo pokazują kolejne pomiary.`;
      h += `<div class="wc-read" id="wc-read" aria-live="polite"><span class="wc-k"></span><span class="wc-k"><i class="k-dot"></i>pomiar</span><span class="wc-k"><i class="k-line"></i><span>średnia<span class="wide"> z 7 dni</span></span></span>` +
        `<span class="wc-when">${esc(ro.when)}</span><b class="wc-rd">${ro.kg}</b><b class="wc-ra">${ro.avg}</b></div>` +
        `<div class="wchart" id="wchart" tabindex="0" role="img" aria-label="${esc(label)}" aria-describedby="wc-read"></div>` +
        `<p class="wc-cap">Waga waha się z dnia na dzień nawet o kilogram (woda, jedzenie, sól). O kierunku mówi linia średniej, nie pojedynczy pomiar.</p>`;
    }
  }
  h += `</section><section class="card wlist"><h2 class="w-h2">Pomiary${win && !win.empty ? ` <span class="sub-count">${win.count} w tym okresie</span>` : ''}</h2>`;
  if (win && !win.empty) {
    const rows = win.points.slice().reverse();
    const LIM = 7, shown = ui.wAll ? rows : rows.slice(0, LIM);
    h += `<table class="wtab"><thead><tr><th scope="col">Dzień</th><th scope="col" class="num">Waga</th><th scope="col" class="num">Średnia</th><th scope="col" class="act"><span class="sr-only">Usuń</span></th></tr></thead><tbody>` +
      shown.map(p => (ui.wDel === p.d
        ? `<tr class="is-del"><th scope="row">${esc(relDay(p.d, today))}</th><td colspan="3"><div class="del-row"><span class="del-q">Usunąć ${kg1(p.kg)} kg?</span><span class="del-btns"><button type="button" class="chip-btn danger sm" data-act="w-del-yes" data-d="${p.d}">Usuń</button><button type="button" class="chip-btn sm" data-act="w-del-no" data-d="${p.d}">Zostaw</button></span></div></td></tr>`
        : `<tr><th scope="row">${esc(relDay(p.d, today))}</th><td class="num">${kg1(p.kg)}</td><td class="num">${kg1(p.avg)}</td><td class="act"><button type="button" class="icon-btn" data-act="w-del" data-d="${p.d}" aria-label="Usuń pomiar: ${esc(relDay(p.d, today))}">${ICON.trash}</button></td></tr>`)).join('') +
      `</tbody></table>`;
    if (rows.length > LIM) h += `<button type="button" class="chip-btn w-more" data-act="w-all" aria-expanded="${ui.wAll ? 'true' : 'false'}">${ui.wAll ? 'Pokaż mniej' : 'Pokaż wszystkie (' + rows.length + ')'}</button>`;
  } else h += `<p class="empty">${ws ? 'Brak pomiarów w tym okresie.' : 'Tu zobaczysz listę pomiarów. Każdy możesz poprawić albo usunąć.'}</p>`;
  // pomiar z innego dnia (ten sam dzień = poprawka)
  const ad = /^\d{4}-\d{2}-\d{2}$/.test(ui.wDate || '') ? ui.wDate : PL.weightGapDay(st, today);
  const ex = PL.weightOn(st, ad);
  const aerr = ui.wErr === 'add-kg' ? 'Wpisz wagę w kilogramach, np. 66,4.' : ui.wErr === 'add-date' ? 'Wybierz dzień nie późniejszy niż dziś.' : '';
  h += `<form class="wadd" data-form="weight-add" novalidate><p class="wadd-t">Dodaj albo popraw pomiar z innego dnia</p><div class="row">` +
    `<label class="fld sm"><span>Dzień</span><input type="date" id="w-add-date" name="d" value="${esc(ad)}" max="${today}"${ui.wErr === 'add-date' ? ' aria-invalid="true"' : ''} aria-describedby="w-add-h"></label>` +
    `<label class="fld sm"><span>Waga (kg)</span><input type="text" id="w-add-kg" name="kg" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="8" placeholder="00,0" value="${esc(ui.wKg || '')}"${ui.wErr === 'add-kg' ? ' aria-invalid="true"' : ''} aria-describedby="w-add-h"></label>` +
    `<button type="button" class="chip-btn primary" data-act="w-submit" data-v="add">Zapisz pomiar</button></div>` +
    `<p class="wq-h${aerr ? ' is-err' : ''}" id="w-add-h"${aerr ? ' role="alert"' : ''}>${esc(aerr || (ex != null ? 'Ten dzień ma już pomiar: ' + kg1(ex) + ' kg. Zapis go zastąpi.' : ''))}</p></form></section>`;
  // cel
  const gerr = ui.wErr === 'goal';
  let gtxt = 'Opcjonalny. Na wykresie pojawi się jako przerywana linia.';
  if (goal != null && ws) {
    const left = Math.round((ws.avg - goal) * 10) / 10;
    gtxt = Math.abs(left) < 0.05 ? 'Średnia z 7 dni jest dokładnie na celu.' : 'Średnia z 7 dni jest ' + kg1(Math.abs(left)) + ' kg ' + (left > 0 ? 'nad celem.' : 'pod celem.');
  }
  h += `<form class="card wgoal" data-form="weight-goal" novalidate><h2 class="w-h2">Cel</h2><div class="row">` +
    `<label class="fld sm"><span>Cel (kg)</span><input type="text" id="w-goal-kg" name="kg" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="8" placeholder="00,0" value="${esc(ui.wGoal != null ? ui.wGoal : goal != null ? kg1(goal) : '')}"${gerr ? ' aria-invalid="true"' : ''} aria-describedby="w-goal-h"></label>` +
    `<button type="button" class="chip-btn primary" data-act="w-submit" data-v="goal">Zapisz cel</button>${goal != null ? '<button type="button" class="chip-btn" data-act="w-goal-clear">Usuń cel</button>' : ''}</div>` +
    `<p class="wq-h${gerr ? ' is-err' : ''}" id="w-goal-h"${gerr ? ' role="alert"' : ''}>${esc(gerr ? 'Wpisz cel w kilogramach, np. 63.' : gtxt)}</p></form></div>`;
  h += `<p class="w-note">Pomiary wagi nie dają punktów.</p><p class="sync">${esc(sync || '')}</p>`;
  return h;
}

// ---------- Plan ----------
function planHTML(st, today, prog, ui, sync) {
  const P = PL.PHASES[st.phase];
  const pd = PL.phaseDay(st, today) + 1;
  const last = PL.lastTraining(st, PL.addDays(today, 1));
  let h = subHead('Rehabilitacja barku', 'Plan rehabilitacji');
  h += `<section class="card status"><p class="st-main">${tape(st.phase)}<b>${esc(P.name)}</b></p><dl class="st-dl">` +
    (P.len ? `<div><dt>Dzień treningowy</dt><dd>${pd} z ok. ${P.len}</dd></div>` : '') +
    (st.phase === 4 ? `<div><dt>Szczebel drabinki</dt><dd>${st.rung} z 5</dd></div>` : '') +
    `<div><dt>Start planu</dt><dd>${esc(longNoDay(st.start))}</dd></div>` +
    `<div><dt>Ostatni trening</dt><dd>${last ? esc(longNoDay(last)) + (last === today ? ' (dziś)' : ', ' + dni(PL.diff(last, today)) + ' temu') : 'jeszcze nie było'}</dd></div></dl></section>`;
  // od nowa
  const t1 = PL.addDays(today, 1);
  const when = ui.rsWhen || 'today';
  h += `<section class="card form" id="restart"><h2>Zacznij od nowa</h2><p>Wracasz Fazą 1 do dnia 1, z najlżejszymi dawkami. Historia i punkty zostają, chyba że zaznaczysz inaczej.</p>
<fieldset class="radios"><legend>Od kiedy</legend>
<label><input type="radio" name="rs-when" value="today"${when === 'today' ? ' checked' : ''}><span>Od dziś <small>${esc(dayMon(today))}</small></span></label>
<label><input type="radio" name="rs-when" value="tomorrow"${when === 'tomorrow' ? ' checked' : ''}><span>Od jutra <small>${esc(dayMon(t1))}</small></span></label>
<label><input type="radio" name="rs-when" value="date"${when === 'date' ? ' checked' : ''}><span>Inna data</span></label>
<input type="date" id="rs-date" value="${esc(ui.rsDate || t1)}" min="${today}" aria-label="Data startu"${when === 'date' ? '' : ' hidden'}>
</fieldset>
<label class="check"><input type="checkbox" id="rs-wipe"${ui.rsWipe ? ' checked' : ''}><span>Wyczyść też historię i punkty</span></label>`;
  if (ui.confirm) {
    const d = when === 'today' ? today : when === 'tomorrow' ? t1 : (ui.rsDate || t1);
    h += `<div class="confirm" role="alertdialog" aria-labelledby="rs-q"><p id="rs-q"><b>Na pewno?</b> Faza 1 zacznie się ${d === today ? 'dziś' : esc(PL.longDate(d))}${ui.rsWipe ? '. Historia rehabilitacji i jej punkty zostaną usunięte na wszystkich urządzeniach. Pomiary wagi i bloki treningowe zostają.' : ', a historia i punkty zostaną.'}</p><div class="choices"><button type="button" class="chip-btn ${ui.rsWipe ? 'danger' : 'primary'}" data-act="restart-do">Tak, zacznij od nowa</button><button type="button" class="chip-btn" data-act="restart-cancel">Anuluj</button></div></div>`;
  } else h += `<button type="button" class="go" data-act="restart-ask">Zacznij od nowa</button>`;
  h += '</section>';
  // etap ręcznie
  const sp = ui.stPhase || st.phase, sl = PL.PHASES[sp].len;
  h += `<section class="card form" id="stage"><h2>Ustaw etap ręcznie</h2><p>Gdy wiesz, gdzie jesteś, np. po przerwie chcesz wrócić kilka dni wstecz. Przejście ręczne nie daje punktów za fazę.</p>
<div class="row"><label class="fld"><span>Faza</span><select id="st-phase">${[1, 2, 3, 4, 5].map(p => `<option value="${p}"${p === sp ? ' selected' : ''}>${esc(PL.PHASES[p].name)}</option>`).join('')}</select></label>` +
    (sl ? `<label class="fld sm"><span>Dzień treningowy</span><input type="number" id="st-day" min="1" max="${sl + 14}" value="${ui.stDay || (sp === st.phase ? pd : 1)}" inputmode="numeric"></label>` : '') +
    (sp === 4 ? `<label class="fld sm"><span>Szczebel</span><select id="st-rung">${[1, 2, 3, 4, 5].map(r => `<option value="${r}"${r === (ui.stRung || st.rung) ? ' selected' : ''}>${r}</option>`).join('')}</select></label>` : '') +
    `</div><button type="button" class="go secondary" data-act="stage-set">Ustaw etap</button></section>`;
  h += `<section class="card rules"><h2>Zasady bólu</h2><ul class="rl">
<li><span class="dot ok"></span><b>0–3</b> w trakcie, poranek jak zwykle: kontynuuj, zwiększaj obciążenie, gdy pozwala faza.</li>
<li><span class="dot warn"></span><b>4–5</b> albo poranek trochę gorszy: ten sam poziom, lżej, aż wróci zielone.</li>
<li><span class="dot bad"></span><b>6+</b>, ostry ból, poranek gorszy i nie mija: przerwij to ćwiczenie i cofnij się o krok.</li></ul>
<p>Przeskakiwanie lub zacinanie w barku, uczucie wysuwania, mrowienie albo drętwienie: przerwij i skonsultuj się z fizjoterapeutą.</p></section>`;
  h += `<p class="sync">${esc(sync || '')}</p>`;
  return h;
}

// ---------- Postęp: karta wagi ----------
function weightCardHTML(st, today) {
  const ws = PL.weightStats(st, today);
  let h = '<h2 class="sub-h">Waga</h2><section class="card wsum">';
  if (!ws) h += '<p class="empty">Wpisz pierwszy pomiar na zakładce Dziś. Tu zobaczysz średnią z 7 dni i zmianę.</p>';
  else {
    h += `<dl class="wsum-dl"><div><dt>Średnia z 7 dni</dt><dd><b>${kg1(ws.avg)}</b> kg</dd></div>` +
      (ws.d30 != null ? `<div><dt>w 30 dni</dt><dd>${signedKg(ws.d30)}</dd></div>` : ws.d7 != null ? `<div><dt>w 7 dni</dt><dd>${signedKg(ws.d7)}</dd></div>` : '') +
      (ws.goal != null ? `<div><dt>do celu ${kg1(ws.goal)} kg</dt><dd>${Math.abs(ws.toGoal) < 0.05 ? 'osiągnięty' : kg1(Math.abs(ws.toGoal)) + ' kg'}</dd></div>` : '') + '</dl>';
  }
  return h + '<button type="button" class="chip-btn" data-act="tab" data-v="waga">Wykres i pomiary</button></section>';
}

// ---------- Dziennik ----------
const MORNING_TXT = { green: 'bark jak zwykle', yellow: 'bark trochę gorzej', red: 'bark gorzej i nie mija' };
const MORNING_LV = { green: 'ok', yellow: 'warn', red: 'bad' };
function journalHTML(st, today, prog, ui) {
  let h = `<header class="t-head"><p class="eyebrow">Dziennik</p><h1 class="t-title">Wszystkie wpisy</h1></header>`;
  h += `<button type="button" class="go secondary jr-new" data-act="lg-new">Dodaj trening spoza planu</button>`;
  h += `<h2 class="sub-h">Kalendarz</h2>${calendarHTML(st, today)}`;
  const days = {};
  const add = d => (days[d] = days[d] || { s: [], b: [], w: null, m: null });
  Object.keys(st.log).forEach(d => { const l = st.log[d] || {}; Object.keys(l).forEach(k => { if (l[k] && l[k].done) add(d).s.push({ k, e: l[k] }); }); });
  if (BLK()) BLK().entries(st).forEach(x => { add(x.d).b.push(x); });
  PL.weightEntries(st).forEach(x => { add(x.d).w = x.kg; });
  Object.keys(st.morning).forEach(d => { add(d).m = st.morning[d]; });
  Object.keys(st.props || {}).forEach(id => { if (st.props[id].s === 'ok') add(st.props[id].d); });
  const list = Object.keys(days).filter(d => d <= today).sort().reverse();
  h += '<h2 class="sub-h">Wpisy</h2>';
  if (!list.length) return h + '<p class="empty">Tu pojawi się każdy trening, poranna ocena barku i pomiar wagi, dzień po dniu.</p>';
  const LIM = 14, shown = ui && ui.jAll ? list : list.slice(0, LIM);
  h += '<ol class="jr">' + shown.map(d => {
    const x = days[d];
    x.s.sort((a, b) => (a.e.at || 0) - (b.e.at || 0));
    let li = `<li class="jr-day"><h3 class="jr-d">${esc(cap(relDay(d, today)))}${d >= PL.addDays(today, -1) ? ' <small>' + esc(dayMon(d)) + '</small>' : ''}</h3><ul class="hist">`;
    if (x.m) li += `<li><span class="h-s">Poranna ocena</span><span class="h-m ${MORNING_LV[x.m]}">${esc(MORNING_TXT[x.m])}</span></li>`;
    x.s.forEach(r => {
      const pv = r.e.pain != null ? `<span class="h-p ${painLevel(r.e.pain)}">ból ${r.e.pain}</span>` : '<span class="h-p">bez oceny</span>';
      const mins = r.e.dur ? Math.max(1, Math.round(r.e.dur / 60)) + ' min' : '';
      li += `<li><span class="h-s">${esc(r.e.label || r.k)}${r.e.partial ? ' (przerwana)' : ''}${mins ? ' <small>' + mins + '</small>' : ''}</span>${pv}<span class="h-pts">+${prog.byEntry[d + '|' + r.k] || 0}</span>${r.e.note ? `<span class="h-n">${esc(r.e.note)}</span>` : ''}</li>`;
    });
    x.b.forEach(r => {
      const T = BLK().TRACKS[r.e.t];
      const det = API.entryDetail ? API.entryDetail(r.e) : '';
      li += `<li class="jr-b" style="--c:var(${T.c})"><span class="h-s">${esc(r.e.name)} <small>${esc(T.name)}</small></span>${det ? `<span class="h-x">${esc(det)}</span>` : ''}<span class="h-pts">+${prog.byEntry[d + '|b:' + r.k] || 0}</span>` +
        `<button type="button" class="icon-btn h-ed" data-act="b-log" data-d="${d}" data-k="${esc(r.k)}" aria-label="Popraw wpis: ${esc(r.e.name)}">${ICON.chev}</button>${r.e.note ? `<span class="h-n">${esc(r.e.note)}</span>` : ''}</li>`;
    });
    Object.keys(st.props || {}).filter(id => st.props[id].s === 'ok' && st.props[id].d === d).forEach(id => { li += `<li class="jr-win"><span class="h-s">Zmiana planu</span><span class="h-x">${esc(st.props[id].text)}</span></li>`; });
    (prog.chDone || []).filter(c => c.d === d).forEach(c => { li += `<li class="jr-win"><span class="h-s">Wyzwanie: ${esc(c.name)}</span><span class="h-pts">+${c.pts}</span></li>`; });
    (prog.recordEvents || []).filter(r => r.d === d).forEach(r => { li += `<li class="jr-win"><span class="h-s">Rekord: ${esc(r.name)}</span><span class="h-x">${esc(r.text)}</span><span class="h-pts">+${r.pts}</span></li>`; });
    if (x.w != null) li += `<li><span class="h-s">Waga</span><span class="h-w">${kg1(x.w)} kg</span></li>`;
    return li + '</ul></li>';
  }).join('') + '</ol>';
  if (list.length > LIM) h += `<button type="button" class="chip-btn w-more" data-act="j-all" aria-expanded="${ui && ui.jAll ? 'true' : 'false'}">${ui && ui.jAll ? 'Pokaż mniej' : 'Pokaż wszystkie dni (' + list.length + ')'}</button>`;
  return h;
}

// ---------- Więcej ----------
const MENU = [
  ['bloki', 'Bloki treningowe', 'Biblioteka bloków i Twój domyślny tydzień'],
  ['waga', 'Waga', 'Pomiary, średnia z 7 dni i cel'],
  ['atlas', 'Atlas ćwiczeń', 'Wszystkie ćwiczenia w ruchu'],
  ['plan', 'Rehabilitacja barku', 'Faza, start od nowa, progi i zasady bólu'],
  ['ustawienia', 'Ustawienia', 'Konto, kopia zapasowa, dźwięk']
];
function moreHTML(st, today, ui) {
  let h = `<header class="t-head"><p class="eyebrow">Więcej</p><h1 class="t-title">Więcej</h1></header><ul class="menu">`;
  MENU.forEach(m => {
    let sub = m[2];
    if (m[0] === 'waga') { const ws = PL.weightStats(st, today); if (ws) sub = 'Średnia z 7 dni: ' + kg1(ws.avg) + ' kg'; }
    if (m[0] === 'plan') sub = PL.PHASES[st.phase].name + ' · start od nowa, progi, zasady bólu';
    if (m[0] === 'ustawienia' && ui && ui.acct) sub = 'Zalogowano: ' + ui.acct.email;
    h += `<li><button type="button" class="menu-i card" data-act="tab" data-v="${m[0]}"><span class="menu-t"><b>${esc(m[1])}</b><small>${esc(sub)}</small></span>${ICON.chev}</button></li>`;
  });
  return h + '</ul>';
}

// ---------- Ustawienia ----------
const LOGIN_ERR = {
  login: 'Zły e-mail albo hasło.', many: 'Za dużo prób. Spróbuj za kilka minut.', disabled: 'To konto jest wyłączone.',
  network: 'Brak połączenia z siecią. Spróbuj, gdy wróci.', empty: 'Wpisz e-mail i hasło.', other: 'Logowanie się nie udało. Spróbuj ponownie.'
};
function settingsHTML(st, today, ui, sync) {
  let h = subHead('Ustawienia', 'Konto i dane');
  // konto
  h += '<section class="card form" id="konto"><h2>Konto i synchronizacja</h2>';
  if (!ui.cloudOn) {
    h += '<p>Synchronizacja z kontem nie jest jeszcze włączona w tej wersji. Dane zapisują się na tym urządzeniu, więc rób kopię zapasową.</p>';
  } else if (ui.acct) {
    h += `<p>Zalogowano jako <b>${esc(ui.acct.email)}</b>. Dane są na tym urządzeniu i na koncie, więc zobaczysz je na każdym, na którym się zalogujesz.</p>` +
      `<p class="sync">${esc(sync || '')}</p><div class="choices"><button type="button" class="chip-btn primary" data-act="sync-now">Synchronizuj teraz</button><button type="button" class="chip-btn" data-act="logout">Wyloguj</button></div>`;
  } else {
    const err = ui.lErr ? LOGIN_ERR[ui.lErr] || LOGIN_ERR.other : '';
    h += `<p>Zaloguj się, żeby dane miały kopię na koncie i były takie same na telefonie i komputerze.</p>` +
      `<form class="login" data-form="login" novalidate><div class="row">` +
      `<label class="fld"><span>E-mail</span><input type="email" id="l-email" name="email" autocomplete="username" inputmode="email" enterkeyhint="next" value="${esc(ui.lEmail || '')}"${ui.lErr === 'login' || ui.lErr === 'empty' ? ' aria-invalid="true"' : ''} aria-describedby="l-h"></label>` +
      `<label class="fld"><span>Hasło</span><input type="password" id="l-pass" name="password" autocomplete="current-password" enterkeyhint="go"${ui.lErr === 'login' || ui.lErr === 'empty' ? ' aria-invalid="true"' : ''} aria-describedby="l-h"></label></div>` +
      `<p class="wq-h${err ? ' is-err' : ''}" id="l-h"${err ? ' role="alert"' : ''}>${esc(err || 'Konto zakładasz raz, w konsoli Firebase.')}</p>` +
      `<button type="button" class="go" data-act="login"${ui.lBusy ? ' disabled' : ''}>${ui.lBusy ? 'Loguję…' : 'Zaloguj'}</button></form>`;
  }
  h += '</section>';
  // kopia zapasowa
  h += `<section class="card form" id="kopia"><h2>Kopia zapasowa</h2><p>Plik ze wszystkimi danymi: treningami, wagą i ustawieniami planu. Zapisz go co jakiś czas, np. na Dysku Google. Wczytanie kopii łączy ją z danymi na tym urządzeniu i niczego nie usuwa.</p>` +
    `<div class="choices"><button type="button" class="chip-btn primary" data-act="bk-save">Zapisz kopię</button>${ui.canShare ? '<button type="button" class="chip-btn" data-act="bk-share">Wyślij kopię</button>' : ''}<button type="button" class="chip-btn" data-act="bk-pick">Wczytaj kopię</button></div>` +
    `<input type="file" id="bk-file" accept=".json,application/json" hidden>`;
  if (ui.bkErr) h += `<div class="alert bad" role="alert"><p>${esc(ui.bkErr)}</p></div>`;
  if (ui.bk) {
    const c = ui.bk.counts, when = ui.bk.exported ? new Date(ui.bk.exported) : null;
    const whenTxt = when && !isNaN(when) ? longNoDay(PL.ymd(when)) + ' ' + when.getFullYear() : 'nieznana data';
    h += `<div class="confirm" role="alertdialog" aria-labelledby="bk-q"><p id="bk-q"><b>Kopia z ${esc(whenTxt)}:</b> ${c.sessions} ${plural(c.sessions, 'sesja', 'sesje', 'sesji')}, ${pomiary(c.weights)} wagi. Wczytać i połączyć z danymi na tym urządzeniu?</p>` +
      `<div class="choices"><button type="button" class="chip-btn primary" data-act="bk-apply">Wczytaj</button><button type="button" class="chip-btn" data-act="bk-cancel">Anuluj</button></div></div>`;
  }
  h += '</section>';
  // poziomy startowe
  h += `<section class="card form" id="poziomy"><h2>Poziomy startowe</h2><p>Poziom, od którego liczy się Twoja droga. Zmiana nie kasuje punktów.</p><div class="row">` +
    `<label class="fld sm"><span>Wspinanie</span><select id="lv-climb">${PL.GRADES.map(g => `<option${g[0] === st.climbBase ? ' selected' : ''}>${g[0]}</option>`).join('')}</select></label>` +
    `<label class="fld sm"><span>Bieganie</span><select id="lv-run">${PL.RUN_LEVELS.map((r, i) => `<option value="${i}"${i === (st.runBase | 0) ? ' selected' : ''}>${esc(r[0])}</option>`).join('')}</select></label></div></section>`;
  // dźwięk
  const snd = ui.sound;
  h += `<section class="card form"><h2>Dźwięk w trakcie treningu</h2><fieldset class="radios"><legend class="sr-only">Dźwięk</legend>
<label><input type="radio" name="snd" value="voice"${snd === 'voice' ? ' checked' : ''}${ui.hasVoice ? '' : ' disabled'}><span>Sygnały i głos <small>${ui.hasVoice ? 'polski głos telefonu' : 'brak polskiego głosu na tym urządzeniu'}</small></span></label>
<label><input type="radio" name="snd" value="beep"${snd === 'beep' ? ' checked' : ''}><span>Tylko sygnały</span></label>
<label><input type="radio" name="snd" value="off"${snd === 'off' ? ' checked' : ''}><span>Cisza <small>wibracje zostają, jeśli telefon je ma</small></span></label></fieldset></section>`;
  // instalacja
  h += `<section class="card form"><h2>Aplikacja na telefonie</h2><p>${ui.standalone ? 'Aplikacja jest zainstalowana na tym urządzeniu i działa też bez sieci.'
    : 'Zainstaluj ją: w Chrome otwórz menu (trzy kropki) i wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”. Potem otwiera się z ikony na pełnym ekranie i działa bez sieci.'}</p></section>`;
  if (!ui.acct) h += `<p class="sync">${esc(sync || '')}</p>`;
  return h;
}

const API = { rtag, levelLine, headChip, todayHTML, journalHTML, cap, dayMon, plural, subHead, tape, progressHTML, weightHTML, weightChart, weightReadout, planHTML, moreHTML, settingsHTML, gtag, bar, gradeLine, dni, painLevel, kg1, relDay, ICON, esc };
G.VIEWS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
