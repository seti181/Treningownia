/* Konto i chmura: logowanie (Firebase Auth) i jeden dokument na użytkownika w Firestore, przez REST (fetch), bez SDK.
   Dokument users/<uid> ma pole json (cały stan jako tekst) i updated (ms). Zapis zawsze z warunkiem na updateTime
   ostatnio odczytanej wersji, więc dwa urządzenia nie nadpiszą sobie zmian: przy konflikcie trener czyta, scala i zapisuje jeszcze raz. */
(function (G) {
'use strict';
const AKEY = 'treningownia-konto';
const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=';
const TOKEN = 'https://securetoken.googleapis.com/v1/token?key=';
const FS = 'https://firestore.googleapis.com/v1/projects/';

function fail(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

// o: { apiKey, projectId, fetch, storage, now }
function create(o) {
  const cfg = o || {};
  const fetchFn = cfg.fetch || (typeof fetch === 'function' ? fetch.bind(G) : null);
  const store = cfg.storage || null;
  const now = cfg.now || (() => Date.now());
  const configured = !!(cfg.apiKey && cfg.projectId && fetchFn);
  let acc = null;
  try { const raw = store && store.getItem(AKEY); if (raw) { const a = JSON.parse(raw); if (a && a.uid && a.refresh) acc = a; } } catch (e) { acc = null; }
  const save = () => { try { if (!store) return; if (acc) store.setItem(AKEY, JSON.stringify(acc)); else store.removeItem(AKEY); } catch (e) { /* brak */ } };

  async function call(url, init) {
    let res;
    try { res = await fetchFn(url, init); } catch (e) { throw fail('network'); }
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    return { status: res.status, ok: res.ok, body };
  }
  const errOf = r => {
    const er = r.body && r.body.error;
    return er ? (er.status || er.message || '') : '';
  };

  async function signIn(email, password) {
    if (!configured) throw fail('config');
    const r = await call(AUTH + encodeURIComponent(cfg.apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    if (!r.ok) {
      const m = errOf(r);
      if (/TOO_MANY_ATTEMPTS/.test(m)) throw fail('many');
      if (/USER_DISABLED/.test(m)) throw fail('disabled');
      if (/INVALID|EMAIL_NOT_FOUND|PASSWORD|MISSING/.test(m)) throw fail('login');
      throw fail(r.status >= 500 ? 'server' : 'login', m);
    }
    const b = r.body;
    acc = { uid: b.localId, email: b.email || email, refresh: b.refreshToken, id: b.idToken, exp: now() + (+b.expiresIn || 3600) * 1000 };
    save();
    return { uid: acc.uid, email: acc.email };
  }
  function signOut() { acc = null; save(); }
  function account() { return acc ? { uid: acc.uid, email: acc.email } : null; }

  async function token(force) {
    if (!acc) throw fail('auth');
    if (!force && acc.id && acc.exp - now() > 60000) return acc.id;
    const r = await call(TOKEN + encodeURIComponent(cfg.apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(acc.refresh)
    });
    if (!r.ok) {
      // odwołany token albo usunięte konto: trzeba zalogować się od nowa
      if (r.status === 400 || r.status === 401 || r.status === 403) { acc = null; save(); throw fail('auth'); }
      throw fail('server', errOf(r));
    }
    acc.id = r.body.id_token; acc.refresh = r.body.refresh_token || acc.refresh;
    acc.exp = now() + (+r.body.expires_in || 3600) * 1000;
    save();
    return acc.id;
  }
  const docUrl = () => FS + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents/users/' + encodeURIComponent(acc.uid);
  // Żądanie z tokenem; po 401 jedno odświeżenie tokenu i ponowienie.
  async function authed(url, init) {
    let t = await token(false);
    let r = await call(url, Object.assign({}, init, { headers: Object.assign({}, init.headers, { Authorization: 'Bearer ' + t }) }));
    if (r.status === 401) {
      t = await token(true);
      r = await call(url, Object.assign({}, init, { headers: Object.assign({}, init.headers, { Authorization: 'Bearer ' + t }) }));
    }
    return r;
  }

  // { exists, json, updated, updateTime }
  async function get() {
    if (!configured) throw fail('config');
    const r = await authed(docUrl(), { method: 'GET', headers: {} });
    if (r.status === 404) return { exists: false, json: null, updated: 0, updateTime: null };
    if (r.status === 403) throw fail('denied', errOf(r));
    if (!r.ok) throw fail('server', errOf(r));
    const f = (r.body && r.body.fields) || {};
    return { exists: true, json: f.json && typeof f.json.stringValue === 'string' ? f.json.stringValue : null, updated: +(f.updated && f.updated.integerValue) || 0, updateTime: r.body.updateTime || null };
  }
  // Zapis tylko wtedy, gdy dokument w chmurze jest w wersji updateTime (null = jeszcze nie istnieje). Zwraca nowy updateTime.
  async function put(json, updated, updateTime) {
    if (!configured) throw fail('config');
    const q = '?updateMask.fieldPaths=json&updateMask.fieldPaths=updated&' +
      (updateTime ? 'currentDocument.updateTime=' + encodeURIComponent(updateTime) : 'currentDocument.exists=false');
    const r = await authed(docUrl() + q, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { json: { stringValue: json }, updated: { integerValue: String(Math.round(updated || 0)) } } })
    });
    if (!r.ok) {
      const m = errOf(r);
      if (r.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS|ABORTED/.test(m)) throw fail('conflict', m);
      if (r.status === 404) throw fail('conflict', m);
      if (r.status === 403) throw fail('denied', m);
      throw fail('server', m);
    }
    return r.body && r.body.updateTime || null;
  }

  return { configured, signIn, signOut, account, get, put };
}

const API = { create, AKEY };
G.CLOUD = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
