# Account and cloud sync (Firebase)

The app works fully without an account: everything is saved on the device. Signing in adds a copy in the cloud, so the data survives a lost phone and is the same on every device the owner signs in on.

## Why Firebase, and how it's used

- Free plan (Spark): no credit card, and the project doesn't pause when idle (Supabase's free plan does).
- No SDK: `src/sync.js` talks to the REST APIs with `fetch`, so the app stays one file with no dependencies.
- Auth: e-mail and password (`accounts:signInWithPassword`). The refresh token is kept in localStorage (`treningownia-konto`); ID tokens last an hour and are refreshed through `securetoken.googleapis.com`. A 401 refreshes the token once and retries. If the refresh is refused (revoked, user deleted), the account is dropped and the app asks to sign in again; local data stays.
- Data: one Firestore document per user, `users/<uid>`, with two fields: `json` (the whole state as text) and `updated` (ms).
- The `apiKey` and `projectId` go into `src/config.js`. The API key is not a secret; every web app ships it. The security rules below are what protect the data.

## The sync loop (`syncNow()` in trainer.js)

1. GET the document (404 = no copy yet).
2. `merge(local, remote)` (docs/architecture.md). If that changes the local state, save and re-render (not while a session is running or the owner is typing).
3. If the merged state equals the remote one, stop: nothing is written.
4. Otherwise PATCH it with a precondition: `currentDocument.updateTime=<the version just read>`, or `currentDocument.exists=false` for the first write. If another device wrote in between, Firestore refuses (`FAILED_PRECONDITION`), and the loop goes back to step 1 (up to 4 tries).

When it runs: 1.5 s after every change, on start, when the app comes back to the foreground (if the last sync is older than 30 s), when the network comes back, and every 5 minutes while the app is open. Leaving the app flushes a pending sync.

Status texts (`SYNC` in trainer.js) appear at the bottom of Dziś, Waga, Rehabilitacja and in Ustawienia: device only, signed out, connecting, synced, offline, error, no access (rules), session expired.

## One-time setup (the owner, in the Firebase console)

1. console.firebase.google.com → create a project (`treningownia`), Google Analytics off.
2. Build → Authentication → Get started → Sign-in method → Email/Password on (not the e-mail link). Users → Add user (the owner's e-mail and a password). Settings → User actions → untick "Enable create (sign-up)" if it's there, so nobody else can make an account.
3. Build → Firestore Database → Create database → Standard edition, location eur3 (Europe) or europe-southwest1 (Madrid), production mode.
4. Firestore → Rules:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{doc=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

5. Project settings → Your apps → Web (`</>`) → register (no Hosting) → copy `apiKey` and `projectId` into `src/config.js`, then build and push.

Optional later: in Google Cloud console → APIs & Services → Credentials, restrict the API key to the GitHub Pages address (HTTP referrer).

## Testing

tests/test-sync.js runs two (and a third) browser contexts against a fake Firebase that checks the API key, tokens, the document path and the update-time precondition. It doesn't touch the real project; after the setup, the owner checks a real sign-in once on the phone.
