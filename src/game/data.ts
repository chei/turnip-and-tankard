/** Static game data: what exists in the world and what it costs. No logic lives here. */

export type IngredientId =
  | 'turnip'
  | 'onion'
  | 'bread'
  | 'ale'
  | 'egg'
  | 'sausage'
  | 'cheese'
  | 'herbs'
  | 'apple'
  | 'mushroom'
  | 'meat'
  | 'fish'
  | 'honey'
  | 'pepper';

export type MaterialId = 'wood' | 'cloth' | 'leather' | 'iron' | 'crystal';
export type ItemId = IngredientId | MaterialId;

export interface ItemDef {
  kind: 'ingredient' | 'material';
  /** What one piece is worth; dish and gear prices are built from this. */
  value: number;
  /** Always for sale at the market. */
  basic?: boolean;
  /** Adventurers of at least this level can bring it back. */
  tier: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  turnip: { kind: 'ingredient', value: 1, basic: true, tier: 1 },
  onion: { kind: 'ingredient', value: 1, basic: true, tier: 1 },
  bread: { kind: 'ingredient', value: 2, basic: true, tier: 1 },
  ale: { kind: 'ingredient', value: 2, basic: true, tier: 1 },
  egg: { kind: 'ingredient', value: 2, tier: 1 },
  sausage: { kind: 'ingredient', value: 4, tier: 1 },
  cheese: { kind: 'ingredient', value: 4, tier: 1 },
  herbs: { kind: 'ingredient', value: 3, tier: 1 },
  apple: { kind: 'ingredient', value: 2, tier: 2 },
  mushroom: { kind: 'ingredient', value: 3, tier: 2 },
  meat: { kind: 'ingredient', value: 6, tier: 2 },
  fish: { kind: 'ingredient', value: 5, tier: 3 },
  honey: { kind: 'ingredient', value: 5, tier: 3 },
  pepper: { kind: 'ingredient', value: 8, tier: 4 },
  wood: { kind: 'material', value: 3, tier: 1 },
  cloth: { kind: 'material', value: 3, tier: 1 },
  leather: { kind: 'material', value: 4, tier: 1 },
  iron: { kind: 'material', value: 6, tier: 2 },
  crystal: { kind: 'material', value: 12, tier: 4 },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const INGREDIENT_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === 'ingredient') as IngredientId[];
export const MATERIAL_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === 'material') as MaterialId[];
export const BASIC_IDS = ITEM_IDS.filter((id) => ITEMS[id].basic) as IngredientId[];

export type RecipeId =
  | 'roastTurnip'
  | 'tankard'
  | 'turnipSoup'
  | 'onionBread'
  | 'sausageTurnip'
  | 'cheeseTurnip'
  | 'scrambledEgg'
  | 'cheeseBread'
  | 'sausageEgg'
  | 'herbTurnip'
  | 'mushroomStew'
  | 'bakedApple'
  | 'roastMeat'
  | 'grilledFish'
  | 'honeyApple'
  | 'mead'
  | 'hunterStew'
  | 'fishSoup'
  | 'platter'
  | 'applePie'
  | 'dragonRoast';

export type DishShape = 'roast' | 'duo' | 'bowl' | 'mug' | 'toast' | 'pie' | 'platter';

export interface RecipeDef {
  ingredients: IngredientId[];
  /** Adventurers of at least this level can teach it. 0 = known from the start. */
  tier: number;
  shape: DishShape;
  /** Palette swaps for the dish template: X/x main, V/v second, L garnish. */
  colours: Record<string, string>;
}

export const RECIPES: Record<RecipeId, RecipeDef> = {
  roastTurnip: { ingredients: ['turnip'], tier: 0, shape: 'roast', colours: { X: 'm', x: 'M', L: 'w' } },
  tankard: { ingredients: ['ale'], tier: 0, shape: 'mug', colours: { X: 'y', x: 'Y' } },
  turnipSoup: { ingredients: ['turnip', 'onion'], tier: 0, shape: 'bowl', colours: { X: 'c', V: 'm', L: 'g' } },
  onionBread: { ingredients: ['bread', 'onion'], tier: 1, shape: 'toast', colours: { X: 'w', x: 'W', L: 'p' } },
  sausageTurnip: {
    ingredients: ['turnip', 'sausage'],
    tier: 1,
    shape: 'duo',
    colours: { X: 'm', x: 'M', V: 'r', v: 'R', L: 'w' },
  },
  cheeseTurnip: { ingredients: ['turnip', 'cheese'], tier: 1, shape: 'roast', colours: { X: 'y', x: 'm', L: 'Y' } },
  scrambledEgg: { ingredients: ['egg', 'onion'], tier: 1, shape: 'roast', colours: { X: 'y', x: 'Y', L: 'w' } },
  cheeseBread: { ingredients: ['bread', 'cheese'], tier: 1, shape: 'toast', colours: { X: 'y', x: 'Y', L: 'o' } },
  sausageEgg: {
    ingredients: ['egg', 'sausage'],
    tier: 2,
    shape: 'duo',
    colours: { X: 'y', x: 'Y', V: 'r', v: 'R', L: 'w' },
  },
  herbTurnip: { ingredients: ['turnip', 'herbs'], tier: 2, shape: 'roast', colours: { X: 'm', x: 'M', L: 'G' } },
  mushroomStew: {
    ingredients: ['mushroom', 'onion', 'herbs'],
    tier: 2,
    shape: 'bowl',
    colours: { X: 't', V: 'c', L: 'g' },
  },
  bakedApple: { ingredients: ['apple'], tier: 2, shape: 'roast', colours: { X: 'r', x: 'R', L: 'o' } },
  roastMeat: { ingredients: ['meat', 'herbs'], tier: 3, shape: 'roast', colours: { X: 'T', x: 'u', L: 'g' } },
  grilledFish: { ingredients: ['fish', 'herbs'], tier: 3, shape: 'roast', colours: { X: 'b', x: 'B', L: 'g' } },
  honeyApple: {
    ingredients: ['apple', 'honey'],
    tier: 3,
    shape: 'duo',
    colours: { X: 'r', x: 'R', V: 'y', v: 'o', L: 'w' },
  },
  mead: { ingredients: ['ale', 'honey'], tier: 3, shape: 'mug', colours: { X: 'o', x: 'O' } },
  hunterStew: {
    ingredients: ['meat', 'mushroom', 'onion'],
    tier: 4,
    shape: 'bowl',
    colours: { X: 'O', V: 'R', L: 'c' },
  },
  fishSoup: { ingredients: ['fish', 'onion', 'pepper'], tier: 4, shape: 'bowl', colours: { X: 'r', V: 'b', L: 'y' } },
  platter: {
    ingredients: ['sausage', 'cheese', 'bread', 'turnip'],
    tier: 4,
    shape: 'platter',
    colours: { X: 'r', x: 'R', V: 'y', v: 'Y', L: 'm' },
  },
  applePie: { ingredients: ['apple', 'bread', 'honey'], tier: 5, shape: 'pie', colours: { X: 'r' } },
  dragonRoast: {
    ingredients: ['meat', 'pepper', 'honey'],
    tier: 5,
    shape: 'duo',
    colours: { X: 'T', x: 'u', V: 'o', v: 'r', L: 'y' },
  },
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];
export const STARTING_RECIPES: RecipeId[] = ['roastTurnip', 'tankard', 'turnipSoup'];

export function recipeCost(id: RecipeId): number {
  return RECIPES[id].ingredients.reduce((sum, ingredient) => sum + ITEMS[ingredient].value, 0);
}

/** A small margin on a single turnip, a better one on dishes that take more work. */
export function recipePrice(id: RecipeId): number {
  const count = RECIPES[id].ingredients.length;
  return Math.ceil(recipeCost(id) * 1.5) + 1 + 2 * (count - 1);
}

export function recipeXp(id: RecipeId): number {
  return 1 + Math.round(recipePrice(id) / 3);
}

export type AdventurerClass = 'warrior' | 'mage' | 'rogue' | 'ranger';
export const CLASSES: AdventurerClass[] = ['warrior', 'mage', 'rogue', 'ranger'];

export type CrafterId = 'apprentice' | 'weaponsmith' | 'tailor' | 'armorer' | 'wizard';
export const CRAFTER_IDS: CrafterId[] = ['apprentice', 'weaponsmith', 'tailor', 'armorer', 'wizard'];

/** Inn level at which each crafter turns up, and what hiring costs. */
export const CRAFTERS: Record<CrafterId, { level: number; cost: number; energy: number }> = {
  apprentice: { level: 4, cost: 0, energy: 2 },
  weaponsmith: { level: 5, cost: 120, energy: 2 },
  tailor: { level: 6, cost: 160, energy: 2 },
  armorer: { level: 7, cost: 220, energy: 2 },
  wizard: { level: 8, cost: 300, energy: 3 },
};

export type GearSlot = 'weapon' | 'body' | 'head' | 'feet' | 'trinket' | 'potion';

export type GearId =
  | 'knife'
  | 'shirt'
  | 'wand'
  | 'dagger'
  | 'sword'
  | 'bow'
  | 'greatsword'
  | 'boots'
  | 'hat'
  | 'leatherarmor'
  | 'helmet'
  | 'chainmail'
  | 'breastplate'
  | 'plate'
  | 'potion'
  | 'talisman'
  | 'crystalwand';

export interface GearDef {
  crafter: CrafterId;
  /** 1 = the crafter knows it when hired; higher tiers come as designs from adventurers. */
  tier: number;
  slot: GearSlot;
  classes: AdventurerClass[];
  materials: Partial<Record<ItemId, number>>;
  power: number;
  /** Work the crafter spends on one piece. */
  work: number;
}

const ALL = CLASSES;

export const GEAR: Record<GearId, GearDef> = {
  knife: { crafter: 'apprentice', tier: 1, slot: 'weapon', classes: ['warrior', 'rogue', 'ranger'], materials: { wood: 1, iron: 1 }, power: 3, work: 1 },
  shirt: { crafter: 'apprentice', tier: 1, slot: 'body', classes: ALL, materials: { cloth: 2 }, power: 2, work: 1 },
  wand: { crafter: 'apprentice', tier: 1, slot: 'weapon', classes: ['mage'], materials: { wood: 2 }, power: 3, work: 1 },
  dagger: { crafter: 'weaponsmith', tier: 1, slot: 'weapon', classes: ['rogue', 'ranger'], materials: { iron: 1, leather: 1 }, power: 5, work: 1 },
  sword: { crafter: 'weaponsmith', tier: 1, slot: 'weapon', classes: ['warrior'], materials: { iron: 2, wood: 1 }, power: 7, work: 1 },
  bow: { crafter: 'weaponsmith', tier: 2, slot: 'weapon', classes: ['ranger'], materials: { wood: 2, cloth: 1 }, power: 8, work: 1 },
  greatsword: { crafter: 'weaponsmith', tier: 3, slot: 'weapon', classes: ['warrior'], materials: { iron: 3, leather: 1 }, power: 11, work: 2 },
  boots: { crafter: 'tailor', tier: 1, slot: 'feet', classes: ALL, materials: { leather: 2 }, power: 3, work: 1 },
  hat: { crafter: 'tailor', tier: 2, slot: 'head', classes: ['mage'], materials: { cloth: 2, crystal: 1 }, power: 6, work: 1 },
  leatherarmor: { crafter: 'tailor', tier: 2, slot: 'body', classes: ['rogue', 'ranger'], materials: { leather: 3, cloth: 1 }, power: 6, work: 2 },
  helmet: { crafter: 'armorer', tier: 1, slot: 'head', classes: ['warrior', 'ranger'], materials: { iron: 2, leather: 1 }, power: 4, work: 1 },
  chainmail: { crafter: 'armorer', tier: 2, slot: 'body', classes: ['warrior', 'ranger'], materials: { iron: 3 }, power: 7, work: 1 },
  breastplate: { crafter: 'armorer', tier: 3, slot: 'body', classes: ['warrior'], materials: { iron: 4, leather: 1 }, power: 10, work: 2 },
  plate: { crafter: 'armorer', tier: 4, slot: 'body', classes: ['warrior'], materials: { iron: 6, leather: 2 }, power: 14, work: 2 },
  potion: { crafter: 'wizard', tier: 1, slot: 'potion', classes: ALL, materials: { herbs: 1, mushroom: 1 }, power: 6, work: 1 },
  talisman: { crafter: 'wizard', tier: 2, slot: 'trinket', classes: ALL, materials: { crystal: 1, leather: 1 }, power: 5, work: 1 },
  crystalwand: { crafter: 'wizard', tier: 3, slot: 'weapon', classes: ['mage'], materials: { wood: 1, crystal: 2 }, power: 10, work: 2 },
};

export const GEAR_IDS = Object.keys(GEAR) as GearId[];

export function gearPrice(id: GearId): number {
  const def = GEAR[id];
  let materials = 0;
  for (const [item, count] of Object.entries(def.materials)) materials += ITEMS[item as ItemId].value * (count ?? 0);
  return materials * 2 + def.tier * 4 + def.power;
}

/** XP needed to go from `level` to the next one. */
export function xpForLevel(level: number): number {
  return Math.round(18 * Math.pow(level, 1.5));
}

export const MAX_LEVEL = 12;

const MENU_SLOTS = [2, 3, 4, 5, 5, 6, 7, 8, 8, 9, 9, 10];
export function menuSlots(level: number): number {
  return MENU_SLOTS[Math.min(level, MENU_SLOTS.length) - 1] ?? 2;
}

export function seatCount(level: number): number {
  return level >= 6 ? 4 : level >= 3 ? 3 : 2;
}

export function maxRooms(level: number): number {
  return Math.min(8, 2 + level);
}

export function roomCost(rooms: number): number {
  return 40 + (rooms - 2) * 45;
}

export const STOVE_MAX = 3;
export const DECOR_MAX = 3;
export function stoveCost(stove: number): number {
  return 60 + stove * 90;
}
export function decorCost(decor: number): number {
  return 50 + decor * 80;
}

/** Language-neutral given names for adventurers. */
export const ADVENTURER_NAMES = [
  'Bori', 'Zalán', 'Mira', 'Torm', 'Elza', 'Garen', 'Ivor', 'Luna', 'Runa', 'Kaspar', 'Tilda', 'Odo',
  'Vilma', 'Brann', 'Sára', 'Dorka', 'Aldo', 'Nilla', 'Radu', 'Hanna', 'Emil', 'Freya', 'Milo', 'Zita',
];
