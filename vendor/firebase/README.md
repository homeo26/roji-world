# Firebase JS SDK (vendored)

Version **13.4.0**, the modular browser ESM builds Google serves at
`https://www.gstatic.com/firebasejs/13.4.0/firebase-{app,auth,database}.js`, downloaded once on 2026-11-26.

Licence: Apache License 2.0 (`LICENSE` in this folder; each file also carries the licence header).
Copyright Google LLC.

Changes made to the downloaded files, nothing else:
- `firebase-auth.js` and `firebase-database.js` import `./firebase-app.js` instead of the gstatic URL.
- The `//# sourceMappingURL=...` comment at the end of each file is removed (the maps are not vendored).

Only `src/online/net.js` imports these files, and only when a player opens "Play together" (or opens a
`?room=CODE` link), so the game's start-up does not load them.
