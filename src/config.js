/* Ustawienia wdrożenia. Projekt Firebase do synchronizacji: apiKey i projectId z konsoli Firebase
   (Ustawienia projektu → Twoje aplikacje → Web). Klucz API Firebase nie jest tajny: dane chronią reguły Firestore
   (docs/sync.md). Puste pola = aplikacja działa tylko na tym urządzeniu. */
(function (G) {
'use strict';
const CONFIG = {
  firebase: { apiKey: '', projectId: '' }
};
// tylko do testów: atrapa projektu Firebase
if (G.__TEST_FIREBASE) CONFIG.firebase = G.__TEST_FIREBASE;
G.CONFIG = CONFIG;
if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
