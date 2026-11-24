// Logika planu (bez przeglądarki): kalendarz faz, długości sesji, poranek żółty/czerwony, HTML zakładki Dziś.
const { check, finish } = require('./check');
require('../src/core.js'); const PL = require('../src/plan.js'); const V = require('../src/views.js');
const ids = (d, s) => PL.dayPlan(d, s).sessions.map(x => x.id).join(',');
const mins = (d, s) => PL.dayPlan(d, s).sessions.map(x => Math.round(PL.seconds(x) / 60));
const st = PL.defaults();
function show(d, s){ const dp = PL.dayPlan(d, s); return d + ' ' + (dp.practice?'[próba] ':'') + 'F'+dp.phase+' d'+(dp.day+1)+' :: ' + dp.sessions.map(x => x.label+': '+x.title+' ('+Math.round(PL.seconds(x)/60)+' min, '+PL.steps(x).length+' kroków)').join(' | ') + (dp.notes.length? ' + '+dp.notes.map(n=>n.tag).join(','):'') + (dp.advice? ' ['+dp.advice.level+']':''); }
console.log(show('2026-10-31', st));
for (let i=0;i<8;i++) console.log(show(PL.addDays('2026-11-01', i), st));
const s2 = Object.assign(PL.defaults(), {phase:2, phaseStart:'2026-11-08'});
for (let i=0;i<7;i++) console.log(show(PL.addDays('2026-11-08', i), s2));
const s3 = Object.assign(PL.defaults(), {phase:3, phaseStart:'2026-11-29'});
console.log(show('2026-11-30', s3));
const s4 = Object.assign(PL.defaults(), {phase:4, phaseStart:'2026-12-20', rung:3});
console.log(show('2026-12-21', s4)); console.log(show('2026-12-22', s4));
const s5 = Object.assign(PL.defaults(), {phase:5, phaseStart:'2027-01-10'});
console.log(show('2027-01-11', s5));
// tygodniowy układ i długości sesji (liczby muszą zgadzać się z dokumentem planu)
check('before start: practice mode, two sessions', PL.dayPlan('2026-10-31', st).practice && ids('2026-10-31', st) === 'rano,wieczor');
check('F1: morning and after-work session every day', [0, 1, 2, 3, 4, 5, 6, 7].every(i => ids(PL.addDays('2026-11-01', i), st) === 'rano,wieczor'));
check('F1: about 16 and 19 min', mins('2026-11-01', st).join() === '16,19', mins('2026-11-01', st).join(' + ') + ' min');
check('F2: strength Mon/Wed/Fri, light day otherwise', [0, 1, 2, 3, 4, 5, 6].every(i => { const d = PL.addDays('2026-11-08', i); return ids(d, s2) === ([1, 3, 5].includes(PL.dow(d)) ? 'sila' : 'lekki'); }));
check('F2 about 48 min, light day 10 min', mins('2026-11-09', s2)[0] === 48 && mins('2026-11-08', s2)[0] === 10);
check('F3 about 56 min', mins('2026-11-30', s3)[0] === 56);
check('F4: ladder Mon/Thu (about 36 min), light day otherwise', ids('2026-12-21', s4) === 'drabinka' && ids('2026-12-24', s4) === 'drabinka' && ids('2026-12-22', s4) === 'lekki' && mins('2026-12-21', s4)[0] === 36);
check('F5: maintenance Mon/Thu (about 19 min)', ids('2027-01-11', s5) === 'sila' && ids('2027-01-14', s5) === 'sila' && ids('2027-01-12', s5) === 'lekki' && mins('2027-01-11', s5)[0] === 19);
// yellow / red mornings
const sy = PL.defaults(); sy.morning['2026-11-04'] = 'yellow'; console.log('yellow F1', show('2026-11-04', sy), PL.dayPlan('2026-11-04', sy).sessions[0].blocks[1].hold+'s', PL.dayPlan('2026-11-04', sy).sessions[0].blocks[1].note);
const sr = PL.defaults(); sr.morning['2026-11-07'] = 'red'; console.log('red F1', show('2026-11-07', sr));
check('yellow morning in F1: 10 s holds at about 30%', PL.dayPlan('2026-11-04', sy).sessions[0].blocks[1].hold === 10 && /30%/.test(PL.dayPlan('2026-11-04', sy).sessions[0].blocks[1].note || ''));
check('red morning: only the light session', ids('2026-11-07', sr) === 'lekki');
const s2y = Object.assign(PL.defaults(), {phase:2, phaseStart:'2026-11-08'}); s2y.morning['2026-11-09']='yellow'; console.log('yellow F2', show('2026-11-09', s2y), PL.dayPlan('2026-11-09', s2y).sessions[0].blocks[6].sets+' sets');
check('yellow morning in F2: one set fewer', PL.dayPlan('2026-11-09', s2y).sessions[0].blocks[6].sets === PL.dayPlan('2026-11-09', s2).sessions[0].blocks[6].sets - 1);
// steps sanity for day-1 morning
const am = PL.dayPlan('2026-11-01', st).sessions[0];
const stp = PL.steps(am);
console.log(stp.slice(0,6).map(x => x.k+':'+(x.b?x.b.ex:'')+':'+(x.set||'')+':'+(x.dur==null?'reps':x.dur)).join('  '));
// HTML renders
const h = V.todayHTML(st, '2026-10-31', 'test', Date.now(), PL.progress(st, '2026-10-31'));
check('Today panel before start offers a try-out', /Wypróbuj/.test(h), h.length + ' chars');
const st2 = PL.defaults(); const at = new Date(2026,10,1,7,30).getTime(); st2.log['2026-11-01'] = {rano:{done:true,pain:2,at,label:'Rano'}};
const h2 = V.todayHTML(st2, '2026-11-02', 'x', at, PL.progress(st2, '2026-11-02'));
check('morning check is asked after a training day', /Jak bark dziś rano/.test(h2));
const h2b = V.todayHTML(st2, '2026-11-01', 'x', at + 3600e3, PL.progress(st2, '2026-11-01'));
check('after-work session waits about 6 h after the morning one', (h2b.match(/Najlepiej po [0-9:]+/) || [''])[0] === 'Najlepiej po 13:30');
check('done session shows its pain score', /Zrobione · ból 2\/10/.test(h2b));
const st3 = PL.defaults('2026-11-01'); st3.dayOffset = 7; const h3 = V.todayHTML(st3, '2026-11-09', 'x', 0, PL.progress(st3, '2026-11-09'));
check('phase gate alert when the phase length is reached', /Za Tobą typowa liczba dni/.test(h3));
finish([]);
