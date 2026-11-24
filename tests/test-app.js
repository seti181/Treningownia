// Playwright: zakładki i podstrony, postęp, punkty, restart, etap, ćwiczenie z atlasu, waga.
// Ekrany do obejrzenia trafiają do shots/v2-*.png.
const { chromium } = require('playwright');
const { check, finish, built, ignorable, OUT, WEB, KEY, go } = require('./check');
const URL = built(WEB);
const errors = [];
const T = (m, d, h, mi) => new Date(2026, m - 1, d, h || 12, mi || 0);
const seedInit = st => 'localStorage.setItem(' + JSON.stringify(KEY) + ', ' + JSON.stringify(JSON.stringify(st)) + ')';

async function open(browser, o) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: o.reduce ? 'reduce' : 'no-preference' }, o.ctx || {}));
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: o.time });
  if (o.seed) await page.addInitScript(seedInit(o.seed));
  await page.goto(URL + (o.hash || ''));
  await page.clock.runFor(400);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();
  // 1) świeży stan, 11.11: Dziś, Postęp, Atlas, Plan (jasny, telefon)
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 14, 30) });
    await page.screenshot({ path: OUT + 'v2-01-dzis.png' });
    await page.screenshot({ path: OUT + 'v2-01-dzis-full.png', fullPage: true });
    await go(page, 'tydzien');
    await page.screenshot({ path: OUT + 'v2-05-tydzien.png', fullPage: true });
    check('1 week: seven days, today first', (await page.locator('.wk-day').count()) === 7 && /Dziś/.test(await page.textContent('.wk-day.is-today')));
    await go(page, 'dziennik');
    await page.screenshot({ path: OUT + 'v2-06-dziennik.png', fullPage: true });
    check('1 journal: calendar and an empty log', (await page.isVisible('#dziennik-in .cal')) && (await page.isVisible('#dziennik-in .empty')));
    await go(page, 'postep');
    await page.screenshot({ path: OUT + 'v2-02-postep.png', fullPage: true });
    await go(page, 'wiecej');
    await page.screenshot({ path: OUT + 'v2-07-wiecej.png' });
    check('1 more: five menu items', (await page.locator('#wiecej-in .menu-i').count()) === 5);
    await go(page, 'atlas'); await page.clock.runFor(1300);
    await page.screenshot({ path: OUT + 'v2-03-atlas.png' });
    check('1 atlas under Więcej: tab Więcej selected', (await page.getAttribute('#tb-wiecej', 'aria-selected')) === 'true' && (await page.isVisible('#tab-atlas')));
    await page.click('#tab-atlas .back-btn'); await page.clock.runFor(200);
    check('1 back button returns to Więcej', await page.isVisible('#wiecej-in .menu'));
    await go(page, 'ustawienia');
    await page.screenshot({ path: OUT + 'v2-08-ustawienia.png', fullPage: true });
    check('1 settings: no sync configured, backup and sound', /nie jest jeszcze włączona/.test(await page.textContent('#konto')) && (await page.isVisible('[data-act="bk-save"]')) && (await page.isVisible('input[name="snd"][value="beep"]')));
    await go(page, 'plan');
    await page.screenshot({ path: OUT + 'v2-04-plan.png', fullPage: true });
    const hdr = (await page.textContent('#hdr-prog')).replace(/\s+/g, ' ').trim();
    check('1 all pages open; header shows both levels and points', (await page.getAttribute('#tb-wiecej', 'aria-selected')) === 'true' && (await page.isVisible('#plan-in .card')) && /^6a/.test(hdr) && /Start/.test(hdr) && /pkt/.test(hdr), hdr);
    await page.focus('#tb-wiecej'); await page.keyboard.press('ArrowLeft'); await page.clock.runFor(100);
    check('1 arrow keys move along the tab bar from a sub page', (await page.getAttribute('#tb-postep', 'aria-selected')) === 'true');
    await ctx.close();
  }
  // 2) użytkownik z przerwą: 3 dni treningu 1–3.11, dziś 11.11
  const seed = { v: 1, start: '2026-11-01', phase: 1, phaseStart: '2026-11-01', rung: 1, rungGreen: 0, snooze: null, gates: {}, updated: 5,
    morning: { '2026-11-02': 'green', '2026-11-03': 'green' },
    log: {
      '2026-11-01': { rano: { done: true, at: T(11, 1, 8).getTime(), dur: 960, pain: 2, label: 'Rano' }, wieczor: { done: true, at: T(11, 1, 19).getTime(), dur: 1180, pain: 2, label: 'Po pracy' } },
      '2026-11-02': { rano: { done: true, at: T(11, 2, 8).getTime(), dur: 950, pain: 1, label: 'Rano' }, wieczor: { done: true, at: T(11, 2, 19).getTime(), dur: 1200, pain: 3, label: 'Po pracy' } },
      '2026-11-03': { rano: { done: true, at: T(11, 3, 8).getTime(), dur: 990, pain: 2, label: 'Rano', note: 'zwis lekko ciągnął' } }
    } };
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 14, 30), seed });
    const alertTxt = await page.textContent('.alert.ask');
    check('2 break alert after 8 days off', /Ostatni trening: 3 listopada, 8 dni temu/.test(alertTxt), alertTxt.replace(/\s+/g, ' ').slice(0, 90));
    await page.screenshot({ path: OUT + 'v2-10-break.png' });
    // restart od jutra, z historią
    await page.click('[data-act="go-restart"]'); await page.clock.runFor(300);
    await page.check('input[name="rs-when"][value="tomorrow"]');
    await page.click('[data-act="restart-ask"]');
    await page.screenshot({ path: OUT + 'v2-11-restart-confirm.png' });
    await page.click('[data-act="restart-do"]'); await page.clock.runFor(300);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('treningownia-v1')));
    check('2 restart from tomorrow keeps history', st.start === '2026-11-12' && st.phase === 1 && Object.keys(st.log).length === 3 && st.events.some(e => e.k === 'restart' && e.d === '2026-11-12') && /Start jutro/.test(await page.textContent('.t-title')), 'start ' + st.start + ', logs ' + Object.keys(st.log).length);
    await page.screenshot({ path: OUT + 'v2-12-after-restart.png' });
    // ustaw etap ręcznie: Faza 1 dzień 3
    await go(page, 'plan');
    await page.selectOption('#st-phase', '2'); await page.clock.runFor(100);
    await page.fill('#st-day', '4');
    await page.click('[data-act="stage-set"]'); await page.clock.runFor(200);
    const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('treningownia-v1')));
    check('2 stage set by hand: phase 2, day 4', st2.phase === 2 && st2.dayOffset === 3, 'phase ' + st2.phase + ', dayOffset ' + st2.dayOffset + ', phaseStart ' + st2.phaseStart);
    await ctx.close();
  }
  // 3) sesja z punktami: kontynuacja po przerwie (dzień 4), cała sesja przez Dalej
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 8, 0), seed, reduce: true });
    const before = (await page.textContent('#hdr-prog')).replace(/\s+/g, ' ').trim();
    await page.click('[data-act="break-continue"]'); await page.clock.runFor(200);
    const phaseLine = await page.textContent('.phase-meta');
    await page.click('[data-act="start"][data-s="rano"]');
    await page.clock.runFor(500);
    await page.screenshot({ path: OUT + 'v2-20-player.png' });
    let n = 0; while (!(await page.isVisible('#pl-done')) && n++ < 120) await page.click('[data-pl="next"]');
    await page.click('[data-pain="2"]'); await page.clock.runFor(300);
    await page.screenshot({ path: OUT + 'v2-21-done-points.png', fullPage: true });
    const gain = await page.textContent('#dn-gain');
    const why = (await page.textContent('#dn-why')).replace(/\s+/g, ' ');
    await page.click('[data-pl="close"]'); await page.clock.runFor(300);
    const after = (await page.textContent('#hdr-prog')).replace(/\s+/g, ' ').trim();
    check('3 continue after break: training day 4', /dzień treningowy 4/.test(phaseLine), phaseLine.replace(/\s+/g, ' '));
    check('3 full session earns points (session, pain, comeback)', /^\+\d+$/.test(gain.trim()) && +gain.trim().slice(1) > 0 && /Powrót po przerwie/.test(why) && after !== before, gain + ' | ' + why + ' | ' + before + ' → ' + after);
    await page.screenshot({ path: OUT + 'v2-22-after-session.png' });
    await go(page, 'postep');
    await page.screenshot({ path: OUT + 'v2-23-postep-data.png', fullPage: true });
    await go(page, 'dziennik');
    await page.screenshot({ path: OUT + 'v2-24-dziennik-data.png', fullPage: true });
    check('3 journal lists the sessions by day, newest first', (await page.locator('.jr-day').count()) === 4 && /Dziś/.test(await page.textContent('.jr-day >> nth=0')), await page.textContent('.jr-day >> nth=0'));
    await ctx.close();
  }
  // 4) ćwiczenie z atlasu
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 18, 0), hash: '#atlas' });
    // wyszukiwanie: bez polskich znaków, odmiana, kategoria, brak wyników, czyszczenie
    const shown = () => page.evaluate(() => [...document.querySelectorAll('#tab-atlas .card')].filter(c => !c.hidden).map(c => c.dataset.id));
    await page.fill('#atlas-q', 'lydki'); await page.clock.runFor(300);
    check('4 search "lydki" finds the calf stretch', (await shown()).join() === 'r-lydki', (await shown()).join());
    await page.fill('#atlas-q', 'pompki'); await page.clock.runFor(300);
    check('4 search "pompki" finds the push-ups (word stem)', (await shown()).includes('pompka-klasyczna') && (await shown()).includes('kolka-pompka'));
    await page.fill('#atlas-q', 'core'); await page.clock.runFor(300);
    check('4 search by category: core', (await shown()).length === 6 && (await page.locator('#tab-atlas .chips li:not([hidden])').count()) === 1);
    await page.fill('#atlas-q', 'qqq'); await page.clock.runFor(300);
    check('4 no results: message', /Brak ćwiczeń/.test(await page.textContent('#atlas-empty')) && (await page.isVisible('#atlas-empty')));
    await page.click('#atlas-x'); await page.clock.runFor(100);
    check('4 clear: everything back, 10 category chips', (await shown()).length > 50 && (await page.locator('#tab-atlas .chips li:not([hidden])').count()) === 10);
    await page.click('[data-ex="kolka-z-nogami"]'); await page.clock.runFor(1500);
    check('4 single exercise from the atlas opens the player', (await page.textContent('#pl-ex')) === 'Ćwiczenie z atlasu' && /Podciąganie na kółkach/.test(await page.textContent('#pl-name')));
    await page.screenshot({ path: OUT + 'v2-30-single.png' });
    await page.click('[data-pl="exit"]'); await page.click('[data-pl="quit"]'); await page.clock.runFor(200);
    check('4 back on the Atlas page, nothing logged', (await page.isVisible('#tab-atlas')) && (await page.getAttribute('#tb-wiecej', 'aria-selected')) === 'true' && (await page.evaluate(() => localStorage.getItem('treningownia-v1'))) === null);
    await ctx.close();
  }
  // 5) ciemny, pulpit
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 18, 0), seed, ctx: { colorScheme: 'dark', viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 } });
    await page.screenshot({ path: OUT + 'v2-40-dark-dzis.png' });
    await go(page, 'postep');
    await page.screenshot({ path: OUT + 'v2-41-dark-postep.png', fullPage: true });
    await go(page, 'tydzien');
    await page.screenshot({ path: OUT + 'v2-43-dark-tydzien.png', fullPage: true });
    await go(page, 'ustawienia');
    await page.screenshot({ path: OUT + 'v2-44-dark-ustawienia.png', fullPage: true });
    await go(page, 'atlas'); await page.clock.runFor(1300);
    await page.screenshot({ path: OUT + 'v2-42-dark-atlas.png' });
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check('5 desktop dark: no horizontal overflow', !ov);
    await ctx.close();
  }
  // 6) mały telefon
  {
    const { ctx, page } = await open(b, { time: T(11, 11, 18, 0), seed, ctx: { viewport: { width: 320, height: 640 } } });
    await page.screenshot({ path: OUT + 'v2-50-small.png' });
    for (const t of ['tydzien', 'dziennik', 'postep', 'wiecej', 'waga', 'atlas', 'plan', 'ustawienia']) { await go(page, t); await page.clock.runFor(100); const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); check('6 320px: no horizontal overflow on ' + t, !ov); if (['tydzien', 'dziennik', 'wiecej', 'ustawienia'].includes(t)) await page.screenshot({ path: OUT + 'v2-5x-small-' + t + '.png', fullPage: true }); }
    // 320 px: stany wagi (edycja, pytanie o usunięcie, rozwinięta lista) nie rozpychają strony
    {
      const wide = () => page.evaluate(() => { const bad = []; document.querySelectorAll('#tab-waga *, #tab-dzis *').forEach(n => { const r = n.getBoundingClientRect(); if (r.width && r.right > window.innerWidth + 0.5) bad.push(n.className || n.tagName); }); return (document.documentElement.scrollWidth > window.innerWidth ? 'PAGE ' : '') + bad.slice(0, 4).join(','); });
      await go(page, 'dzis');
      await page.fill('#wq-kg', '66,4'); await page.press('#wq-kg', 'Enter'); await page.clock.runFor(200);
      await page.click('[data-act="w-edit"]'); await page.clock.runFor(100);
      const w1 = await wide();
      check('6 320px: weight edit row fits', !w1, w1);
      await page.screenshot({ path: OUT + 'v2-52-small-edit.png' });
      await page.press('#wq-kg', 'Escape');
      await go(page, 'waga');
      await page.fill('#w-add-date', '2026-11-09'); await page.fill('#w-add-kg', '67,2'); await page.press('#w-add-kg', 'Enter'); await page.clock.runFor(200);
      await page.fill('#w-goal-kg', '64'); await page.press('#w-goal-kg', 'Enter'); await page.clock.runFor(200);
      await page.click('.wtab [data-act="w-del"] >> nth=1'); await page.clock.runFor(100);
      const w2 = await wide();
      check('6 320px: weight tab with delete question fits', !w2, w2);
      await page.waitForTimeout(260);
      await page.screenshot({ path: OUT + 'v2-53-small-waga.png', fullPage: true });
    }
    await go(page, 'postep');
    await page.screenshot({ path: OUT + 'v2-51-small-postep.png', fullPage: true });
    await ctx.close();
  }
  // 7) waga: wpis dnia, walidacja, poprawka, wykres, pomiar z innego dnia, cel, usuwanie, zakres, klawiatura, restart z czyszczeniem
  {
    const { ctx, page } = await open(b, { time: T(11, 12, 7, 30) });
    const ok = (name, cond, extra) => check('7 ' + name, cond, extra);
    const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('treningownia-v1') || 'null'));
    const txt = async q => ((await page.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    const hdr0 = await txt('#hdr-prog');
    await page.fill('#wq-kg', 'abc'); await page.press('#wq-kg', 'Enter'); await page.clock.runFor(100);
    ok('zły wpis: błąd, nic nie zapisane', (await page.isVisible('#wq-kg-h.is-err')) && (await page.getAttribute('#wq-kg', 'aria-invalid')) === 'true' && !(await st()), await txt('#wq-kg-h'));
    ok('fokus zostaje w polu', await page.evaluate(() => document.activeElement && document.activeElement.id === 'wq-kg'));
    await page.fill('#wq-kg', '664'); await page.press('#wq-kg', 'Enter'); await page.clock.runFor(100);
    ok('literówka 664 odrzucona', !(await st()));
    await page.fill('#wq-kg', '66,4');
    ok('błąd znika przy pisaniu', !(await page.isVisible('#wq-kg-h.is-err')) && (await page.getAttribute('#wq-kg', 'aria-invalid')) == null);
    await page.press('#wq-kg', 'Enter'); await page.clock.runFor(200);
    let s1 = await st();
    ok('zapis 66,4 przez Enter', s1 && s1.weight['2026-11-12'].kg === 66.4, 'toast: ' + await txt('#toast') + ' | wiersz: ' + await txt('.wq.is-set'));
    ok('waga nie daje punktów', (await txt('#hdr-prog')) === hdr0, hdr0);
    ok('fokus na Zmień', await page.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'w-edit'));
    await page.screenshot({ path: OUT + 'v2-60-dzis-waga.png' });
    await page.click('[data-act="w-edit"]'); await page.clock.runFor(100);
    ok('Zmień: pole z wartością', (await page.inputValue('#wq-kg')) === '66,4');
    await page.press('#wq-kg', 'Escape'); await page.clock.runFor(100);
    ok('Escape anuluje zmianę', (await page.isVisible('.wq.is-set')) && (await st()).weight['2026-11-12'].kg === 66.4);
    await page.click('[data-act="w-edit"]'); await page.clock.runFor(100);
    await page.click('[data-act="w-cancel"]'); await page.clock.runFor(100);
    ok('przycisk × anuluje zmianę', await page.isVisible('.wq.is-set'));
    await page.click('[data-act="w-edit"]'); await page.clock.runFor(100);
    await page.fill('#wq-kg', '66.1'); await page.click('.wq [data-act="w-submit"]'); await page.clock.runFor(200);
    s1 = await st();
    ok('poprawka z kropką 66.1', s1.weight['2026-11-12'].kg === 66.1, await txt('.wq-v'));
    // zakładka Waga
    await page.click('.wq [data-act="tab"][data-v="waga"]'); await page.clock.runFor(200);
    ok('link Wykres otwiera stronę Waga', (await page.isVisible('#tab-waga')) && (await page.getAttribute('#tb-wiecej', 'aria-selected')) === 'true' && (await page.isVisible('#wchart svg')));
    ok('jeden punkt, odczyt', (await page.locator('#wchart .wc-dot').count()) === 1, await txt('#wc-read'));
    // pomiar z innego dnia
    ok('domyślny dzień: wczoraj (najbliższy bez pomiaru)', (await page.inputValue('#w-add-date')) === '2026-11-11');
    await page.fill('#w-add-date', '2026-11-20'); await page.fill('#w-add-kg', '67'); await page.click('.wadd [data-act="w-submit"]'); await page.clock.runFor(100);
    ok('data z przyszłości odrzucona', (await page.isVisible('#w-add-h.is-err')) && Object.keys((await st()).weight).length === 1, await txt('#w-add-h'));
    await page.fill('#w-add-date', '2026-11-10'); await page.clock.runFor(50);
    ok('zmiana daty czyści błąd bez utraty wagi', !(await page.isVisible('#w-add-h.is-err')) && (await page.inputValue('#w-add-kg')) === '67');
    await page.press('#w-add-kg', 'Enter'); await page.clock.runFor(200);
    s1 = await st();
    ok('pomiar 10.11 = 67,0', s1.weight['2026-11-10'] && s1.weight['2026-11-10'].kg === 67, 'toast: ' + await txt('#toast'));
    ok('tabela ma 2 wiersze, wykres 2 punkty', (await page.locator('.wtab tbody tr').count()) === 2 && (await page.locator('#wchart .wc-dot').count()) === 2, await txt('.w-deltas'));
    await page.fill('#w-add-date', '2026-11-10'); await page.clock.runFor(50);
    ok('podpowiedź o istniejącym pomiarze', /ma już pomiar: 67,0/.test(await txt('#w-add-h')), await txt('#w-add-h'));
    // cel
    await page.fill('#w-goal-kg', 'x'); await page.press('#w-goal-kg', 'Enter'); await page.clock.runFor(100);
    ok('zły cel: błąd', await page.isVisible('#w-goal-h.is-err'));
    await page.fill('#w-goal-kg', '64'); await page.press('#w-goal-kg', 'Enter'); await page.clock.runFor(200);
    s1 = await st();
    ok('cel 64 zapisany, linia na wykresie', s1.weightGoal === 64 && s1.weightGoalAt > 0 && (await page.locator('#wchart .wc-goal').count()) === 1, await txt('.w-deltas') + ' | ' + await txt('#w-goal-h'));
    await page.locator('.wcard').screenshot({ path: OUT + 'v2-61-waga-karta.png' });
    // wskazywanie punktu: mysz i klawiatura
    const box = await page.locator('#wchart').boundingBox();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5); await page.clock.runFor(50);
    ok('mysz: krzyż i odczyt punktu', (await page.locator('#wchart .wc-hover').evaluate(n => n.style.display !== 'none')) && /wt 10 lis/.test(await txt('#wc-read')), await txt('#wc-read'));
    await page.mouse.move(5, 5); await page.clock.runFor(50);
    ok('mysz poza wykresem: odczyt wraca do ostatniego', (await page.locator('#wchart .wc-hover').evaluate(n => n.style.display === 'none')) && /dziś/.test(await txt('#wc-read')));
    await page.focus('#wchart'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.clock.runFor(50);
    ok('strzałki: wcześniejszy pomiar', /wt 10 lis/.test(await txt('#wc-read')), await txt('#wc-read'));
    await page.keyboard.press('Escape');
    // usuwanie z potwierdzeniem
    await page.click('[data-act="w-del"][data-d="2026-11-10"]'); await page.clock.runFor(100);
    ok('pytanie przed usunięciem, fokus na Zostaw', (await page.isVisible('.wtab .is-del')) && (await page.evaluate(() => document.activeElement.dataset.act === 'w-del-no')), await txt('.wtab .is-del'));
    await page.click('[data-act="w-del-no"]'); await page.clock.runFor(100);
    ok('Zostaw: nic nie znika', (await page.locator('.wtab tbody tr').count()) === 2 && !(await page.isVisible('.wtab .is-del')));
    await page.click('[data-act="w-del"][data-d="2026-11-10"]'); await page.click('[data-act="w-del-yes"]'); await page.clock.runFor(200);
    s1 = await st();
    ok('Usuń: znacznik usunięcia, 1 wiersz', s1.weight['2026-11-10'].del === true && (await page.locator('.wtab tbody tr').count()) === 1, 'toast: ' + await txt('#toast'));
    // zakres
    await page.click('[data-act="w-range"][data-v="90"]'); await page.clock.runFor(100);
    ok('zakres 90 dni', (await page.getAttribute('[data-act="w-range"][data-v="90"]', 'aria-pressed')) === 'true' && (await page.isVisible('#wchart svg')), await txt('.w-deltas'));
    await page.click('[data-act="w-goal-clear"]'); await page.clock.runFor(200);
    ok('cel usunięty', (await st()).weightGoal === null && (await page.locator('#wchart .wc-goal').count()) === 0);
    // po odświeżeniu dane są; restart z czyszczeniem historii nie rusza wagi
    await page.reload(); await page.clock.runFor(400);
    ok('po odświeżeniu: wiersz z wagą', /66,1/.test(await txt('.wq.is-set')));
    await go(page, 'plan');
    await page.check('#rs-wipe'); await page.click('[data-act="restart-ask"]');
    ok('potwierdzenie mówi o wadze i blokach', /Pomiary wagi i bloki treningowe zostają/.test(await txt('.confirm')));
    await page.click('[data-act="restart-do"]'); await page.clock.runFor(300);
    s1 = await st();
    ok('czyszczenie historii zostawia wagę', s1.epoch > 0 && s1.weight['2026-11-12'].kg === 66.1 && s1.weight['2026-11-10'].del === true);
    await ctx.close();
  }
  // 8) waga z historią: dotyk, lista „pokaż wszystkie”, puste okno 30 dni, zmiana szerokości
  {
    const w = {};
    let kg = 68.6;
    for (let i = 59; i >= 0; i--) { const d = new Date(2026, 10, 12 - i, 12); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (i % 6 !== 4) w[k] = { kg: Math.round((kg + Math.sin(i * 1.7) * 0.45) * 10) / 10, at: d.getTime() }; kg -= 0.05; }
    const seedW = { v: 2, epoch: 0, start: '2026-11-11', phase: 1, phaseStart: '2026-11-11', dayOffset: 0, rung: 1, rungGreen: 0, snooze: null, breakAck: null, gates: {}, log: {}, morning: {}, events: [], weight: w, weightGoal: 64, weightGoalAt: 5, updated: 9 };
    const { ctx, page } = await open(b, { time: T(11, 12, 7, 30), seed: seedW, hash: '#waga', ctx: { hasTouch: true } });
    const ok = (name, cond, extra) => check('8 ' + name, cond, extra);
    const txt = async q => ((await page.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    await page.waitForTimeout(250);
    await page.screenshot({ path: OUT + 'v2-62-waga.png', fullPage: true });
    ok('start z #waga', (await page.isVisible('#tab-waga')) && (await page.getAttribute('#tb-wiecej', 'aria-selected')) === 'true', await txt('.w-head'));
    const n30 = await page.locator('#wchart .wc-dot').count();
    ok('lista: 7 wierszy i przycisk', (await page.locator('.wtab tbody tr').count()) === 7, await txt('.w-more'));
    await page.click('.w-more'); await page.clock.runFor(100);
    ok('pokaż wszystkie', (await page.locator('.wtab tbody tr').count()) === n30, n30 + ' wierszy');
    await page.evaluate(() => document.querySelector('.wcard').scrollIntoView({ block: 'center' }));
    const box = await page.locator('#wchart').boundingBox();
    await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.4); await page.clock.runFor(50);
    await page.waitForTimeout(400);
    const r1 = await txt('#wc-read');
    ok('dotyk: punkt zostaje wskazany', (await page.locator('#wchart .wc-hover').evaluate(n => n.style.display !== 'none')) && !/dziś/.test(r1), r1 + ' | y=' + Math.round(box.y));
    await page.locator('.wcard').screenshot({ path: OUT + 'v2-63-waga-dotyk.png' });
    const hb = await page.locator('.w-head').boundingBox();
    await page.touchscreen.tap(hb.x + 30, hb.y + 10); await page.clock.runFor(50);
    ok('dotyk poza wykresem: powrót', await page.locator('#wchart .wc-hover').evaluate(n => n.style.display === 'none'), await txt('#wc-read'));
    await page.click('[data-act="w-range"][data-v="0"]'); await page.clock.runFor(100);
    ok('wszystko: więcej punktów', (await page.locator('#wchart .wc-dot').count()) > n30, (await page.locator('#wchart .wc-dot').count()) + ' punktów | ' + await txt('.w-deltas'));
    const w0 = await page.locator('#wchart svg').getAttribute('width');
    await page.setViewportSize({ width: 700, height: 844 });
    // zdarzenie resize przychodzi asynchronicznie: najpierw poczekaj na nie, potem przewiń zegar strony za opóźnienie (150 ms)
    await page.waitForFunction(() => window.innerWidth === 700); await page.waitForTimeout(100); await page.clock.runFor(400);
    const w1 = await page.locator('#wchart svg').getAttribute('width');
    ok('zmiana szerokości przerysowuje wykres', +w1 > +w0, w0 + ' → ' + w1);
    await ctx.close();
    // stare pomiary, nic w ostatnich 30 dniach
    const old = Object.assign({}, seedW, { weight: { '2026-08-01': { kg: 70, at: 1 }, '2026-08-03': { kg: 69.6, at: 2 } }, weightGoal: null, weightGoalAt: 0 });
    const o = await open(b, { time: T(11, 12, 7, 30), seed: old, hash: '#waga' });
    check('8 puste okno 30 dni', (await o.page.isVisible('.wcard .empty')) && !(await o.page.isVisible('#wchart')), ((await o.page.textContent('.wcard .empty')) || '').trim());
    await o.page.click('[data-act="w-range"][data-v="0"]'); await o.page.clock.runFor(100);
    check('8 „Wszystko” pokazuje stare pomiary', await o.page.isVisible('#wchart svg'), ((await o.page.textContent('.w-deltas')) || '').replace(/\s+/g, ' ').trim());
    await o.ctx.close();
  }
  await b.close();
  finish(errors);
})();
