import { characterCanvas, lookKey, type Look } from '../art/characters';
import { DISH_ART, ITEM_ART } from '../art/items';
import { spriteCanvas, spriteUrl, type Swaps } from '../art/pixels';
import { RECIPES, type CrafterId, type RecipeId } from '../game/data';
import type { Speaker } from '../game/story';

/** Sprites as `<img>` tags for the DOM parts of the interface. */

export function itemUrl(name: string): string {
  return spriteUrl(`item:${name}`, () => spriteCanvas(ITEM_ART[name] ?? ITEM_ART.slop!));
}

export function icon(name: string, cls = ''): string {
  return `<img class="px ${cls}" src="${itemUrl(name)}" alt="" draggable="false">`;
}

export function dishSwaps(recipe: RecipeId): Swaps {
  return RECIPES[recipe].colours;
}

export function dishIcon(recipe: RecipeId | 'slop', cls = ''): string {
  if (recipe === 'slop') return icon('slop', cls);
  const url = spriteUrl(`dish:${recipe}`, () => spriteCanvas(DISH_ART[RECIPES[recipe].shape]!, dishSwaps(recipe)));
  return `<img class="px ${cls}" src="${url}" alt="" draggable="false">`;
}

/** Head and shoulders, 24×26. */
export function faceUrl(look: Look): string {
  return spriteUrl(`face:${lookKey(look)}`, () => {
    const full = characterCanvas(look);
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 26;
    canvas.getContext('2d')!.drawImage(full, 0, 0);
    return canvas;
  });
}

export function face(look: Look, cls = ''): string {
  return `<img class="px face ${cls}" src="${faceUrl(look)}" alt="" draggable="false">`;
}

export function portraitUrl(look: Look): string {
  return spriteUrl(`portrait:${lookKey(look)}`, () => characterCanvas(look));
}

/** The fixed looks of the story's key characters. */
export const SPEAKER_LOOKS: Record<Speaker, Look> = {
  rozi: { cls: 'villager', skin: 0, hair: 4, hairStyle: 'bun', beard: 'none', headgear: 'none', outfit: 3 },
  pedlar: { cls: 'villager', skin: 1, hair: 5, hairStyle: 'short', beard: 'short', headgear: 'straw', outfit: 2 },
  lili: { cls: 'warrior', skin: 0, hair: 2, hairStyle: 'long', beard: 'none', headgear: 'none', outfit: 0 },
  palko: { cls: 'villager', skin: 3, hair: 1, hairStyle: 'spiky', beard: 'none', headgear: 'none', outfit: 1 },
  weaponsmith: { cls: 'villager', skin: 1, hair: 3, hairStyle: 'bald', beard: 'long', headgear: 'bandana', outfit: 0 },
  tailor: { cls: 'villager', skin: 3, hair: 0, hairStyle: 'long', beard: 'none', headgear: 'none', outfit: 4 },
  armorer: { cls: 'warrior', skin: 2, hair: 3, hairStyle: 'bun', beard: 'none', headgear: 'none', outfit: 1 },
  wizard: { cls: 'mage', skin: 0, hair: 4, hairStyle: 'long', beard: 'long', headgear: 'wizard', outfit: 1 },
};

export const CRAFTER_SPEAKER: Record<CrafterId, Speaker> = {
  apprentice: 'palko',
  weaponsmith: 'weaponsmith',
  tailor: 'tailor',
  armorer: 'armorer',
  wizard: 'wizard',
};
