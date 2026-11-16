import { ITEM_ART, DISH_ART } from '../src/art/items';
import { drawSprite } from '../src/art/pixels';

const all = [...Object.entries(ITEM_ART), ...Object.entries(DISH_ART)];
const cols = 12;
const cell = 20;
const scale = 5;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = cols * cell;
canvas.height = Math.ceil(all.length / cols) * cell;
canvas.style.width = `${canvas.width * scale}px`;
const ctx = canvas.getContext('2d')!;
all.forEach(([name, art], i) => {
  const swaps = name in DISH_ART ? { X: 'm', x: 'M', V: 'r', v: 'R', L: 'g' } : undefined;
  drawSprite(ctx, art, (i % cols) * cell + 2, Math.floor(i / cols) * cell + 2, swaps);
});
document.title = 'ready';
