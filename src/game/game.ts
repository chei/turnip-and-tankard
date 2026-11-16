import {
  ADVENTURER_NAMES,
  BASIC_IDS,
  CLASSES,
  CRAFTERS,
  CRAFTER_IDS,
  DECOR_MAX,
  GEAR,
  GEAR_IDS,
  ITEMS,
  ITEM_IDS,
  MAX_LEVEL,
  RECIPES,
  RECIPE_IDS,
  STARTING_RECIPES,
  STOVE_MAX,
  decorCost,
  gearPrice,
  maxRooms,
  menuSlots,
  roomCost,
  stoveCost,
  xpForLevel,
  type AdventurerClass,
  type CrafterId,
  type GearId,
  type GearSlot,
  type ItemId,
  type RecipeId,
} from './data';
import { nextStoryBeat, STORY_EFFECTS, type StoryBeat } from './story';

export const SAVE_VERSION = 1;

export interface Adventurer {
  id: number;
  name: string;
  cls: AdventurerClass;
  /** Drives the generated appearance. */
  seed: number;
  level: number;
  /** Successful quests since the last level-up. */
  wins: number;
  status: 'inn' | 'quest';
  /** Evenings left before leaving on the next quest (while at the inn). */
  nights: number;
  /** Has a room, so pays for lodging. */
  lodged: boolean;
  /** Mornings left until the return (while on a quest). */
  questDays: number;
  purse: number;
  gear: Partial<Record<GearSlot, GearId>>;
  /** Value of the food eaten during this stay; a full belly helps on the quest. */
  meal: number;
}

export type Offer = { id: number; advId: number; price: number } & (
  | { kind: 'item'; item: ItemId; qty: number }
  | { kind: 'recipe'; recipe: RecipeId }
  | { kind: 'design'; gear: GearId }
);

export interface MerchantLot {
  item: ItemId;
  qty: number;
  price: number;
}

export type News =
  | { type: 'arrived'; advId: number }
  | { type: 'returned'; advId: number; success: boolean; levelUp: boolean }
  | { type: 'noRoom'; advId: number }
  | { type: 'departed'; advId: number }
  | { type: 'bought'; advId: number; gear: GearId; price: number }
  | { type: 'lodging'; advId: number; price: number }
  | { type: 'gift' };

export interface DaySummary {
  served: number;
  lost: number;
  food: number;
  tips: number;
  lodging: number;
  gearSales: number;
  xp: number;
  levelsGained: number;
  news: News[];
}

export interface GameState {
  version: number;
  rng: number;
  day: number;
  phase: 'morning' | 'evening';
  gold: number;
  level: number;
  xp: number;
  stock: Record<ItemId, number>;
  recipes: RecipeId[];
  menu: RecipeId[];
  rooms: number;
  stove: number;
  decor: number;
  adventurers: Adventurer[];
  nextId: number;
  offers: Offer[];
  merchant: MerchantLot[];
  news: News[];
  story: StoryBeat[];
  /** A story scene waiting to be shown. */
  pendingStory: StoryBeat | null;
  crafters: CrafterId[];
  energy: Partial<Record<CrafterId, number>>;
  designs: GearId[];
  gear: Partial<Record<GearId, number>>;
  summary: DaySummary | null;
  stats: { served: number; quests: number; discovered: number };
}

// --- random numbers: a small seeded generator kept in the state, so saves replay the same ---

export function random(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: { rng: number }, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1));
}

export function pickRandom<T>(state: { rng: number }, list: readonly T[]): T {
  return list[Math.floor(random(state) * list.length)]!;
}

export function pickWeighted<T>(state: { rng: number }, list: readonly T[], weight: (item: T) => number): T {
  const weights = list.map(weight);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = random(state) * total;
  for (const [index, item] of list.entries()) {
    roll -= weights[index]!;
    if (roll <= 0) return item;
  }
  return list[list.length - 1]!;
}

// --- new game ---

export function newGame(seed: number): GameState {
  const stock = Object.fromEntries(ITEM_IDS.map((id) => [id, 0])) as Record<ItemId, number>;
  stock.turnip = 8;
  stock.ale = 6;
  stock.onion = 4;
  const state: GameState = {
    version: SAVE_VERSION,
    rng: seed | 0,
    day: 0,
    phase: 'morning',
    gold: 15,
    level: 1,
    xp: 0,
    stock,
    recipes: [...STARTING_RECIPES],
    menu: ['roastTurnip', 'tankard'],
    rooms: 2,
    stove: 0,
    decor: 0,
    adventurers: [],
    nextId: 1,
    offers: [],
    merchant: [],
    news: [],
    story: [],
    pendingStory: null,
    crafters: [],
    energy: {},
    designs: [],
    gear: {},
    summary: null,
    stats: { served: 0, quests: 0, discovered: 0 },
  };
  startMorning(state);
  return state;
}

// --- small queries ---

export function adventurer(state: GameState, id: number): Adventurer | undefined {
  return state.adventurers.find((adv) => adv.id === id);
}

export function guests(state: GameState): Adventurer[] {
  return state.adventurers.filter((adv) => adv.status === 'inn');
}

export function freeRooms(state: GameState): number {
  return state.rooms - state.adventurers.filter((adv) => adv.status === 'inn' && adv.lodged).length;
}

export function maxAdventurers(level: number): number {
  return Math.min(10, 1 + level);
}

export function hasFlag(state: GameState, beat: StoryBeat): boolean {
  return state.story.includes(beat);
}

export function canMake(stock: Record<ItemId, number>, recipe: RecipeId): boolean {
  const needed = new Map<ItemId, number>();
  for (const ingredient of RECIPES[recipe].ingredients) needed.set(ingredient, (needed.get(ingredient) ?? 0) + 1);
  for (const [item, count] of needed) if ((stock[item] ?? 0) < count) return false;
  return true;
}

export function lodgingPrice(adv: Adventurer): number {
  return 4 + adv.level * 2;
}

export function gearPower(adv: Adventurer): number {
  let power = 0;
  for (const id of Object.values(adv.gear)) if (id) power += GEAR[id].power;
  return power;
}

/** How likely the next quest is to succeed: a full belly and fitting gear both count. */
export function questChance(adv: Adventurer): number {
  const fed = Math.min(1, adv.meal / (6 + 4 * adv.level));
  const equipped = Math.min(1, gearPower(adv) / (7 * adv.level));
  return Math.min(0.96, 0.38 + 0.3 * fed + 0.28 * equipped);
}

// --- XP and levels ---

export function addXp(state: GameState, amount: number): number {
  let gained = 0;
  state.xp += amount;
  while (state.level < MAX_LEVEL && state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    gained += 1;
  }
  return gained;
}

// --- morning ---

function createAdventurer(state: GameState): Adventurer {
  const used = new Set(state.adventurers.map((adv) => adv.name));
  const names = ADVENTURER_NAMES.filter((name) => !used.has(name));
  const classCounts = CLASSES.map((cls) => state.adventurers.filter((adv) => adv.cls === cls).length);
  const fewest = Math.min(...classCounts);
  const cls = pickRandom(
    state,
    CLASSES.filter((_, index) => classCounts[index] === fewest),
  );
  const adv: Adventurer = {
    id: state.nextId++,
    name: pickRandom(state, names.length ? names : ADVENTURER_NAMES),
    cls,
    seed: Math.floor(random(state) * 0x7fffffff),
    level: 1 + Math.floor(random(state) * Math.max(1, Math.floor(state.level / 3))),
    wins: 0,
    status: 'inn',
    nights: randomInt(state, 1, 2),
    lodged: true,
    questDays: 0,
    purse: 10,
    gear: {},
    meal: 0,
  };
  state.adventurers.push(adv);
  return adv;
}

type NewOffer = Offer extends infer O ? (O extends Offer ? Omit<O, 'id'> : never) : never;

function addOffer(state: GameState, offer: NewOffer): void {
  state.offers.push({ ...offer, id: state.nextId++ } as Offer);
}

function lootPool(state: GameState, maxTier: number): ItemId[] {
  return ITEM_IDS.filter((id) => {
    const def = ITEMS[id];
    if (def.basic || def.tier > maxTier) return false;
    return def.kind === 'ingredient' || hasFlag(state, 'materials');
  });
}

function resolveQuest(state: GameState, adv: Adventurer): void {
  const firstEver = state.stats.quests === 0;
  const success = firstEver || random(state) < questChance(adv);
  state.stats.quests += 1;
  let levelUp = false;
  if (success) {
    adv.wins += 1;
    adv.purse += 10 + adv.level * 12 + randomInt(state, 0, 8);
    if (adv.wins >= adv.level && adv.level < 10) {
      adv.level += 1;
      adv.wins = 0;
      levelUp = true;
    }
  } else {
    adv.purse += 2 + adv.level * 3;
  }
  delete adv.gear.potion;
  adv.meal = 0;

  // Loot offered for sale: more and better after a success.
  const pool = lootPool(state, success ? adv.level + 1 : adv.level);
  const lots = success ? 2 + (adv.level >= 3 ? 1 : 0) : 1;
  for (let i = 0; i < lots && pool.length > 0; i++) {
    const item = pool.splice(Math.floor(random(state) * pool.length), 1)[0]!;
    const qty = success ? randomInt(state, 2, 4) + Math.floor(adv.level / 2) : randomInt(state, 1, 2);
    const price = Math.max(1, Math.round(ITEMS[item].value * qty * 0.7));
    addOffer(state, { advId: adv.id, kind: 'item', item, qty, price });
  }

  if (success) {
    const offered = new Set(state.offers.flatMap((offer) => (offer.kind === 'recipe' ? [offer.recipe] : [])));
    const unknown = RECIPE_IDS.filter(
      (id) => !state.recipes.includes(id) && !offered.has(id) && RECIPES[id].tier <= adv.level + 1,
    );
    if (unknown.length > 0 && (firstEver || random(state) < (state.recipes.length < 8 ? 0.85 : 0.6))) {
      const lowest = Math.min(...unknown.map((id) => RECIPES[id].tier));
      const recipe = pickRandom(
        state,
        unknown.filter((id) => RECIPES[id].tier <= lowest + 1),
      );
      addOffer(state, { advId: adv.id, kind: 'recipe', recipe, price: 6 + RECIPES[recipe].tier * 6 });
    }

    const offeredDesigns = new Set(state.offers.flatMap((offer) => (offer.kind === 'design' ? [offer.gear] : [])));
    const designs = GEAR_IDS.filter(
      (id) =>
        GEAR[id].tier > 1 &&
        GEAR[id].tier <= adv.level + 1 &&
        state.crafters.includes(GEAR[id].crafter) &&
        !state.designs.includes(id) &&
        !offeredDesigns.has(id),
    );
    if (designs.length > 0 && random(state) < 0.5) {
      const fitting = designs.filter((id) => GEAR[id].classes.includes(adv.cls));
      const gear = pickRandom(state, fitting.length ? fitting : designs);
      addOffer(state, { advId: adv.id, kind: 'design', gear, price: 12 + GEAR[gear].tier * 10 });
    }
  }

  adv.status = 'inn';
  adv.lodged = freeRooms(state) > 0;
  adv.nights = adv.lodged ? randomInt(state, 1, 2) : 1;
  state.news.push({ type: 'returned', advId: adv.id, success, levelUp });
  if (!adv.lodged) state.news.push({ type: 'noRoom', advId: adv.id });
}

function rollMerchant(state: GameState): void {
  state.merchant = [];
  if (!hasFlag(state, 'pedlar')) return;
  const pool = lootPool(state, Math.max(1, Math.ceil(state.level / 2) + 1));
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const item = pool.splice(Math.floor(random(state) * pool.length), 1)[0]!;
    state.merchant.push({ item, qty: randomInt(state, 2, 5), price: Math.ceil(ITEMS[item].value * 1.4) });
  }
}

/** Begins a new day: quests end, new guests arrive, the market restocks, the story may move on. */
export function startMorning(state: GameState): void {
  state.day += 1;
  state.phase = 'morning';
  state.news = [];
  state.offers = [];
  state.summary = null;

  for (const adv of state.adventurers) {
    if (adv.status !== 'quest') continue;
    adv.questDays -= 1;
    if (adv.questDays <= 0) resolveQuest(state, adv);
  }

  const wanted = state.adventurers.length < 2 || random(state) < 0.55;
  if (wanted && state.adventurers.length < maxAdventurers(state.level) && freeRooms(state) > 0) {
    const adv = createAdventurer(state);
    state.news.push({ type: 'arrived', advId: adv.id });
  }

  const beat = nextStoryBeat(state);
  if (beat) {
    state.story.push(beat);
    state.pendingStory = beat;
    STORY_EFFECTS[beat]?.(state);
  }

  rollMerchant(state);
  for (const crafter of state.crafters) state.energy[crafter] = CRAFTERS[crafter].energy;

  // Never leave the player stuck with an empty larder and an empty purse.
  const canCook = state.menu.some((recipe) => canMake(state.stock, recipe));
  if (!canCook && state.gold < 3) {
    state.stock.turnip += 6;
    state.news.push({ type: 'gift' });
  }
}

// --- morning actions ---

export function buyBasic(state: GameState, item: ItemId, qty: number): boolean {
  const price = ITEMS[item].value * qty;
  if (!ITEMS[item].basic || state.gold < price) return false;
  state.gold -= price;
  state.stock[item] += qty;
  return true;
}

export function buyFromMerchant(state: GameState, index: number): boolean {
  const lot = state.merchant[index];
  if (!lot || lot.qty <= 0 || state.gold < lot.price) return false;
  state.gold -= lot.price;
  lot.qty -= 1;
  state.stock[lot.item] += 1;
  return true;
}

export function acceptOffer(state: GameState, offerId: number): boolean {
  const index = state.offers.findIndex((offer) => offer.id === offerId);
  const offer = state.offers[index];
  if (!offer || state.gold < offer.price) return false;
  state.gold -= offer.price;
  const seller = adventurer(state, offer.advId);
  if (seller) seller.purse += offer.price;
  if (offer.kind === 'item') state.stock[offer.item] += offer.qty;
  else if (offer.kind === 'recipe') learnRecipe(state, offer.recipe);
  else if (!state.designs.includes(offer.gear)) state.designs.push(offer.gear);
  state.offers.splice(index, 1);
  return true;
}

export function learnRecipe(state: GameState, recipe: RecipeId): boolean {
  if (state.recipes.includes(recipe)) return false;
  state.recipes.push(recipe);
  if (state.menu.length < menuSlots(state.level)) state.menu.push(recipe);
  return true;
}

export function toggleMenu(state: GameState, recipe: RecipeId): boolean {
  const index = state.menu.indexOf(recipe);
  if (index >= 0) {
    state.menu.splice(index, 1);
    return true;
  }
  if (!state.recipes.includes(recipe) || state.menu.length >= menuSlots(state.level)) return false;
  state.menu.push(recipe);
  return true;
}

export function buyRoom(state: GameState): boolean {
  const price = roomCost(state.rooms);
  if (state.rooms >= maxRooms(state.level) || state.gold < price) return false;
  state.gold -= price;
  state.rooms += 1;
  return true;
}

export function buyStove(state: GameState): boolean {
  const price = stoveCost(state.stove);
  if (state.stove >= STOVE_MAX || state.gold < price) return false;
  state.gold -= price;
  state.stove += 1;
  return true;
}

export function buyDecor(state: GameState): boolean {
  const price = decorCost(state.decor);
  if (state.decor >= DECOR_MAX || state.gold < price) return false;
  state.gold -= price;
  state.decor += 1;
  return true;
}

// --- workshop ---

export function crafterAvailable(state: GameState, crafter: CrafterId): boolean {
  return !state.crafters.includes(crafter) && hasFlag(state, crafter === 'apprentice' ? 'workshop' : crafter);
}

export function hireCrafter(state: GameState, crafter: CrafterId): boolean {
  const cost = CRAFTERS[crafter].cost;
  if (!crafterAvailable(state, crafter) || state.gold < cost) return false;
  state.gold -= cost;
  state.crafters.push(crafter);
  state.energy[crafter] = CRAFTERS[crafter].energy;
  return true;
}

export function knowsDesign(state: GameState, gear: GearId): boolean {
  return state.crafters.includes(GEAR[gear].crafter) && (GEAR[gear].tier === 1 || state.designs.includes(gear));
}

export function canCraft(state: GameState, gear: GearId): boolean {
  const def = GEAR[gear];
  if (!knowsDesign(state, gear) || (state.energy[def.crafter] ?? 0) < def.work) return false;
  return Object.entries(def.materials).every(([item, count]) => state.stock[item as ItemId] >= (count ?? 0));
}

export function craft(state: GameState, gear: GearId): boolean {
  if (!canCraft(state, gear)) return false;
  const def = GEAR[gear];
  for (const [item, count] of Object.entries(def.materials)) state.stock[item as ItemId] -= count ?? 0;
  state.energy[def.crafter] = (state.energy[def.crafter] ?? 0) - def.work;
  state.gear[gear] = (state.gear[gear] ?? 0) + 1;
  return true;
}

/** The best upgrade this adventurer would like per slot, whether or not it is in stock. */
export function gearWishes(state: GameState, adv: Adventurer): GearId[] {
  const wishes: GearId[] = [];
  const slots: GearSlot[] = ['weapon', 'body', 'head', 'feet', 'trinket', 'potion'];
  for (const slot of slots) {
    const current = adv.gear[slot];
    const better = GEAR_IDS.filter(
      (id) =>
        GEAR[id].slot === slot &&
        GEAR[id].classes.includes(adv.cls) &&
        knowsDesign(state, id) &&
        (!current || GEAR[id].power > GEAR[current].power),
    ).sort((a, b) => GEAR[b].power - GEAR[a].power);
    if (better[0]) wishes.push(better[0]);
  }
  return wishes;
}

function shopForGear(state: GameState, adv: Adventurer, news: News[]): number {
  let spent = 0;
  const slots: GearSlot[] = ['weapon', 'body', 'head', 'feet', 'trinket', 'potion'];
  for (const slot of slots) {
    const current = adv.gear[slot];
    const options = GEAR_IDS.filter(
      (id) =>
        GEAR[id].slot === slot &&
        GEAR[id].classes.includes(adv.cls) &&
        (state.gear[id] ?? 0) > 0 &&
        gearPrice(id) <= adv.purse &&
        (!current || GEAR[id].power > GEAR[current].power),
    ).sort((a, b) => GEAR[b].power - GEAR[a].power);
    const choice = options[0];
    if (!choice) continue;
    const price = gearPrice(choice);
    adv.purse -= price;
    adv.gear[slot] = choice;
    state.gear[choice] = (state.gear[choice] ?? 0) - 1;
    state.gold += price;
    spent += price;
    news.push({ type: 'bought', advId: adv.id, gear: choice, price });
  }
  return spent;
}

// --- evening ---

export interface ServiceTotals {
  served: number;
  lost: number;
  food: number;
  tips: number;
  xp: number;
  levelsGained: number;
}

/** Closes the day after service: lodging is paid, and guests whose stay is over shop and set out. */
export function finishDay(state: GameState, totals: ServiceTotals): DaySummary {
  const news: News[] = [];
  let lodging = 0;
  let gearSales = 0;
  for (const adv of guests(state)) {
    if (adv.lodged) {
      const price = lodgingPrice(adv);
      lodging += price;
      state.gold += price;
      news.push({ type: 'lodging', advId: adv.id, price });
    }
    adv.nights -= 1;
    if (adv.nights <= 0) {
      gearSales += shopForGear(state, adv, news);
      adv.status = 'quest';
      adv.lodged = false;
      adv.questDays = randomInt(state, 1, adv.level >= 3 ? 3 : 2);
      news.push({ type: 'departed', advId: adv.id });
    }
  }
  const summary: DaySummary = { ...totals, lodging, gearSales, news };
  state.summary = summary;
  state.phase = 'evening';
  state.offers = [];
  return summary;
}

export function unknownCrafters(state: GameState): CrafterId[] {
  return CRAFTER_IDS.filter((crafter) => crafterAvailable(state, crafter));
}

export { BASIC_IDS };
