import { CHAR_W, drawCharacter, type Look } from './characters';
import { DISH_ART, ITEM_ART } from './items';
import { drawSprite, sprite, type Swaps } from './pixels';

/** The common room seen from behind the counter, in 160×108 pixels. */
export const SCENE_W = 160;
export const SCENE_H = 108;
const COUNTER_Y = 78;
const CHAR_Y = 45;

export type Daylight = 'morning' | 'day' | 'evening';

export interface SeatView {
  key: number;
  look: Look;
  /** Icons in the speech bubble; empty for no bubble. */
  icons: string[];
  /** 0..1, or -1 to hide the bar. */
  patience: number;
  mood: 'idle' | 'waiting' | 'happy' | 'angry';
  /** Seconds since arriving. */
  age: number;
  /** Seconds until the seat frees up (for happy/angry guests). */
  leaveIn: number;
  /** Dish standing on the counter in front of a served guest. */
  dish?: { art: string; swaps: Swaps };
}

const HEART = sprite(`
  .kk.kk.
  krrkrrk
  krwrrrk
  krrrrrk
  .krrrk.
  ..krk..
  ...k...
`);

const ANGER = sprite(`
  .kk.kk.
  krk.krk
  .krkrk.
  ..k.k..
  .krkrk.
  krk.krk
  .kk.kk.
`);

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
}

/** A cheap repeatable noise in 0..1 for texture. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SKY: Record<Daylight, { top: string; bottom: string }> = {
  morning: { top: '#8fd0ea', bottom: '#fbe3a8' },
  day: { top: '#6fb9ea', bottom: '#b8e2f2' },
  evening: { top: '#241f4f', bottom: '#7a3f6e' },
};

function drawWindow(ctx: CanvasRenderingContext2D, light: Daylight): void {
  const x = 8;
  const y = 13;
  const w = 28;
  const h = 28;
  rect(ctx, x - 2, y - 2, w + 4, h + 4, '#3b2418');
  rect(ctx, x, y, w, h, SKY[light].top);
  rect(ctx, x, y + h - 12, w, 12, SKY[light].bottom);
  rect(ctx, x, y + h - 14, w, 2, light === 'evening' ? '#4a2f66' : '#c9e8f2');
  if (light === 'evening') {
    for (const [sx, sy] of [[3, 3], [11, 6], [20, 2], [24, 9], [7, 11], [16, 12]] as const) {
      rect(ctx, x + sx, y + sy, 1, 1, '#fff6e0');
    }
    rect(ctx, x + 19, y + 3, 4, 4, '#fff6e0');
    rect(ctx, x + 21, y + 3, 2, 2, '#241f4f');
  } else if (light === 'morning') {
    rect(ctx, x + 17, y + 12, 7, 7, '#f7d05a');
    rect(ctx, x + 18, y + 11, 5, 9, '#f7d05a');
    rect(ctx, x + 16, y + 13, 9, 5, '#f7d05a');
    rect(ctx, x + 19, y + 14, 3, 3, '#fff6e0');
  } else {
    rect(ctx, x + 4, y + 6, 9, 3, '#fff6e0');
    rect(ctx, x + 6, y + 4, 5, 2, '#fff6e0');
    rect(ctx, x + 17, y + 11, 7, 2, '#fff6e0');
  }
  // Distant hills.
  const hill = light === 'evening' ? '#1e3a3f' : '#5fa35a';
  for (let i = 0; i < w; i++) {
    const height = 3 + Math.round(2.5 * Math.sin(i / 4.5) + 1.5 * Math.sin(i / 2.1 + 1));
    rect(ctx, x + i, y + h - height, 1, height, hill);
  }
  // Bars and sill.
  rect(ctx, x + 13, y, 2, h, '#5e3622');
  rect(ctx, x, y + 13, w, 2, '#5e3622');
  rect(ctx, x - 3, y + h + 2, w + 6, 2, '#8a5433');
  rect(ctx, x - 3, y + h + 4, w + 6, 1, '#3b2418');
  // A glint on the glass.
  rect(ctx, x + 2, y + 2, 1, 4, 'rgba(255,255,255,0.5)');
  rect(ctx, x + 3, y + 2, 1, 2, 'rgba(255,255,255,0.5)');
}

function drawShelf(ctx: CanvasRenderingContext2D): void {
  const x = 46;
  const y = 30;
  rect(ctx, x, y, 44, 2, '#8a5433');
  rect(ctx, x, y + 2, 44, 1, '#3b2418');
  rect(ctx, x + 3, y + 3, 2, 3, '#5e3622');
  rect(ctx, x + 39, y + 3, 2, 3, '#5e3622');
  // Bottles, a jar, mugs and a wheel of cheese.
  const bottle = (bx: number, colour: string, shade: string) => {
    rect(ctx, bx + 1, y - 9, 2, 3, shade);
    rect(ctx, bx, y - 6, 4, 6, colour);
    rect(ctx, bx, y - 6, 1, 6, shade);
    rect(ctx, bx + 2, y - 5, 1, 2, '#fff6e0');
    rect(ctx, bx + 1, y - 10, 2, 1, '#dcc083');
  };
  bottle(x + 3, '#3f8a3a', '#255a3c');
  bottle(x + 9, '#8f2a3b', '#5e1f30');
  rect(ctx, x + 16, y - 5, 6, 5, '#b97a4a');
  rect(ctx, x + 16, y - 6, 6, 1, '#dcc083');
  rect(ctx, x + 17, y - 3, 4, 1, '#fff6e0');
  rect(ctx, x + 25, y - 5, 5, 5, '#aab4bf');
  rect(ctx, x + 30, y - 4, 1, 3, '#aab4bf');
  rect(ctx, x + 25, y - 5, 5, 1, '#fff6e0');
  rect(ctx, x + 33, y - 4, 8, 4, '#f7d05a');
  rect(ctx, x + 33, y - 1, 8, 1, '#d69a2c');
  rect(ctx, x + 35, y - 3, 1, 1, '#d69a2c');
  rect(ctx, x + 38, y - 2, 1, 1, '#d69a2c');
  // Sausages and herbs hanging on a string below.
  rect(ctx, x + 6, y + 6, 32, 1, '#5e3622');
  for (const sx of [9, 14, 19]) {
    rect(ctx, x + sx, y + 7, 3, 7, '#b0483a');
    rect(ctx, x + sx, y + 7, 1, 7, '#d04648');
    rect(ctx, x + sx + 1, y + 14, 1, 1, '#5e3622');
  }
  for (const hx of [26, 31]) {
    rect(ctx, x + hx + 1, y + 7, 1, 3, '#8a5433');
    rect(ctx, x + hx, y + 9, 3, 5, '#3f8a3a');
    rect(ctx, x + hx - 1, y + 11, 5, 2, '#7fc04a');
    rect(ctx, x + hx + 1, y + 14, 1, 1, '#3f8a3a');
  }
}

function drawFireplace(ctx: CanvasRenderingContext2D): void {
  const x = 98;
  // Chimney breast and stone surround.
  rect(ctx, x + 5, 5, 28, 22, '#737d8a');
  rect(ctx, x, 30, 38, COUNTER_Y - 30, '#737d8a');
  for (let sy = 5; sy < COUNTER_Y; sy += 5) {
    const offset = (sy / 5) % 2 === 0 ? 0 : 4;
    const left = sy < 27 ? x + 5 : x;
    const width = sy < 27 ? 28 : 38;
    rect(ctx, left, sy + 4, width, 1, '#454c58');
    for (let sx = left + offset + 3; sx < left + width - 1; sx += 8) rect(ctx, sx, sy, 1, 4, '#454c58');
    for (let sx = left + 1; sx < left + width - 1; sx += 3) {
      if (hash(sx, sy) > 0.72) rect(ctx, sx, sy + 1, 2, 1, '#aab4bf');
    }
  }
  // Mantel.
  rect(ctx, x - 2, 26, 42, 4, '#8a5433');
  rect(ctx, x - 2, 26, 42, 1, '#b97a4a');
  rect(ctx, x - 2, 30, 42, 1, '#3b2418');
  // A candle and a little pot on the mantel.
  rect(ctx, x + 3, 21, 2, 5, '#fff6e0');
  rect(ctx, x + 30, 22, 5, 4, '#b85a22');
  rect(ctx, x + 29, 21, 7, 1, '#e98537');
  // Opening.
  rect(ctx, x + 7, 42, 24, COUNTER_Y - 42, '#1f1420');
  rect(ctx, x + 9, 40, 20, 2, '#1f1420');
  rect(ctx, x + 6, 44, 1, COUNTER_Y - 44, '#454c58');
  rect(ctx, x + 31, 44, 1, COUNTER_Y - 44, '#454c58');
}

function drawDoor(ctx: CanvasRenderingContext2D): void {
  const x = 141;
  const y = 28;
  rect(ctx, x - 2, y - 2, 19, COUNTER_Y - y + 2, '#3b2418');
  rect(ctx, x, y, 15, COUNTER_Y - y, '#8a5433');
  rect(ctx, x - 1, y - 3, 17, 1, '#3b2418');
  for (const sx of [4, 9]) rect(ctx, x + sx, y, 1, COUNTER_Y - y, '#5e3622');
  rect(ctx, x, y, 15, 1, '#b97a4a');
  rect(ctx, x, y + 8, 15, 2, '#454c58');
  rect(ctx, x, y + 34, 15, 2, '#454c58');
  rect(ctx, x + 11, y + 22, 2, 3, '#f7d05a');
  rect(ctx, x + 11, y + 24, 2, 1, '#d69a2c');
}

function drawWall(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, SCENE_W, COUNTER_Y, '#d6b888');
  for (let y = 6; y < 56; y += 2) {
    for (let x = 0; x < SCENE_W; x += 2) {
      const n = hash(x, y);
      if (n > 0.93) rect(ctx, x, y, 2, 1, '#c4a273');
      else if (n < 0.04) rect(ctx, x, y, 1, 1, '#e6cda0');
    }
  }
  // Wainscot.
  rect(ctx, 0, 56, SCENE_W, COUNTER_Y - 56, '#8a5433');
  rect(ctx, 0, 56, SCENE_W, 1, '#b97a4a');
  rect(ctx, 0, 57, SCENE_W, 1, '#5e3622');
  for (let x = 6; x < SCENE_W; x += 9) rect(ctx, x, 58, 1, COUNTER_Y - 58, '#6e4128');
  // Timber frame.
  rect(ctx, 0, 0, SCENE_W, 6, '#5e3622');
  rect(ctx, 0, 5, SCENE_W, 1, '#3b2418');
  rect(ctx, 0, 0, SCENE_W, 1, '#8a5433');
  for (const x of [0, 40, 92, 137]) {
    rect(ctx, x, 6, 4, 50, '#5e3622');
    rect(ctx, x, 6, 1, 50, '#8a5433');
    rect(ctx, x + 3, 6, 1, 50, '#3b2418');
  }
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number): void {
  rect(ctx, x + 2, 6, 1, 5, '#454c58');
  rect(ctx, x, 11, 5, 1, '#454c58');
  rect(ctx, x, 12, 5, 5, '#f7d05a');
  rect(ctx, x + 1, 13, 3, 3, '#fff6e0');
  rect(ctx, x, 17, 5, 1, '#454c58');
  rect(ctx, x - 1, 12, 1, 5, '#454c58');
  rect(ctx, x + 5, 12, 1, 5, '#454c58');
}

function drawCounter(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, COUNTER_Y, SCENE_W, 7, '#c28e5c');
  rect(ctx, 0, COUNTER_Y, SCENE_W, 1, '#e8bd84');
  for (let x = 3; x < SCENE_W; x += 7) {
    if (hash(x, 3) > 0.4) rect(ctx, x, COUNTER_Y + 2 + Math.floor(hash(x, 9) * 3), 4, 1, '#b07a4a');
  }
  rect(ctx, 0, COUNTER_Y + 7, SCENE_W, 2, '#5e3622');
  rect(ctx, 0, COUNTER_Y + 9, SCENE_W, SCENE_H - COUNTER_Y - 9, '#8a5433');
  rect(ctx, 0, COUNTER_Y + 9, SCENE_W, 2, '#6e4128');
  for (let x = 0; x < SCENE_W; x += 20) {
    rect(ctx, x, COUNTER_Y + 9, 1, SCENE_H, '#5e3622');
    rect(ctx, x + 1, COUNTER_Y + 11, 1, SCENE_H, '#a06a40');
  }
  for (let x = 4; x < SCENE_W; x += 5) {
    if (hash(x, 21) > 0.6) rect(ctx, x, COUNTER_Y + 13 + Math.floor(hash(x, 5) * 12), 1, 3, '#6e4128');
  }
  rect(ctx, 0, SCENE_H - 2, SCENE_W, 2, '#3b2418');
  // The house emblem on the front of the counter.
  rect(ctx, 69, COUNTER_Y + 10, 22, 19, '#5e3622');
  rect(ctx, 70, COUNTER_Y + 11, 20, 17, '#6e4128');
  drawSprite(ctx, ITEM_ART.turnip!, 72, COUNTER_Y + 11);
}

function backdrop(light: Daylight): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d')!;
  drawWall(ctx);
  drawWindow(ctx, light);
  drawShelf(ctx);
  drawFireplace(ctx);
  drawDoor(ctx);
  drawLantern(ctx, 88);
  return canvas;
}

function counterLayer(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  drawCounter(canvas.getContext('2d')!);
  return canvas;
}

function ease(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) * (1 - clamped);
}

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backdrops = new Map<Daylight, HTMLCanvasElement>();
  private readonly counter = counterLayer();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SCENE_W;
    this.canvas.height = SCENE_H;
    this.canvas.className = 'scene-canvas';
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Horizontal centre of a seat, in scene pixels. */
  static seatX(seat: number, seats: number): number {
    return Math.round((SCENE_W * (seat + 0.5)) / seats);
  }

  private drawFire(time: number, light: Daylight): void {
    const ctx = this.ctx;
    const x0 = 107;
    const base = COUNTER_Y - 2;
    rect(ctx, x0 + 1, base - 2, 20, 3, '#5e3622');
    rect(ctx, x0 + 3, base - 4, 16, 2, '#8a5433');
    for (let i = 0; i < 20; i++) {
      const centre = 1 - Math.abs(i - 9.5) / 10;
      const flicker =
        Math.sin(time * 7 + i * 1.3) * 2 + Math.sin(time * 11.3 + i * 0.7) * 1.5 + Math.sin(time * 3.1 + i * 2.9);
      const height = Math.max(1, Math.round(centre * 16 + flicker * centre));
      rect(ctx, x0 + 1 + i, base - 3 - height, 1, height, '#e98537');
      const inner = Math.round(height * 0.62);
      if (inner > 0) rect(ctx, x0 + 1 + i, base - 3 - inner, 1, inner, '#f7d05a');
      const core = Math.round(height * 0.28);
      if (core > 0 && centre > 0.5) rect(ctx, x0 + 1 + i, base - 3 - core, 1, core, '#fff6e0');
    }
    // Sparks.
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.6 + i * 0.37) % 1;
      const sx = x0 + 5 + Math.round(hash(i, Math.floor(time * 0.6 + i * 0.37)) * 12);
      rect(ctx, sx, base - 18 - Math.round(phase * 14), 1, 1, phase < 0.6 ? '#f7d05a' : '#e98537');
    }
    if (light === 'evening') {
      ctx.globalAlpha = 0.07 + 0.02 * Math.sin(time * 9);
      rect(ctx, 86, 30, 62, COUNTER_Y - 30, '#e98537');
      ctx.globalAlpha = 1;
    }
  }

  private drawBubble(view: SeatView, cx: number, time: number): void {
    const ctx = this.ctx;
    const count = view.icons.length;
    const cols = count === 1 ? 1 : 2;
    const rows = count > 2 ? 2 : 1;
    const w = cols * 17 + 3;
    const h = rows * 17 + (view.patience >= 0 ? 7 : 3);
    const bob = view.patience >= 0 && view.patience < 0.25 ? Math.round(Math.sin(time * 18)) : 0;
    const x = Math.max(1, Math.min(SCENE_W - w - 1, cx - Math.floor(w / 2))) + bob;
    const y = 43 - h;
    rect(ctx, x + 1, y, w - 2, h, '#1f1420');
    rect(ctx, x, y + 1, w, h - 2, '#1f1420');
    rect(ctx, x + 1, y + 1, w - 2, h - 2, '#fff6e0');
    rect(ctx, x + 1, y + h - 3, w - 2, 2, '#e6d7b8');
    // Tail.
    rect(ctx, cx - 2, y + h, 5, 1, '#1f1420');
    rect(ctx, cx - 1, y + h - 1, 3, 1, '#fff6e0');
    rect(ctx, cx - 1, y + h + 1, 3, 1, '#1f1420');
    rect(ctx, cx - 1, y + h, 3, 1, '#fff6e0');
    rect(ctx, cx, y + h + 1, 1, 1, '#fff6e0');
    rect(ctx, cx, y + h + 2, 1, 1, '#1f1420');
    for (const [index, icon] of view.icons.entries()) {
      const art = ITEM_ART[icon];
      if (!art) continue;
      const col = index % cols;
      const row = Math.floor(index / cols);
      // A lone third icon sits centred on the second row.
      const centred = count === 3 && index === 2 ? 8 : 0;
      drawSprite(ctx, art, x + 2 + col * 17 + centred, y + 2 + row * 17);
    }
    if (view.patience >= 0) {
      const barW = w - 6;
      const filled = Math.max(0, Math.round(barW * view.patience));
      rect(ctx, x + 2, y + h - 6, w - 4, 4, '#1f1420');
      rect(ctx, x + 3, y + h - 5, barW, 2, '#3b2a3a');
      const colour = view.patience > 0.55 ? '#7fc04a' : view.patience > 0.25 ? '#f7d05a' : '#d04648';
      rect(ctx, x + 3, y + h - 5, filled, 2, colour);
    }
  }

  draw(time: number, light: Daylight, seats: (SeatView | null)[]): void {
    const ctx = this.ctx;
    let back = this.backdrops.get(light);
    if (!back) {
      back = backdrop(light);
      this.backdrops.set(light, back);
    }
    ctx.drawImage(back, 0, 0);
    this.drawFire(time, light);
    // Lantern glow flicker.
    ctx.globalAlpha = 0.1 + 0.03 * Math.sin(time * 5);
    rect(ctx, 84, 9, 13, 12, '#f7d05a');
    ctx.globalAlpha = 1;

    const count = seats.length;
    for (const [index, view] of seats.entries()) {
      if (!view) continue;
      const cx = Scene.seatX(index, count);
      let dx = Math.round((1 - ease(view.age / 0.45)) * 46);
      let dy = Math.round(Math.sin(time * 2.2 + view.key * 1.7) * 0.8);
      if (view.mood === 'happy') {
        dy -= Math.round(Math.abs(Math.sin((1.4 - view.leaveIn) * 9)) * 3 * Math.max(0, view.leaveIn - 0.5));
        if (view.leaveIn < 0.45) dx = -Math.round((1 - view.leaveIn / 0.45) * 60);
      } else if (view.mood === 'angry') {
        dx += Math.round(Math.sin(time * 40) * 1);
        if (view.leaveIn < 0.45) dx = Math.round((1 - view.leaveIn / 0.45) * 60);
      }
      const blink = (time * 0.9 + view.key * 0.618) % 3.2 < 0.12;
      drawCharacter(ctx, view.look, cx - CHAR_W / 2 + dx, CHAR_Y + dy, blink);
      if (view.mood === 'happy' && view.leaveIn > 0.3) drawSprite(ctx, HEART, cx + 7 + dx, CHAR_Y - 2 + dy);
      if (view.mood === 'angry') drawSprite(ctx, ANGER, cx + 7 + dx, CHAR_Y + 1 + dy);
    }

    if (light === 'evening') {
      ctx.globalAlpha = 0.28;
      rect(ctx, 0, 0, SCENE_W, SCENE_H, '#1a1040');
      ctx.globalAlpha = 1;
    } else if (light === 'morning') {
      ctx.globalAlpha = 0.07;
      rect(ctx, 0, 0, SCENE_W, SCENE_H, '#f7d05a');
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(this.counter, 0, 0);
    if (light === 'evening') {
      ctx.globalAlpha = 0.22;
      rect(ctx, 0, COUNTER_Y, SCENE_W, SCENE_H - COUNTER_Y, '#1a1040');
      ctx.globalAlpha = 1;
    }

    for (const [index, view] of seats.entries()) {
      if (!view) continue;
      const cx = Scene.seatX(index, count);
      if (view.dish && view.mood === 'happy' && view.leaveIn > 0.45) {
        const art = DISH_ART[view.dish.art];
        if (art) drawSprite(ctx, art, cx - 8, COUNTER_Y - 10, view.dish.swaps);
      }
      if (view.icons.length > 0 && view.mood === 'waiting' && view.age > 0.4) this.drawBubble(view, cx, time);
    }
  }
}
