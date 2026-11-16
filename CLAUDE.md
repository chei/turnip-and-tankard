# Turnip & Tankard

A browser-based fantasy management game. The owner (chei) writes in Hungarian; answer in
Hungarian unless asked otherwise. All of the owner's games have "turn" in their name
(e.g. GeoTurnip) — that is where the name comes from.

The owner supplies the ideas; the codebase and every technical decision are Claude's
(refactor freely, push straight to `main`, no need to ask). Ask only about game-design
choices that are really the owner's.

Live at https://turnip-and-tankard.chei-hu.workers.dev — the owner tests there, on phone
and desktop alike.

## Specification (from the owner)

- Web game, **pixel art** that should look good, playable on **mobile and desktop**.
  Languages: **Hungarian, English, German**, selectable. A little music and sound effects
  are welcome but not essential.
- The player is the **cook of an inn**. Adventurers lodge there (and pay for it), but the
  main income is **food**.
- **Cooking is a simple click mechanic:** the menu has a few dishes, each made of
  ingredients, which also set its price. A guest asks for roast turnip: tap the turnip, it
  cooks, hand it over. With sausage: pick both. Cheese, spices and so on allow richer dishes.
- **Inventory matters.** A few staples are practically unlimited (the market); the rest are
  hard to come by: adventurers stay a few days, eat once or several times, leave for a few
  days, and come back with things they **offer for sale** — ingredients and also **recipes**.
  A new recipe can go straight onto the menu if the ingredients are there.
- The player **composes the menu**; it gets longer as the inn **levels up**. Levelling is an
  important RPG element.
- **Story with a few key characters**, told in short dialogues: one brings materials (cloth,
  leather, a wooden rod "fit for a wand"), another asks whether the inn sells gear, and an
  **apprentice** can be hired who works in a small workshop and turns materials into
  equipment for the adventurers.
- **Equipment is a later unlock**, not the starting point. Word gets around and specialists
  join, each with a growing list like the menu: **weaponsmith** (knife, dagger, sword,
  two-handed weapons), **tailor** (shirt, boots, leather armour), **armourer** (chain mail,
  breastplate, helmet, full plate), **wizard** (potions that share ingredients with food,
  wands, talismans). Classes overlap in what they use: a warrior wears a talisman but not a
  wand. Classes: warrior, mage, rogue, ranger.

## How it is built

- `src/game/` — the rules, with no DOM: `data.ts` (items, recipes, gear, costs),
  `game.ts` (state, mornings and evenings, adventurers, quests, offers, workshop),
  `service.ts` (the real-time opening hours), `story.ts` (story beats), `autoplay.ts`
  (a bot used by the tests and the dev fast-forward). Covered by `game.test.ts`.
- `src/art/` — all graphics are drawn in code: `pixels.ts` (palette, ASCII sprites),
  `items.ts` (16×16 icons, dish templates), `characters.ts` (layered busts), `scene.ts`
  (the 160×108 common room on a canvas).
- `src/ui/App.ts` — screens and input; `src/i18n/` — hu/en/de texts; `src/audio.ts` —
  synthesised sounds and music; `src/storage.ts` — the save lives in `localStorage`.
- `dev/*.html` — sprite and scene preview sheets for the dev server (not part of the build).
- In development `window.__tt.skipDays(n)` fast-forwards the game for testing.
- There is no Worker script and no D1 yet: the game is single-player and Cloudflare only
  serves the built client.

## Tech (follow the GeoTurnip setup)

Reuse the proven structure of `chei/geoturnip`:

- Vite + TypeScript client.
- Cloudflare Worker, configured in `wrangler.jsonc`: the built client is served as static
  assets, only `/api/*` runs the Worker. D1 (with `migrations/`) if online data is needed.
- GitHub Actions deploy on every push to `main` (`npm ci`, `npm test`, `npm run deploy`).
  The `CLOUDFLARE_API_TOKEN` repository secret is already set.
