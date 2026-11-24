// Synchronizacja z kontem przeciw atrapie Firebase (Auth + Firestore REST): dwa urządzenia, logowanie, pierwszy zapis,
// odczyt na drugim urządzeniu, konflikt zapisu, wygasły token, brak sieci, brak pętli zapisów, wylogowanie.
const { chromium } = require('playwright');
const { check, finish, built, ignorable, OUT, WEB, KEY, go } = require('./check');
const APP = built(WEB);
const PASS = 'tajne-haslo';

// ---------- atrapa Firebase ----------
const srv = { doc: null, seq: 0, writes: 0, gets: 0, tokens: 0, ids: { id1: true }, race: null, down: false, revoked: false };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' };
const json = (route, status, body) => route.fulfill({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS), body: JSON.stringify(body) });
const stamp = () => '2026-11-24T08:00:' + String(++srv.seq).padStart(2, '0') + '.123456Z';
async function fake(route) {
  const req = route.request(), u = new URL(req.url());
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (srv.down) return route.abort('internetdisconnected');
  if (u.hostname === 'identitytoolkit.googleapis.com') {
    const b = JSON.parse(req.postData() || '{}');
    if (u.searchParams.get('key') !== 'test-key' || b.password !== PASS) return json(route, 400, { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } });
    return json(route, 200, { localId: 'u1', email: b.email, idToken: 'id1', refreshToken: 'r1', expiresIn: '3600' });
  }
  if (u.hostname === 'securetoken.googleapis.com') {
    srv.tokens++;
    if (srv.revoked) return json(route, 400, { error: { code: 400, message: 'TOKEN_EXPIRED' } });
    const id = 'id' + (srv.tokens + 1);
    srv.ids[id] = true;
    return json(route, 200, { id_token: id, refresh_token: 'r1', expires_in: '3600', user_id: 'u1' });
  }
  if (u.hostname === 'firestore.googleapis.com') {
    const tok = (req.headers().authorization || '').replace('Bearer ', '');
    if (!srv.ids[tok]) return json(route, 401, { error: { code: 401, status: 'UNAUTHENTICATED' } });
    if (!/\/projects\/test-proj\/databases\/\(default\)\/documents\/users\/u1$/.test(decodeURIComponent(u.pathname))) return json(route, 403, { error: { code: 403, status: 'PERMISSION_DENIED' } });
    if (req.method() === 'GET') {
      srv.gets++;
      if (!srv.doc) return json(route, 404, { error: { code: 404, status: 'NOT_FOUND' } });
      return json(route, 200, { name: 'users/u1', fields: { json: { stringValue: srv.doc.json }, updated: { integerValue: String(srv.doc.updated) } }, updateTime: srv.doc.updateTime });
    }
    if (req.method() === 'PATCH') {
      // inne urządzenie zapisuje tuż przed nami
      if (srv.race) { const f = srv.race; srv.race = null; f(); }
      const want = u.searchParams.get('currentDocument.updateTime'), mustNotExist = u.searchParams.get('currentDocument.exists') === 'false';
      if (mustNotExist ? !!srv.doc : (!srv.doc || srv.doc.updateTime !== want)) return json(route, 400, { error: { code: 400, status: 'FAILED_PRECONDITION' } });
      const f = JSON.parse(req.postData()).fields;
      srv.doc = { json: f.json.stringValue, updated: +f.updated.integerValue, updateTime: stamp() };
      srv.writes++;
      return json(route, 200, { name: 'users/u1', updateTime: srv.doc.updateTime });
    }
  }
  return route.abort();
}
const remote = () => (srv.doc ? JSON.parse(srv.doc.json) : null);

(async () => {
  const b = await chromium.launch();
  const errors = [];
  async function device(name) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.route(/googleapis\.com/, r => (/fonts\./.test(r.request().url()) ? r.abort() : fake(r)));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(name + ': ' + m.text()); });
    await page.clock.install({ time: new Date(2026, 10, 24, 7, 30) });
    await page.addInitScript(() => { window.__TEST_FIREBASE = { apiKey: 'test-key', projectId: 'test-proj' }; });
    await page.goto(APP);
    await page.clock.runFor(300);
    return { ctx, page };
  }
  // Zegar strony stoi; sieć (atrapa) odpowiada naprawdę. Kilka kroków zegara i krótkich pauz, aż wszystko się ustali.
  const settle = async (page, ms) => { for (let i = 0; i < 8; i++) { await page.clock.runFor((ms || 2000) / 8); await page.waitForTimeout(40); } };
  const syncText = page => page.textContent('.sync');
  const st = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  async function login(page, pass) {
    await go(page, 'ustawienia');
    await page.fill('#l-email', 'ja@example.com');
    await page.fill('#l-pass', pass);
    await page.press('#l-pass', 'Enter');
    await settle(page);
  }

  // A: bez konta, potem złe i dobre hasło
  const A = await device('A');
  const pa = A.page;
  check('1 signed out: data on this device, invite to log in', /Zaloguj się w Ustawieniach/.test(await syncText(pa)) && srv.gets === 0, await syncText(pa));
  await login(pa, 'zle');
  check('2 wrong password: error, still signed out', /Zły e-mail albo hasło/.test(await pa.textContent('#l-h')) && (await pa.getAttribute('#l-pass', 'aria-invalid')) === 'true' && !(await pa.evaluate(() => localStorage.getItem('treningownia-konto'))));
  await pa.screenshot({ path: OUT + 's-01-login-error.png', fullPage: true });
  await pa.fill('#l-pass', PASS); await pa.click('[data-act="login"]');
  await settle(pa);
  check('3 logged in: account shown, nothing to write yet', /ja@example\.com/.test(await pa.textContent('#konto')) && /Zsynchronizowane/.test(await pa.textContent('#konto .sync')) && srv.gets === 1 && srv.writes === 0, 'gets ' + srv.gets + ', writes ' + srv.writes);
  await pa.screenshot({ path: OUT + 's-02-logged-in.png', fullPage: true });

  // A zapisuje wagę -> jeden zapis, dokument powstaje
  await go(pa, 'dzis');
  await pa.fill('#wq-kg', '72,0'); await pa.press('#wq-kg', 'Enter');
  await settle(pa, 3000);
  check('4 first change creates the cloud copy (one write)', srv.writes === 1 && remote().weight['2026-11-24'].kg === 72, 'writes ' + srv.writes);

  // B: nowe urządzenie, logowanie, dane z chmury, bez zapisu
  const B = await device('B');
  const pb = B.page;
  await login(pb, PASS);
  await go(pb, 'dzis');
  check('5 second device: weight from the cloud, no write back', /72,0/.test(await pb.textContent('.wq')) && srv.writes === 1, 'writes ' + srv.writes);

  // konflikt: B zapisuje cel, a A zapisało w międzyczasie pomiar z wczoraj
  const w0 = srv.writes;
  srv.race = () => {
    const d = remote();
    d.weight['2026-11-23'] = { kg: 72.6, at: Date.now() };
    d.updated = Date.now();
    srv.doc = { json: JSON.stringify(d), updated: d.updated, updateTime: stamp() };
    srv.writes++;
  };
  await go(pb, 'waga');
  await pb.fill('#w-goal-kg', '56'); await pb.press('#w-goal-kg', 'Enter');
  await settle(pb, 3000);
  let r = remote();
  check('6 write conflict: re-read, merged, both changes kept', r.weightGoal === 56 && r.weight['2026-11-23'] && r.weight['2026-11-24'] && srv.writes === w0 + 2, 'writes ' + (srv.writes - w0));
  const lb = await st(pb);
  check('6 device B also has the other device\'s entry', !!lb.weight['2026-11-23']);

  // A dostaje zmiany po powrocie do aplikacji
  await pa.clock.runFor(40000);
  await pa.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await settle(pa);
  const la = await st(pa);
  check('7 back to the app: other device\'s changes arrive', la.weightGoal === 56 && !!la.weight['2026-11-23']);

  // brak pętli zapisów
  const w1 = srv.writes;
  await settle(pa, 12 * 60000); await settle(pb, 12 * 60000);
  check('8 idle 12 min on both: periodic reads, no writes', srv.writes === w1 && srv.gets > 6, 'gets ' + srv.gets);

  // wygasły token: 401, odświeżenie, ponowienie
  srv.ids = {};
  const t0 = srv.tokens;
  await go(pa, 'dzis');
  await pa.click('[data-act="w-edit"]'); await pa.fill('#wq-kg', '71,8'); await pa.press('#wq-kg', 'Enter');
  await settle(pa, 3000);
  check('9 expired token: refreshed and the write goes through', srv.tokens === t0 + 1 && remote().weight['2026-11-24'].kg === 71.8 && /Zsynchronizowane/.test(await syncText(pa)), 'tokens ' + (srv.tokens - t0));

  // brak sieci: zapis lokalny, komunikat, potem wysyłka
  srv.down = true;
  await pa.click('[data-act="w-edit"]'); await pa.fill('#wq-kg', '71,6'); await pa.press('#wq-kg', 'Enter');
  await settle(pa, 3000);
  check('10 offline: saved here, says it will send later', (await st(pa)).weight['2026-11-24'].kg === 71.6 && /Bez sieci/.test(await syncText(pa)) && remote().weight['2026-11-24'].kg === 71.8, await syncText(pa));
  await pa.screenshot({ path: OUT + 's-03-offline.png' });
  srv.down = false;
  await pa.evaluate(() => window.dispatchEvent(new Event('online')));
  await settle(pa);
  check('10 back online: the change is sent', remote().weight['2026-11-24'].kg === 71.6 && /Zsynchronizowane/.test(await syncText(pa)));

  // wylogowanie: dane zostają, synchronizacja stoi
  await go(pb, 'ustawienia');
  await pb.click('[data-act="logout"]'); await settle(pb, 500);
  const gb = srv.gets;
  await settle(pb, 10 * 60000);
  check('11 logout: data kept, login form back, no more requests', (await pb.isVisible('#l-email')) && !!(await st(pb)).weight['2026-11-24'] && srv.gets === gb && !(await pb.evaluate(() => localStorage.getItem('treningownia-konto'))));

  // odwołany token: komunikat i formularz logowania
  srv.ids = {}; srv.revoked = true;
  await go(pa, 'dzis');
  await pa.click('[data-act="w-edit"]'); await pa.fill('#wq-kg', '71,5'); await pa.press('#wq-kg', 'Enter');
  await settle(pa, 3000);
  check('12 revoked session: asks to log in again, data kept here', /Zaloguj się ponownie/.test(await syncText(pa)) && (await st(pa)).weight['2026-11-24'].kg === 71.5, await syncText(pa));
  await go(pa, 'ustawienia');
  check('12 settings show the login form again', await pa.isVisible('#l-email'));

  // kopia zapasowa: zapis pliku i wczytanie na trzecim urządzeniu (bez konta)
  const [dl] = await Promise.all([pa.waitForEvent('download'), pa.click('[data-act="bk-save"]')]);
  const file = OUT + 's-kopia.json';
  await dl.saveAs(file);
  const C = await device('C');
  await go(C.page, 'ustawienia');
  await C.page.setInputFiles('#bk-file', file);
  await C.page.waitForSelector('[data-act="bk-apply"]');
  const q = await C.page.textContent('#bk-q');
  await C.page.screenshot({ path: OUT + 's-04-backup-ask.png', fullPage: true });
  await C.page.click('[data-act="bk-apply"]'); await settle(C.page, 500);
  const lc = await st(C.page);
  check('13 backup: saved as a file, read on another device, summary first', dl.suggestedFilename() === 'treningownia-kopia-2026-11-24.json' && /pomiary wagi|pomiarów wagi/.test(q) && lc.weight['2026-11-24'].kg === 71.5 && lc.weightGoal === 56, dl.suggestedFilename() + ' | ' + q);

  await A.ctx.close(); await B.ctx.close(); await C.ctx.close();
  await b.close();
  finish(errors);
})();
