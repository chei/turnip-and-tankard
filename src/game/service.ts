import { RECIPES, RECIPE_IDS, recipePrice, recipeXp, seatCount, type IngredientId, type ItemId, type RecipeId } from './data';
import {
  addXp,
  adventurer,
  canMake,
  guests,
  learnRecipe,
  pickWeighted,
  random,
  type GameState,
  type ServiceTotals,
} from './game';

/** Opening hours: guests sit down at the counter, order, and the player cooks for them. */

export const PAN_SIZE = 4;

export interface CustomerSpec {
  kind: 'adventurer' | 'villager';
  advId?: number;
  seed: number;
}

export interface Customer {
  uid: number;
  spec: CustomerSpec;
  /** `null`: nothing on the menu could be made, so they leave at once. */
  order: RecipeId | null;
  patience: number;
  maxPatience: number;
  mood: 'waiting' | 'happy' | 'angry';
  /** Seconds since sitting down (while waiting) or until the seat frees up (afterwards). */
  timer: number;
  age: number;
  paid: number;
}

export type Dish = RecipeId | 'slop';

export type ServiceEvent =
  | { type: 'arrive'; seat: number }
  | { type: 'served'; seat: number; gold: number; tip: number }
  | { type: 'left'; seat: number }
  | { type: 'cooked'; dish: Dish }
  | { type: 'discovered'; recipe: RecipeId }
  | { type: 'levelUp'; level: number };

export interface Service {
  queue: CustomerSpec[];
  seats: (Customer | null)[];
  pan: IngredientId[];
  cooking: { dish: Dish; left: number; total: number; discovered: boolean } | null;
  plate: Dish | null;
  spawnIn: number;
  totals: ServiceTotals;
  events: ServiceEvent[];
  nextUid: number;
  done: boolean;
}

export function startService(state: GameState): Service {
  const queue: CustomerSpec[] = [];
  const villagers = Math.min(20, 4 + Math.floor(state.level * 1.5));
  for (let i = 0; i < villagers; i++) queue.push({ kind: 'villager', seed: Math.floor(random(state) * 0x7fffffff) });
  for (const adv of guests(state)) {
    queue.push({ kind: 'adventurer', advId: adv.id, seed: adv.seed });
    if (random(state) < 0.4) queue.push({ kind: 'adventurer', advId: adv.id, seed: adv.seed });
  }
  // Shuffle, but never seat the same adventurer twice in a row.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [queue[i], queue[j]] = [queue[j]!, queue[i]!];
  }
  return {
    queue,
    seats: Array.from({ length: seatCount(state.level) }, () => null),
    pan: [],
    cooking: null,
    plate: null,
    spawnIn: 0.8,
    totals: { served: 0, lost: 0, food: 0, tips: 0, xp: 0, levelsGained: 0 },
    events: [],
    nextUid: 1,
    done: false,
  };
}

/** The recipe (known or not) made from exactly these ingredients, in any order. */
export function matchRecipe(pan: readonly IngredientId[]): RecipeId | null {
  const key = [...pan].sort().join('+');
  return RECIPE_IDS.find((id) => [...RECIPES[id].ingredients].sort().join('+') === key) ?? null;
}

export function cookTime(state: GameState, ingredients: number): number {
  return (1.3 + 0.25 * ingredients) * (1 - 0.2 * state.stove);
}

export function addToPan(state: GameState, service: Service, item: IngredientId): boolean {
  if (service.cooking || service.plate || service.pan.length >= PAN_SIZE || state.stock[item] <= 0) return false;
  state.stock[item] -= 1;
  service.pan.push(item);
  return true;
}

export function removeFromPan(state: GameState, service: Service, index: number): boolean {
  if (service.cooking) return false;
  const item = service.pan[index];
  if (!item) return false;
  service.pan.splice(index, 1);
  state.stock[item] += 1;
  return true;
}

export function cook(state: GameState, service: Service): boolean {
  if (service.cooking || service.plate || service.pan.length === 0) return false;
  const recipe = matchRecipe(service.pan);
  const total = cookTime(state, service.pan.length);
  service.cooking = {
    dish: recipe ?? 'slop',
    left: total,
    total,
    discovered: recipe !== null && !state.recipes.includes(recipe),
  };
  return true;
}

/** The seat that would get the dish on the plate: whoever ordered it and has waited longest. */
export function seatWanting(service: Service, dish: Dish | null): number {
  let best = -1;
  for (const [index, customer] of service.seats.entries()) {
    if (!customer || customer.mood !== 'waiting' || customer.order !== dish) continue;
    if (best < 0 || customer.patience < service.seats[best]!.patience) best = index;
  }
  return best;
}

export function serve(state: GameState, service: Service, seat = seatWanting(service, service.plate)): boolean {
  const customer = service.seats[seat];
  const dish = service.plate;
  if (!customer || !dish || dish === 'slop' || customer.mood !== 'waiting' || customer.order !== dish) return false;
  const price = recipePrice(dish);
  const mood = customer.patience / customer.maxPatience;
  const tip = Math.round(price * 0.3 * mood * (1 + 0.2 * state.decor));
  const xp = recipeXp(dish);
  state.gold += price + tip;
  state.stats.served += 1;
  service.totals.served += 1;
  service.totals.food += price;
  service.totals.tips += tip;
  service.totals.xp += xp;
  const levels = addXp(state, xp);
  service.totals.levelsGained += levels;
  if (customer.spec.advId !== undefined) {
    const adv = adventurer(state, customer.spec.advId);
    if (adv) adv.meal += price;
  }
  customer.mood = 'happy';
  customer.timer = 1.4;
  customer.paid = price + tip;
  service.plate = null;
  service.events.push({ type: 'served', seat, gold: price, tip });
  if (levels > 0) service.events.push({ type: 'levelUp', level: state.level });
  return true;
}

export function discard(service: Service): boolean {
  if (!service.plate) return false;
  service.plate = null;
  return true;
}

function chooseOrder(state: GameState, service: Service, spec: CustomerSpec): RecipeId | null {
  // Ingredients already promised to waiting guests are not offered twice.
  const stock: Record<ItemId, number> = { ...state.stock };
  for (const item of service.pan) stock[item] += 1;
  for (const customer of service.seats) {
    if (!customer || customer.mood !== 'waiting' || !customer.order) continue;
    if (customer.order === service.plate || customer.order === service.cooking?.dish) continue;
    for (const item of RECIPES[customer.order].ingredients) stock[item] -= 1;
  }
  const options = state.menu.filter((recipe) => canMake(stock, recipe));
  if (options.length === 0) return null;
  const adv = spec.advId !== undefined ? adventurer(state, spec.advId) : undefined;
  // Villagers look at the price; seasoned adventurers want the best dish in the house.
  const taste = adv ? 0.4 + adv.level * 0.25 : -0.4;
  return pickWeighted(state, options, (recipe) => Math.pow(recipePrice(recipe), taste));
}

function seatNext(state: GameState, service: Service, seat: number): void {
  const spec = service.queue.shift()!;
  const order = chooseOrder(state, service, spec);
  const patience = (spec.kind === 'adventurer' ? 24 : 20) + state.decor * 3 + (state.day === 1 ? 10 : 0);
  const customer: Customer = {
    uid: service.nextUid++,
    spec,
    order,
    patience,
    maxPatience: patience,
    mood: order ? 'waiting' : 'angry',
    timer: order ? 0 : 1.8,
    age: 0,
    paid: 0,
  };
  service.seats[seat] = customer;
  if (order) {
    service.events.push({ type: 'arrive', seat });
  } else {
    service.totals.lost += 1;
    service.events.push({ type: 'left', seat });
  }
}

export function tick(state: GameState, service: Service, dt: number): void {
  if (service.done) return;

  if (service.cooking) {
    service.cooking.left -= dt;
    if (service.cooking.left <= 0) {
      const { dish, discovered } = service.cooking;
      service.cooking = null;
      service.pan = [];
      service.plate = dish;
      service.events.push({ type: 'cooked', dish });
      if (discovered && dish !== 'slop' && learnRecipe(state, dish)) {
        state.stats.discovered += 1;
        service.events.push({ type: 'discovered', recipe: dish });
      }
    }
  }

  for (const [index, customer] of service.seats.entries()) {
    if (!customer) continue;
    customer.age += dt;
    if (customer.mood === 'waiting') {
      customer.patience -= dt;
      if (customer.patience <= 0) {
        customer.mood = 'angry';
        customer.timer = 1.4;
        service.totals.lost += 1;
        service.events.push({ type: 'left', seat: index });
      }
    } else {
      customer.timer -= dt;
      if (customer.timer <= 0) service.seats[index] = null;
    }
  }

  const free = service.seats.findIndex((customer) => customer === null);
  if (service.queue.length > 0 && free >= 0) {
    service.spawnIn -= dt;
    if (service.spawnIn <= 0) {
      seatNext(state, service, free);
      service.spawnIn = 0.9 + random(state) * 2;
    }
  }

  if (service.queue.length === 0 && service.seats.every((customer) => customer === null)) {
    // Whatever is still in the pan goes back to the larder.
    if (!service.cooking) {
      for (const item of service.pan) state.stock[item] += 1;
      service.pan = [];
      service.done = true;
    }
  }
}
