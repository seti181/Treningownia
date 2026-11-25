// Stan bez przeglądarki: walidacja, scalanie dwóch kopii (dwa urządzenia), znaczniki usunięcia, czyszczenie historii, plik kopii.
const { check, finish } = require('./check');
require('../src/core.js'); require('../src/plan.js');
const S = require('../src/store.js');
const T = (d, h, m) => new Date(2026, 10, d, h, m || 0).getTime();
const base = () => S.sanitize({
  start: '2026-11-01', phase: 1, phaseStart: '2026-11-01', updated: T(1, 18, 30),
  log: { '2026-11-01': { rano: { done: true, at: T(1, 7, 40), dur: 960, pain: 2, label: 'Rano' } } }
}, '2026-11-01');

// sanitize
const junk = S.sanitize({ phase: 9, start: 'wczoraj', hack: 1, log: { 'zły': {}, '2026-11-02': { 'X!': { done: true } } }, weight: { '2026-11-02': { kg: 9999 } } }, '2026-11-05');
check('sanitize keeps only known keys and valid values', junk.phase === 1 && junk.start === '2026-11-05' && !('hack' in junk) && !Object.keys(junk.log).length && !Object.keys(junk.weight).length && junk.v === 3);

// merge: logi z obu stron, nowszy stan bazą
const a = base(), b = base();
a.morning['2026-11-02'] = 'green'; a.updated = T(2, 8);
b.log['2026-11-02'] = { rano: { done: true, at: T(2, 7, 50), dur: 990, pain: 3, label: 'Rano' } }; b.phase = 2; b.updated = T(2, 9);
const m = S.merge(a, b);
check('merge: sessions and morning answers from both devices', m.morning['2026-11-02'] === 'green' && m.log['2026-11-02'].rano.pain === 3 && m.log['2026-11-01'].rano);
check('merge: newer device sets the plan', m.phase === 2);
check('merge is symmetric', S.canon(S.merge(a, b)) === S.canon(S.merge(b, a)));
check('merge with itself changes nothing', S.canon(S.merge(m, m)) === S.canon(m));

// waga: późniejszy zapis dnia wygrywa, także znacznik usunięcia
const w1 = base(), w2 = base();
w1.weight['2026-11-02'] = { kg: 72, at: T(2, 7) };
w2.weight['2026-11-02'] = { del: true, at: T(2, 9) };
w2.weight['2026-11-01'] = { kg: 72.4, at: T(1, 7) };
w1.weightGoal = 56; w1.weightGoalAt = T(2, 7);
const mw = S.merge(w1, w2);
check('weight: deletion marker wins over an older entry', mw.weight['2026-11-02'].del === true && mw.weight['2026-11-01'].kg === 72.4);
check('weight: goal follows the later change', mw.weightGoal === 56);
const old = base(); old.weight['2026-11-02'] = { kg: 72, at: T(2, 7) }; old.updated = 5;
check('weight: stale copy does not bring a deleted entry back', S.merge(mw, old).weight['2026-11-02'].del === true);

// czyszczenie historii (nowa epoka) wygrywa w całości, waga zostaje
const wiped = base(); wiped.epoch = T(3, 10); wiped.log = {}; wiped.updated = T(3, 10); wiped.weight = { '2026-10-30': { kg: 73, at: 1 } };
const mx = S.merge(mw, wiped);
check('history wiped elsewhere: plan clean, weight kept from both', mx.epoch === wiped.epoch && !Object.keys(mx.log).length && mx.weight['2026-10-30'] && mx.weight['2026-11-01'] && mx.weightGoal === 56);

// kopia zapasowa
const bk = S.backup(m, T(3, 12));
const r = S.readBackup(JSON.stringify(bk), '2026-11-03');
check('backup: round trip gives the same state', !r.error && S.canon(r.state) === S.canon(m) && r.counts.sessions === 2 && r.exported === bk.exported, JSON.stringify(r.counts));
check('backup: file name', S.backupName('2026-11-24') === 'treningownia-kopia-2026-11-24.json');
check('backup: wrong file is refused', !!S.readBackup('{"a":1}', '2026-11-03').error && !!S.readBackup('nie json', '2026-11-03').error);
check('backup: newer format is refused', /nowszej wersji/.test(S.readBackup(JSON.stringify(Object.assign({}, bk, { format: 9 })), '2026-11-03').error || ''));
const imp = S.merge(S.sanitize({}, '2026-11-24'), r.state);
check('backup: importing into an empty device restores everything', S.canon(imp) === S.canon(m));
// wrogi plik kopii: klucz __proto__ w props nie podmienia prototypu
const evil = S.sanitize(JSON.parse('{"props":{"__proto__":{"s":"ok","d":"2026-11-01","at":1,"text":"x"},"bieg:a:30":{"s":"no","d":"2026-11-01","at":1}}}'), '2026-11-03');
check('sanitize: a "__proto__" proposal id is dropped', Object.getPrototypeOf(evil.props) === Object.prototype && evil.props.s === undefined && Object.keys(evil.props).join() === 'bieg:a:30');
finish([]);
