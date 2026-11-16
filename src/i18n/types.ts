import type { AdventurerClass, CrafterId, GearId, GearSlot, ItemId, RecipeId } from '../game/data';
import type { Speaker, StoryBeat } from '../game/story';

export interface Messages {
  tagline: string;
  newGame: string;
  continueGame: string;
  newGameConfirm: string;
  yes: string;
  no: string;
  language: string;
  sound: string;
  music: string;
  on: string;
  off: string;
  settings: string;
  close: string;
  next: string;

  day: (n: number) => string;
  level: (n: number) => string;
  morning: string;
  service: string;
  evening: string;

  items: Record<ItemId, string>;
  recipes: Record<RecipeId, string>;
  gear: Record<GearId, string>;
  slots: Record<GearSlot, string>;
  classes: Record<AdventurerClass, string>;
  crafters: Record<CrafterId, { name: string; title: string }>;
  speakers: Record<Speaker, string>;
  story: Record<StoryBeat, { title: string; lines: string[] }>;
  chapter: (n: number) => string;

  tabs: { guests: string; market: string; menu: string; inn: string; workshop: string };
  open: string;
  openHint: string;
  emptyMenu: string;

  // guests tab
  newsTitle: string;
  offersTitle: string;
  noOffers: string;
  buy: string;
  learn: string;
  recipeOffer: string;
  designOffer: string;
  news: {
    arrived: (name: string, cls: string) => string;
    returnedWin: (name: string) => string;
    returnedLoss: (name: string) => string;
    levelUp: (name: string, level: number) => string;
    noRoom: (name: string) => string;
    departed: (name: string) => string;
    bought: (name: string, gear: string, price: number) => string;
    lodging: (name: string, price: number) => string;
    gift: string;
  };

  // market tab
  basicsTitle: string;
  pedlarTitle: string;
  pedlarLocked: string;
  pedlarEmpty: string;
  have: (n: number) => string;
  left: (n: number) => string;

  // menu tab
  menuTitle: (n: number, max: number) => string;
  menuHint: string;
  recipeBook: string;
  recipeHint: string;
  onMenu: string;
  offMenu: string;
  menuFull: string;
  missing: string;

  // inn tab
  upgrades: string;
  rooms: (n: number, max: number) => string;
  roomsDesc: string;
  stove: (n: number, max: number) => string;
  stoveDesc: string;
  decor: (n: number, max: number) => string;
  decorDesc: string;
  maxed: string;
  needLevel: (n: number) => string;
  adventurersTitle: string;
  noAdventurers: string;
  atInn: (nights: number) => string;
  onQuest: (days: number) => string;
  questChance: (percent: number) => string;
  wearing: string;
  nothing: string;

  // workshop tab
  workshopLocked: string;
  hire: string;
  work: (n: number, max: number) => string;
  shelf: string;
  shelfEmpty: string;
  wanted: string;
  designsHint: string;
  make: string;
  fits: string;
  power: (n: number) => string;
  materialsTitle: string;

  // service
  panEmpty: string;
  cook: string;
  cooking: string;
  serve: string;
  nobodyWants: string;
  discard: string;
  slop: string;
  guestsLeft: (n: number) => string;
  tutorial: string;
  nothingToEat: string;

  // toasts
  levelUpToast: (n: number) => string;
  discovered: (name: string) => string;
  unlockedMenu: (n: number) => string;
  unlockedSeat: string;

  // evening
  summaryTitle: (n: number) => string;
  served: string;
  lost: string;
  food: string;
  tips: string;
  lodging: string;
  gearSales: string;
  total: string;
  xp: string;
  nextDay: string;
  eveningNews: string;
}
