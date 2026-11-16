# Turnip & Tankard

A browser-based fantasy management game: you cook for the adventurers who lodge at your inn,
buy what they bring back from their quests, and grow from a single roast turnip into an inn
with its own workshop.

Live at https://turnip-and-tankard.chei-hu.workers.dev

## Development

```
npm install
npm run dev     # the game at http://localhost:5173, sprite sheets at /dev/sheet.html
npm test
npm run build
```

Every push to `main` is tested, built and deployed to Cloudflare by
`.github/workflows/deploy.yml`. See `CLAUDE.md` for the specification and the layout of
the code.
