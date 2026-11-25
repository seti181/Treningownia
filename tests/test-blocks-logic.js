// Bloki bez przeglądarki: domyślny tydzień, przeniesienia i pominięcia, dziennik, punkty i premia za pełny tydzień,
// walidacja i scalanie dwóch urządzeń, czas i tempo.
const { check, finish } = require('./check');
require('../src/core.js'); const PL = require('../src/plan.js'); const BL = require('../src/blocks.js'); const S = require('../src/store.js');
const MON = '2026-11-23', at = n => 1795000000000 + n;
const names = (st, d) => BL.dayView(st, d).map(x => x.b).join(',');

// domyślny tydzień
const st = PL.defaults(MON);
check('default week: 3 runs and 3 climbs, Sunday is a climb', [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + BL.dayItems(st, PL.addDays(MON, i)).filter(x => BL.getBlock(st, x.b).t === 'bieg').length, 0) === 3
  && [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + BL.dayItems(st, PL.addDays(MON, i)).filter(x => BL.getBlock(st, x.b).t === 'wspin').length, 0) === 3 && /wspinanie/.test(names(st, '2026-11-29')));
check('every built-in timed block uses known exercises', BL.BUILTIN.filter(b => b.kind === 'timed').every(b => b.items.every(i => BL.exOf(i.ex))));
const A = require('../src/core.js');
const noAnim = Object.keys(BL.CAT).filter(id => BL.CAT[id].plain || !BL.CAT[id].seq);
check('every block exercise has an animation', !noAnim.length, noAnim.join(', '));
const bad = A.MOVES.filter(m => { try { A.render(m, A.stillTime(m), 't'); const v = A.view(m); return !v.every(isFinite); } catch (e) { return true; } });
check('every move renders with a finite frame', !bad.length, bad.map(m => m.id).join(', '));
const PULL = /podciag|wioslow|australij|negatyw|lopatkowe|zwis-aktywny/;
check('no pulling exercises in built-in blocks while rehab is on (rehab rule)', !BL.BUILTIN.some(b => !b.afterRehab && (b.items || []).some(i => PULL.test(i.ex))));
const rd = PL.defaults(MON);
check('pulling block hidden while rehab is on', !BL.allBlocks(rd).some(b => (b.items || []).some(i => PULL.test(i.ex))) && BL.climbNote(rd).length > 0);
rd.rehabDone = MON;
check('after the owner ends rehab: pulling block unlocked, no shoulder note on climbing', BL.allBlocks(rd).some(b => b.id === 'sila-podciaganie') && BL.climbNote(rd) === '');
check('rehabDone survives sanitize', S.sanitize(JSON.parse(JSON.stringify(rd)), MON).rehabDone === MON);

// przeniesienie, pominięcie, dodanie, usunięcie
BL.moveItem(st, '2026-11-24', 'p0-palce-20', '2026-11-25', at(1));
check('move: gone from Tuesday, added to Wednesday', names(st, '2026-11-24') === 'wspinanie' && names(st, '2026-11-25') === 'bieg-spokojny,rozc-bieg,palce-20');
BL.skipItem(st, MON, 'p1-rozc-bieg', true, at(2));
check('skip keeps the block, marked skipped', BL.dayView(st, MON).find(x => x.k === 'p1-rozc-bieg').skip === true);
const k = BL.addItem(st, '2026-11-28', 'sila-core', at(3));
BL.removeItem(st, '2026-11-28', 'p2-rozc-pelne', at(4));
check('add and remove on one day', names(st, '2026-11-28') === 'sila-pompki,sila-kolka,sila-core' && /^a/.test(k));
check('other weeks still follow the pattern', names(st, '2026-12-01') === 'palce-20,wspinanie');
BL.setPattern(st, 3, ['wspinanie'], at(5));
check('pattern change applies to days without changes only', names(st, '2026-12-02') === 'wspinanie' && names(st, '2026-11-25') === 'bieg-spokojny,rozc-bieg,palce-20');

// dziennik i punkty
const g = id => BL.getBlock(st, id);
const p0 = PL.progress(st, MON).total;
BL.logBlock(st, MON, 'p0-bieg-spokojny', g('bieg-spokojny'), { km: 6.5, sec: 2100, dur: 2100, rpe: 4 }, at(10));
const p1 = PL.progress(st, MON);
check('run: 15 + 2 for effort, first-run badge', p1.total - p0 === 17 && p1.badges.find(b => b.id === 'bieg1').d === MON, String(p1.total - p0));
check('pace', BL.pace(6.5, 2100) === '5:23/km' && BL.fmtDur(2100) === '35:00' && BL.fmtDur(3930) === '1:05:30');
check('time parsing', BL.parseTime('34:10') === 2050 && BL.parseTime('1:05:30') === 3930 && BL.parseTime('40') === 2400 && BL.parseTime('40 min') === 2400 && BL.parseTime('abc') === null && BL.parseTime('12:75') === null);
check('km parsing', BL.parseKm('6,5') === 6.5 && BL.parseKm('10 km') === 10 && BL.parseKm('x') === null && BL.parseKm('0') === null);
// pełny tydzień: 3 biegi i 3 wspinania -> +25 raz
const add = (d, kk, id, data) => BL.logBlock(st, d, kk, g(id), data || {}, at(Math.random() * 1000 | 0));
add('2026-11-24', 'p0-wspinanie', 'wspinanie', { grade: '6a+', routes: 8, dur: 5400 });
add('2026-11-25', 'p0-bieg-przebiezki', 'bieg-przebiezki', { km: 5 });
add('2026-11-26', 'p0-wspinanie', 'wspinanie');
const before = PL.progress(st, '2026-11-29');
add('2026-11-27', 'p0-bieg-dlugi', 'bieg-dlugi', { km: 10 });
add('2026-11-29', 'p0-wspinanie', 'wspinanie', { pain: 1 });
const full = PL.progress(st, '2026-11-29');
const extra = full.chDone.filter(c => !before.chDone.some(x => x.id === c.id && x.week === c.week)).reduce((n, c) => n + c.pts, 0) + (full.recordEvents.length - before.recordEvents.length) * BL.REC_PTS;
check('full week: +25 once (as a challenge), badge, counted in stats', full.fullWeeks === 1 && full.chDone.filter(c => c.id === 'pelny').length === 1 && full.total - before.total === 15 + 15 + 2 + extra && full.badges.find(b => b.id === 'tydzien').d === '2026-11-29', (full.total - before.total) + ' = 32 + ' + extra);
const ws = BL.weekStats(st, '2026-11-26');
check('week stats', ws.runs === 3 && ws.climbs === 3 && ws.km === 21.5 && ws.full && ws.from === MON);
check('streak counts every training day', full.best >= 5, 'best ' + full.best);
check('logged extra block shows on its day', (() => { add('2026-11-28', 'xextra', 'rozc-pelne'); return BL.dayView(st, '2026-11-28').some(x => x.k === 'xextra' && x.extra); })());

// wyzwania tygodnia
const chw = BL.challenges(st, MON);
check('challenges: 4 per week, full week and km always there', chw.length === 4 && chw[0].id === 'pelny' && chw[1].id === 'km', chw.map(c => c.id + ' ' + c.value + '/' + c.target).join(', '));
check('challenges: rotation differs between weeks', BL.challenges(st, '2026-11-30').slice(2).map(c => c.id).join() !== chw.slice(2).map(c => c.id).join());
const fresh = PL.defaults(MON);
check('km target: at least 10 km with no history', BL.challenges(fresh, MON)[1].target === 10);
const hist = PL.defaults(MON);
for (let w = 1; w <= 4; w++) BL.logBlock(hist, PL.addDays(MON, -7 * w), 'p0-bieg-dlugi', g('bieg-dlugi'), { km: 20 }, at(w));
const kmT = BL.challenges(hist, MON)[1].target;
check('km target: last 4 weeks average + 10% (20 km a week -> 22)', kmT === 22, String(kmT));
check('km target is fixed during the week', (() => { BL.logBlock(hist, MON, 'p0-bieg-spokojny', g('bieg-spokojny'), { km: 30 }, at(9)); return BL.challenges(hist, MON)[1].target === 22 && BL.challenges(hist, MON)[1].done; })());
const pr = PL.progress(st, '2026-11-29');
check('challenge points and badge in progress', pr.chDone.some(c => c.id === 'pelny' && c.d === '2026-11-29') && pr.chDone.some(c => c.id === 'km') && pr.badges.find(b => b.id === 'wyzwanie1').d, pr.chDone.map(c => c.id + '@' + c.d).join(', '));

// rekordy
const rs = PL.defaults(MON), rg = id => BL.getBlock(rs, id);
BL.logBlock(rs, MON, 'p0-bieg-spokojny', rg('bieg-spokojny'), { km: 6, sec: 2160 }, at(1));
check('records: first values only set the bar', BL.records(BL.entries(rs)).events.length === 0 && BL.records(BL.entries(rs)).best.km.text === '6 km');
BL.logBlock(rs, '2026-11-25', 'p0-bieg-przebiezki', rg('bieg-przebiezki'), { km: 7, sec: 2400 }, at(2));
BL.logBlock(rs, '2026-11-24', 'p1-wspinanie', rg('wspinanie'), { grade: '6a', routes: 10 }, at(3));
BL.logBlock(rs, '2026-11-26', 'p0-wspinanie', rg('wspinanie'), { grade: '6a+', routes: 9 }, at(4));
const rr = BL.records(BL.entries(rs));
check('records: longest run, pace, hardest grade beaten; fewer routes is no record', rr.events.map(e => e.id).join() === 'km,tempo5,grade' && rr.best.tempo5.text === '5:43/km' && rr.best.grade.text === '6a+' && rr.best.drogi.text === '10 dróg', rr.events.map(e => e.id).join());
BL.logBlock(rs, '2026-12-01', 'p0-bieg-spokojny', rg('bieg-spokojny'), { km: 5 }, at(5));
BL.logBlock(rs, '2026-12-03', 'p0-bieg-spokojny', rg('bieg-spokojny'), { km: 9 }, at(6));
const rw = BL.records(BL.entries(rs));
check('records: week km beaten once when a week passes the best earlier week', rw.events.filter(e => e.id === 'tydzien').length === 1 && rw.best.tydzien.text === '14 km', rw.events.map(e => e.id + '@' + e.d).join());
const prr = PL.progress(rs, '2026-12-03');
check('record points: +10 each, badge', prr.recordEvents.length === rw.events.length && prr.badges.find(b => b.id === 'rekord1').d === '2026-11-25');

// poziomy: wspinanie i bieganie osobno
const lv = PL.defaults(MON), lg = id => BL.getBlock(lv, id);
let lp = PL.progress(lv, MON);
check('levels: climbing starts at 6a, running at Start', lp.climb.name === '6a' && lp.run.name === 'Start' && lp.climb.toNext === 120);
BL.logBlock(lv, MON, 'p0-bieg-spokojny', lg('bieg-spokojny'), { km: 6, sec: 2160, rpe: 4 }, at(1));
BL.logBlock(lv, '2026-11-24', 'p1-wspinanie', lg('wspinanie'), { grade: '6a', routes: 10, rpe: 6 }, at(2));
BL.logBlock(lv, '2026-11-25', 'p1-rozc-bieg', lg('rozc-bieg'), {}, at(3));
lp = PL.progress(lv, '2026-11-25');
check('levels: climbing gets climbing points only, running gets runs only, stretching and the 3-day streak only the total', lp.climb.pts === 17 && lp.run.pts === 17 && lp.total === 17 + 17 + 6 + 10, lp.climb.pts + ' / ' + lp.run.pts + ' / ' + lp.total);
const lad = PL.ladder(PL.RUN_LEVELS, PL.RUN_STEP, 0, 100);
check('ladder: 100 running points = Start (40) + Truchtacz (60) -> Biegacz, 90 to go', lad.name === 'Biegacz' && lad.toNext === 90 && lad.pct === 0, JSON.stringify(lad));
check('ladder: the last level is the top', PL.ladder(PL.RUN_LEVELS, PL.RUN_STEP, 0, 1e6).name === '1:20' && PL.ladder(PL.RUN_LEVELS, PL.RUN_STEP, 0, 1e6).top);
check('climb form: hardest grade in 30 days', BL.climbForm(lv, '2026-11-25').grade === '6a' && !BL.climbForm(lv, '2027-01-30'));
const rf = BL.runForm(lv, '2026-11-25');
check('run form: Riegel half-marathon prediction (6 km in 36:00 -> 2:16:30)', rf && Math.abs(rf.hm - Math.round(2160 * Math.pow(21.0975 / 6, 1.06))) <= 1 && BL.fmtDur(rf.hm) === '2:16:30', rf && BL.fmtDur(rf.hm));
lv.climbBase = '6b'; lv.levelsAt = at(9);
check('starting level: climbing from 6b', PL.progress(lv, '2026-11-25').climb.name === '6b');
const lv2 = S.merge(S.sanitize(JSON.parse(JSON.stringify(lv)), MON), S.sanitize({}, MON));
check('starting levels sync with the later change', lv2.climbBase === '6b');

// cykl i propozycje
const cy = PL.defaults(MON), cg = id => BL.getBlock(cy, id);
check('cycle: 3 weeks build, then 1 recovery, repeating', BL.phaseOf(cy, '2026-11-25').kind === 'budowa' && BL.phaseOf(cy, '2026-12-08').week === 3 && BL.phaseOf(cy, '2026-12-16').kind === 'odciazenie' && BL.phaseOf(cy, '2026-12-21').kind === 'budowa');
BL.logBlock(cy, MON, 'a1', cg('palce-20'), { rpe: 5, pain: 0 }, at(1));
check('no proposal after one easy finger session', !BL.proposals(cy, MON).some(p => /^palce/.test(p.id)));
BL.logBlock(cy, '2026-11-25', 'a2', cg('palce-20'), { rpe: 6 }, at(2));
let pp = BL.proposals(cy, '2026-11-25').find(p => /^palce/.test(p.id));
check('two easy finger sessions: +2 s per hang', pp && pp.edit.hold === 12, pp && pp.text);
BL.decide(cy, pp, 'no', '2026-11-25', at(3));
check('declined: hidden for 7 days, back after', !BL.proposals(cy, '2026-11-27').some(p => p.id === pp.id) && BL.proposals(cy, '2026-12-02').some(p => p.id === pp.id));
BL.applyProposal(cy, pp, '2026-12-02', at(4));
check('accepted: the block changes, no new proposal until 2 more sessions', cg('palce-20').items[1].hold === 12 && BL.isEdited(cy, 'palce-20') && !BL.proposals(cy, '2026-12-02').some(p => /^palce/.test(p.id)));
BL.logBlock(cy, '2026-12-03', 'a3', cg('palce-20'), { rpe: 5 }, at(5)); BL.logBlock(cy, '2026-12-04', 'a4', cg('palce-20'), { rpe: 5 }, at(6));
check('next step after two more easy sessions: 14 s', (BL.proposals(cy, '2026-12-04').find(p => /^palce/.test(p.id)) || {}).edit.hold === 14);
const hard = PL.defaults(MON);
BL.logBlock(hard, MON, 'h1', BL.getBlock(hard, 'sila-pompki'), { rpe: 5 }, at(1)); BL.logBlock(hard, '2026-11-24', 'h2', BL.getBlock(hard, 'sila-pompki'), { rpe: 5, pain: 4 }, at(2));
check('shoulder pain 4: no increases', BL.shoulderAlarm(hard, '2026-11-25') && !BL.proposals(hard, '2026-11-25').length);
const sp = PL.defaults(MON);
BL.logBlock(sp, MON, 's1', BL.getBlock(sp, 'sila-pompki'), { rpe: 6 }, at(1)); BL.logBlock(sp, '2026-11-24', 's2', BL.getBlock(sp, 'sila-pompki'), { rpe: 4 }, at(2));
const sprop = BL.proposals(sp, '2026-11-25').find(p => /^sila/.test(p.id));
check('push-ups: +1 rep per set', sprop && sprop.edit.items[1].reps === '11–13' && sprop.edit.items[2].reps === '13', sprop && JSON.stringify(sprop.edit.items.map(x => x.reps)));
check('recovery week: no proposals, km target at 60%', !BL.proposals(cy, '2026-12-16').length && /odciążenia/.test(BL.challenges(cy, '2026-12-14')[1].desc));
const tr = PL.defaults(MON);
for (let i = 0; i < 6; i++) BL.logBlock(tr, PL.addDays(MON, i), 'r' + i, BL.getBlock(tr, 'bieg-spokojny'), { km: 6, sec: 2300, rpe: 3 }, at(10 + i));
const tp = BL.proposals(tr, '2026-11-28').find(p => /^test/.test(p.id));
check('after 6 runs: plan the 5 km test on the next easy-run day', tp && tp.plan.d === '2026-11-30', tp && tp.text);
BL.applyProposal(tr, tp, '2026-11-28', at(20));
check('accepted: the test replaces that easy run', names(tr, '2026-11-30') === 'rozc-bieg,bieg-test5');

// lista dróg: wycena i liczba dróg z listy, piramida według stylu, rekord OS/flash
check('route list: hardest sent grade (attempts do not count) and the count', (() => { const r = BL.routeSum([{ g: '6a', s: 'os' }, { g: '6b', s: 'pr' }, { g: '6a+', s: 'rp' }, { g: '6a', s: 'fl' }]); return r.n === 4 && r.grade === '6a+' && r.os === '6a'; })());
const cl = PL.defaults(MON), wsp = BL.getBlock(cl, 'wspinanie');
BL.logBlock(cl, MON, 'c1', wsp, { rl: [{ g: '6a', s: 'os' }, { g: '6a', s: 'rp' }], grade: '6a', routes: 2 }, at(1));
BL.logBlock(cl, '2026-11-24', 'c2', wsp, { rl: [{ g: '6a+', s: 'fl' }, { g: '6b', s: 'pr' }, { g: '6a', s: 'os' }], grade: '6a+', routes: 3 }, at(2));
BL.logBlock(cl, '2026-11-25', 'c3', wsp, { grade: '5c', routes: 4 }, at(3));
const cst = BL.climbStats(cl, '2026-11-25', 90, 6);
check('pyramid counts sent routes by grade and style; a session without a list counts its hardest grade once', cst.byGrade['6a'] === 3 && cst.byGrade['6a+'] === 1 && !cst.byGrade['6b'] && cst.byGrade['5c'] === 1 && cst.byStyle['6a'].os === 2 && cst.byStyle['6a'].rp === 1, JSON.stringify(cst.byGrade));
const cr = BL.records(BL.entries(cl));
check('record: hardest OS or flash beaten', cr.events.some(e => e.id === 'os' && e.text === '6a+') && cr.best.os.text === '6a+', cr.events.map(e => e.id).join());
const clean2 = S.sanitize(JSON.parse(JSON.stringify(cl)), MON);
check('route list survives sanitize, bad routes dropped', S.canon(clean2.blog) === S.canon(cl.blog) && !S.sanitize({ blog: { [MON]: { c1: Object.assign({}, cl.blog[MON].c1, { rl: [{ g: '9z', s: 'os' }, { g: '6a', s: 'xx' }] }) } } }, MON).blog[MON].c1.rl);

// chwytotablica: obciążenie, procent wagi, propozycje, rekord
const hb = PL.defaults(MON), hg = id => BL.getBlock(hb, id);
check('hang: block palce-20 has a 20 mm hold', BL.hangOf(hg('palce-20')).mm === 20 && !BL.hangOf(hg('sila-pompki')));
check('hang: no default load before the first session', BL.hangKg(hb, hg('palce-20')) === null);
PL.setWeight(hb, '2026-11-20', 70, at(0));
BL.logBlock(hb, MON, 'z1', hg('palce-20'), { rpe: 5, pain: 0, kg: -10, mm: 20 }, at(1));
check('hang: % of body weight from the nearest weight (70 kg, 10 kg off = 86%)', BL.hangPct(hb, MON, BL.entryOf(hb, MON, 'z1')) === 86 && BL.kgText(-10) === 'odciążenie 10 kg' && BL.kgText(0) === 'pełna waga');
check('hang: next default load = last session', BL.hangKg(hb, hg('palce-20')) === -10);
BL.logBlock(hb, '2026-11-25', 'z2', hg('palce-20'), { rpe: 6, kg: -10, mm: 20 }, at(2));
const hp = BL.proposals(hb, '2026-11-25').find(p => /^palce/.test(p.id));
check('two easy sessions with weight off: 2 kg less off first (before longer hangs)', hp && hp.edit.kg === -8 && hp.edit.hold == null, hp && hp.text);
BL.applyProposal(hb, hp, '2026-11-25', at(3));
check('accepted: the block holds the new load, the next default is -8 kg', hg('palce-20').items[1].kg === -8 && BL.hangKg(hb, hg('palce-20')) === -8);
BL.logBlock(hb, '2026-11-27', 'z3', hg('palce-20'), { rpe: 5, kg: -8, mm: 20 }, at(4));
const hr = BL.records(BL.entries(hb), hb);
check('record: strongest 20 mm hang in % of body weight', hr.best.zwis20.text === '89% wagi' && hr.events.some(e => e.id === 'zwis20'), JSON.stringify(hr.best.zwis20));
const fw = BL.fingerWeeks(hb, '2026-11-29', 2);
check('finger chart data: best % per week', fw[1].p20 === 89 && fw[1].p15 === null && fw[0].p20 == null, JSON.stringify(fw));
const hz = PL.defaults(MON);
BL.logBlock(hz, MON, 'y1', BL.getBlock(hz, 'palce-20'), { rpe: 5, kg: 0, mm: 20 }, at(1)); BL.logBlock(hz, '2026-11-24', 'y2', BL.getBlock(hz, 'palce-20'), { rpe: 5, kg: 0, mm: 20 }, at(2));
check('full body weight: proposals go on to longer hangs', (BL.proposals(hz, '2026-11-24').find(p => /^palce/.test(p.id)) || {}).edit.hold === 12);
const clean3 = S.sanitize(JSON.parse(JSON.stringify(hb)), MON);
check('load and edge survive sanitize, block target too', clean3.blog[MON].z1.kg === -10 && clean3.blog[MON].z1.mm === 20 && clean3.blocks['palce-20'].items[1].kg === -8);
const ha = S.sanitize({}, MON), hb2 = S.sanitize({}, MON);
BL.logBlock(ha, MON, 'z1', BL.getBlock(ha, 'palce-20'), { kg: -6, mm: 20 }, at(10));
BL.logBlock(hb2, MON, 'z1', BL.getBlock(hb2, 'palce-20'), { kg: -4, mm: 20 }, at(11));
check('merge: the later load entry wins', S.merge(ha, hb2).blog[MON].z1.kg === -4 && S.merge(hb2, ha).blog[MON].z1.kg === -4);
const cs = S.sanitize(JSON.parse(JSON.stringify(cy)), MON);
check('cycle and decisions survive sanitize and merge', cs.cycle.build === 3 && Object.keys(cs.props).length === 1 && Object.keys(S.merge(S.sanitize({}, MON), cs).props).length === 1);

// ochrona serii: jeden dzień odpoczynku w tygodniu
const sh = PL.defaults(MON), sb = BL.getBlock(sh, 'rozc-bieg');
['2026-11-23', '2026-11-24', '2026-11-26', '2026-11-27'].forEach((d, i) => BL.logBlock(sh, d, 'k' + i, sb, {}, at(i)));
let sp2 = PL.progress(sh, '2026-11-27');
check('streak: one rest day in a week keeps it (4 training days -> streak 4)', sp2.streak === 4 && sp2.shields.join() === '2026-11-25', sp2.streak + ' ' + sp2.shields.join());
BL.logBlock(sh, '2026-11-29', 'k9', sb, {}, at(9));
sp2 = PL.progress(sh, '2026-11-29');
check('streak: a second rest day in the same week breaks it', sp2.streak === 1, String(sp2.streak));
check('streak: still alive the day after a rest day if the week has a shield left', PL.progress(sh, '2026-12-01').streak === 1 && PL.progress(sh, '2026-12-02').streak === 0);

// waga: tempo, prognoza celu, za szybki spadek
const wt = PL.defaults(MON);
for (let i = 0; i <= 35; i++) PL.setWeight(wt, PL.addDays('2026-10-20', i), 72 - i * 0.07, at(i));
PL.setGoal(wt, 56, at(99));
const wst = PL.weightStats(wt, '2026-11-24');
check('weight: rate per week (about -0,5 kg) and the goal date', Math.abs(wst.rate + 0.49) < 0.03 && /^202[78]-/.test(wst.eta) && !wst.fast, wst.rate + ' ' + wst.eta);
const wf = PL.defaults(MON);
for (let i = 0; i <= 21; i++) PL.setWeight(wf, PL.addDays('2026-11-03', i), 72 - i * 0.15, at(i));
check('weight: losing over 1% a week for two weeks is flagged', PL.weightStats(wf, '2026-11-24').fast);

// biblioteka: edycja wbudowanego, kopia, własny blok, usunięcie
const ed = JSON.parse(JSON.stringify(g('palce-20'))); ed.items[1].sets = 5;
BL.saveBlock(st, ed, at(20));
check('edit a built-in block: override, flagged', g('palce-20').items[1].sets === 5 && BL.isEdited(st, 'palce-20'));
BL.deleteBlock(st, 'palce-20', at(21));
check('reset a built-in block to the start version', g('palce-20').items[1].sets === 6 && !BL.isEdited(st, 'palce-20'));
const cid = BL.copyBlock(st, 'sila-pompki', at(22));
check('copy is an own block', !BL.isBuiltin(cid) && /kopia/.test(g(cid).name) && BL.allBlocks(st).some(b => b.id === cid));

// walidacja i scalanie
const clean = S.sanitize(JSON.parse(JSON.stringify(st)), MON);
check('sanitize keeps blocks, week, days and log', S.canon(clean.blog) === S.canon(st.blog) && S.canon(clean.days) === S.canon(st.days) && S.canon(clean.week) === S.canon(st.week) && !!clean.blocks[cid]);
const junk = S.sanitize({ blocks: { 'ZŁY': {}, ok1: { kind: 'zz', t: 'bieg' } }, blog: { [MON]: { 'p0-x': { done: true, b: 'x1', t: 'nie' } } }, week: { 1: ['<b>'] } }, MON);
check('sanitize drops invalid blocks and entries', !Object.keys(junk.blocks).length && !Object.keys(junk.blog).length && junk.week[1].length === 0);
const a = S.sanitize({}, MON), b = S.sanitize({}, MON);
BL.logBlock(a, MON, 'p0-bieg-spokojny', g('bieg-spokojny'), { km: 5 }, at(30)); a.updated = at(30);
BL.moveItem(b, '2026-11-24', 'p0-palce-20', '2026-11-26', at(31)); BL.setPattern(b, 6, ['sila-core'], at(32)); b.updated = at(32);
const m = S.merge(a, b);
check('merge: log from one device, plan changes from the other', !!BL.entryOf(m, MON, 'p0-bieg-spokojny') && names(m, '2026-11-26') === 'wspinanie,palce-20' && m.week[6].join() === 'sila-core');
BL.delLog(b, MON, 'p0-bieg-spokojny', at(40));
check('merge: later deletion marker wins', !BL.entryOf(S.merge(m, b), MON, 'p0-bieg-spokojny'));
const wiped = S.sanitize({}, MON); wiped.epoch = at(50); wiped.updated = at(50);
check('rehab history wipe keeps blocks and their log', !!BL.entryOf(S.merge(m, wiped), MON, 'p0-bieg-spokojny'));
const r = PL.defaults(MON); BL.logBlock(r, MON, 'p0-bieg-spokojny', g('bieg-spokojny'), { km: 5 }, at(60)); PL.actRestart(r, MON, true, at(61));
check('restart with wipe keeps the block log', !!BL.entryOf(r, MON, 'p0-bieg-spokojny'));

// projekty wspinaczkowe: próby z listy dróg, przejście, punkty, odznaka, walidacja i scalanie
const pj = PL.defaults(MON);
const rysa = BL.saveProject(pj, { name: 'Rysa', grade: '7a', start: '2026-11-20', place: 'Skała' }, at(70));
const luk = BL.saveProject(pj, { name: 'Łuk', grade: '6c', start: '2026-11-21' }, at(71));
const pj0 = PL.progress(pj, '2026-11-30');
check('project: new one is active, no tries, no points', BL.projectList(pj).active.length === 2 && BL.projectList(pj).active.every(p => p.tries === 0) && pj0.total === 0);
const climb = g('wspinanie');
BL.logBlock(pj, MON, 'p0-wspinanie', climb, { rl: [{ g: '7a', s: 'pr', p: rysa }, { g: '6b', s: 'rp' }, { g: '7a', s: 'pr', p: rysa }, { g: '6c', s: 'pr', p: luk }] }, at(72));
let pl = BL.projectList(pj), ry = pl.active.find(p => p.id === rysa);
check('project: tries and sessions from the route list', ry.tries === 2 && ry.sessions === 1 && ry.last === MON && !ry.sent);
check('project: an entry keeps the project id on its routes', BL.entryOf(pj, MON, 'p0-wspinanie').rl[0].p === rysa && !BL.entryOf(pj, MON, 'p0-wspinanie').rl[1].p);
const pjBefore = PL.progress(pj, '2026-11-30');
BL.logBlock(pj, '2026-11-25', 'p0-wspinanie', climb, { rl: [{ g: '7a', s: 'pr', p: rysa }, { g: '7a', s: 'rp', p: rysa }, { g: '7a', s: 'pr', p: rysa }] }, at(73));
pl = BL.projectList(pj); ry = pl.sent.find(p => p.id === rysa);
const pjAfter = PL.progress(pj, '2026-11-30');
const sendPts = pjAfter.byEntry['2026-11-25|prj:' + rysa];
check('project: RP marks it sent on that day, tries after the send do not count', !!ry && ry.sent.d === '2026-11-25' && ry.sent.s === 'rp' && ry.sent.tries === 4 && ry.tries === 4 && ry.sessions === 2 && pl.active.length === 1);
check('project: a send earns +20 on its day, counts to the climbing level, badge', sendPts === BL.PROJECT_PTS && pjAfter.climb.pts - pjBefore.climb.pts >= BL.PROJECT_PTS && pjAfter.badges.find(b => b.id === 'projekt1').d === '2026-11-25' && pjAfter.projectSends.length === 1);
BL.deleteProject(pj, rysa, at(74));
check('project: deleting it removes it and its send points, the log stays', !BL.projectList(pj).sent.length && !PL.progress(pj, '2026-11-30').byEntry['2026-11-25|prj:' + rysa] && !!BL.entryOf(pj, '2026-11-25', 'p0-wspinanie'));
const pjc = S.sanitize(JSON.parse(JSON.stringify(pj)), MON);
check('project: sanitize keeps projects, deletion markers and route project ids', pjc.projects[luk].name === 'Łuk' && pjc.projects[rysa].del === true && pjc.blog[MON]['p0-wspinanie'].rl[3].p === luk);
const pjBad = S.sanitize({ projects: { 'ZŁY': { name: 'x', grade: '7a', start: MON }, ok2: { name: 'y', grade: '9z', start: MON }, ok3: { name: '', grade: '6a', start: MON, place: 'Księżyc' } } }, MON);
check('project: sanitize drops bad ids and grades, unknown places, names default', !pjBad.projects['ZŁY'] && !pjBad.projects.ok2 && pjBad.projects.ok3.name === 'Projekt' && !pjBad.projects.ok3.place);
const pa = S.sanitize({}, MON), pb = S.sanitize({}, MON);
const pid = BL.saveProject(pa, { name: 'Stary', grade: '6b', start: MON }, at(80)); pa.updated = at(80);
pb.projects[pid] = { id: pid, name: 'Nowy', grade: '6b+', start: MON, at: at(81) }; pb.updated = at(79);
check('project: merge keeps the later edit, whichever device is newer overall', S.merge(pa, pb).projects[pid].name === 'Nowy' && S.merge(pb, pa).projects[pid].name === 'Nowy');
finish([]);
