import { describe, expect, it } from 'vitest';
import {
  GEAR,
  GEAR_IDS,
  ITEMS,
  RECIPES,
  RECIPE_IDS,
  gearPrice,
  menuSlots,
  recipeCost,
  recipePrice,
  type IngredientId,
} from './data';
import {
  acceptOffer,
  addXp,
  buyBasic,
  craft,
  finishDay,
  guests,
  hireCrafter,
  newGame,
  startMorning,
  toggleMenu,
  type GameState,
} from './game';
import { playService } from './autoplay';
import { addToPan, cook, matchRecipe, startService, tick } from './service';
import { STORY_BEATS, STORY_SPEAKERS } from './story';

const NO_TOTALS = { served: 0, lost: 0, food: 0, tips: 0, xp: 0, levelsGained: 0 };

function playDay(state: GameState): void {
  // Restock the basics and take every offer we can afford.
  for (const offer of [...state.offers]) acceptOffer(state, offer.id);
  for (const item of ['turnip', 'onion', 'ale', 'bread'] as IngredientId[]) {
    while (state.stock[item] < 12 && buyBasic(state, item, 1));
  }
  for (const recipe of state.recipes) if (!state.menu.includes(recipe)) toggleMenu(state, recipe);
  for (const crafter of ['weaponsmith', 'tailor', 'armorer', 'wizard'] as const) hireCrafter(state, crafter);
  for (const gear of GEAR_IDS) while (craft(state, gear));
  state.pendingStory = null;
  const service = playService(state);
  expect(service.done).toBe(true);
  finishDay(state, service.totals);
  startMorning(state);
}

describe('data', () => {
  it('sells every dish above the cost of its ingredients', () => {
    for (const id of RECIPE_IDS) expect(recipePrice(id)).toBeGreaterThan(recipeCost(id));
  });

  it('keeps the first dish cheap with a small margin', () => {
    expect(recipeCost('roastTurnip')).toBe(1);
    expect(recipePrice('roastTurnip')).toBeLessThanOrEqual(3);
  });

  it('has no two recipes with the same ingredients', () => {
    const keys = RECIPE_IDS.map((id) => [...RECIPES[id].ingredients].sort().join('+'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('sells gear above the cost of its materials', () => {
    for (const id of GEAR_IDS) {
      const cost = Object.entries(GEAR[id].materials).reduce(
        (sum, [item, count]) => sum + ITEMS[item as keyof typeof ITEMS].value * (count ?? 0),
        0,
      );
      expect(gearPrice(id)).toBeGreaterThan(cost);
    }
  });

  it('gives every story beat its speakers', () => {
    for (const beat of STORY_BEATS) expect(STORY_SPEAKERS[beat].length).toBeGreaterThan(0);
  });
});

describe('cooking', () => {
  it('matches recipes whatever the order of the ingredients', () => {
    expect(matchRecipe(['turnip'])).toBe('roastTurnip');
    expect(matchRecipe(['onion', 'turnip'])).toBe('turnipSoup');
    expect(matchRecipe(['turnip', 'turnip'])).toBeNull();
  });

  it('turns unknown mixtures into slop and loses the ingredients', () => {
    const state = newGame(1);
    const service = startService(state);
    const before = state.stock.turnip;
    addToPan(state, service, 'turnip');
    addToPan(state, service, 'turnip');
    cook(state, service);
    tick(state, service, 10);
    expect(service.plate).toBe('slop');
    expect(state.stock.turnip).toBe(before - 2);
  });

  it('discovers a recipe cooked by experiment', () => {
    const state = newGame(1);
    state.stock.sausage = 1;
    const service = startService(state);
    addToPan(state, service, 'turnip');
    addToPan(state, service, 'sausage');
    cook(state, service);
    tick(state, service, 10);
    expect(service.plate).toBe('sausageTurnip');
    expect(state.recipes).toContain('sausageTurnip');
  });
});

describe('a day at the inn', () => {
  it('starts with a guest, a story scene and a short menu', () => {
    const state = newGame(7);
    expect(state.day).toBe(1);
    expect(guests(state).length).toBe(1);
    expect(state.pendingStory).toBe('intro');
    expect(state.menu.length).toBeLessThanOrEqual(menuSlots(1));
  });

  it('earns gold and experience from a full service', () => {
    const state = newGame(3);
    const gold = state.gold;
    const service = playService(state);
    expect(service.totals.served).toBeGreaterThan(3);
    expect(state.gold).toBeGreaterThan(gold);
    expect(state.xp + state.level * 100).toBeGreaterThan(100);
  });

  it('only takes orders it has the ingredients for', () => {
    const state = newGame(5);
    state.stock.turnip = 2;
    state.stock.ale = 0;
    state.stock.onion = 0;
    const service = playService(state);
    expect(service.totals.served).toBe(2);
    expect(service.totals.lost).toBeGreaterThan(0);
  });

  it('charges lodging and sends guests on quests that bring loot back', () => {
    const state = newGame(11);
    let sawOffer = false;
    let lodging = 0;
    for (let day = 0; day < 8; day++) {
      const service = playService(state);
      lodging += finishDay(state, service.totals).lodging;
      startMorning(state);
      if (state.offers.length > 0) sawOffer = true;
      buyBasic(state, 'turnip', Math.min(10, state.gold));
    }
    expect(lodging).toBeGreaterThan(0);
    expect(sawOffer).toBe(true);
  });

  it('rescues a player with nothing to cook and no gold', () => {
    const state = newGame(2);
    for (const item of Object.keys(state.stock) as (keyof typeof state.stock)[]) state.stock[item] = 0;
    finishDay(state, NO_TOTALS);
    state.gold = 0;
    startMorning(state);
    expect(state.stock.turnip).toBeGreaterThan(0);
  });
});

describe('progression', () => {
  it('levels up and widens the menu', () => {
    const state = newGame(1);
    expect(addXp(state, 1000)).toBeGreaterThan(2);
    expect(menuSlots(state.level)).toBeGreaterThan(menuSlots(1));
  });

  it('reaches the workshop and sells gear over a long game', () => {
    const state = newGame(42);
    let gearSold = 0;
    for (let day = 0; day < 90; day++) {
      playDay(state);
      gearSold += state.adventurers.reduce((sum, adv) => sum + Object.keys(adv.gear).length, 0) > 0 ? 1 : 0;
    }
    expect(state.level).toBeGreaterThanOrEqual(8);
    expect(state.crafters).toContain('apprentice');
    expect(state.crafters.length).toBeGreaterThan(2);
    expect(state.recipes.length).toBeGreaterThan(10);
    expect(gearSold).toBeGreaterThan(0);
    expect(state.gold).toBeGreaterThanOrEqual(0);
  });
});
