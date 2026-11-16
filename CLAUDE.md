# Turnip & Tankard

A browser-based fantasy management game. The owner (chei) writes in Hungarian; answer in
Hungarian unless asked otherwise. All of the owner's games have "turn" in their name
(e.g. GeoTurnip) — that is where the name comes from.

The detailed specification will come from the owner. Until then, this is the agreed concept;
don't invent big systems beyond it without asking.

## Concept

- The player runs an **inn**, the Turnip & Tankard. Adventurers gather here, eat, sleep and
  set out on quests from here.
- **Start: simple food.** The first dish on the menu is turnip — a very cheap ingredient sold
  at a small margin. Adventurers can bring ingredients too, sometimes very cheaply.
- **The loop:** ingredients → the inn (with its helpers) makes something → sells it to
  adventurers → they go on quests → they come back with gold and materials, which the
  innkeeper can buy from them.
- **Progression by chapters:** the first few chapters are about food. After them, the inn
  starts crafting **equipment** with its helpers: swords, armour, boots, magic wands.
- **Adventurers** have classes and buy items that fit their class. Better items make their
  quests more successful. Higher-level adventurers look for better items, and bring back more
  gold and better materials.

## Tech (follow the GeoTurnip setup)

Reuse the proven structure of `chei/geoturnip`:

- Vite + TypeScript client.
- Cloudflare Worker, configured in `wrangler.jsonc`: the built client is served as static
  assets, only `/api/*` runs the Worker. D1 (with `migrations/`) if online data is needed.
- GitHub Actions deploy on every push to `main` (`npm ci`, `npm test`, `npm run deploy`).
  The `CLOUDFLARE_API_TOKEN` repository secret is already set.
