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
check('no pulling exercises in built-in blocks (rehab rule)', !BL.BUILTIN.some(b => (b.items || []).some(i => /podciag|wioslow|australij|negatyw|lopatkowe|zwis-aktywny/.test(i.ex))));

// przeniesienie, pominięcie, dodanie, usunięcie
BL.moveItem(st, '2026-11-24', 'p0-palce-20', '2026-11-25', at(1));
check('move: gone from Tuesday, added to Wednesday', names(st, '2026-11-24') === 'wspinanie' && names(st, '2026-11-25') === 'bieg-przebiezki,rozc-bieg,palce-20');
BL.skipItem(st, MON, 'p1-rozc-bieg', true, at(2));
check('skip keeps the block, marked skipped', BL.dayView(st, MON).find(x => x.k === 'p1-rozc-bieg').skip === true);
const k = BL.addItem(st, '2026-11-28', 'sila-core', at(3));
BL.removeItem(st, '2026-11-28', 'p2-rozc-pelne', at(4));
check('add and remove on one day', names(st, '2026-11-28') === 'sila-pompki,sila-kolka,sila-core' && /^a/.test(k));
check('other weeks still follow the pattern', names(st, '2026-12-01') === 'palce-20,wspinanie');
BL.setPattern(st, 3, ['wspinanie'], at(5));
check('pattern change applies to days without changes only', names(st, '2026-12-02') === 'wspinanie' && names(st, '2026-11-25') === 'bieg-przebiezki,rozc-bieg,palce-20');

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
finish([]);
