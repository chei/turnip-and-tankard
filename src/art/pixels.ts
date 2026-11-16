/** One character per pixel. `.` is transparent; every other character is looked up in the palette. */
export const PALETTE: Record<string, string> = {
  k: '#1f1420',
  K: '#3b2a3a',
  w: '#fff6e0',
  W: '#d9cbb0',
  a: '#aab4bf',
  A: '#737d8a',
  z: '#454c58',
  r: '#d04648',
  R: '#8f2a3b',
  o: '#e98537',
  O: '#b85a22',
  y: '#f7d05a',
  Y: '#d69a2c',
  g: '#7fc04a',
  G: '#3f8a3a',
  d: '#255a3c',
  b: '#5fa8e8',
  B: '#3465b0',
  n: '#243a70',
  p: '#b06ad0',
  P: '#6e3a94',
  q: '#f29cb4',
  t: '#b97a4a',
  T: '#8a5433',
  u: '#5e3622',
  s: '#f2c59a',
  S: '#d69a6e',
  c: '#f0e2b8',
  C: '#dcc083',
  m: '#c9a0dc',
  M: '#9a6fb8',
  e: '#8ad6e0',
  E: '#4aa3b8',
};

export interface Sprite {
  w: number;
  h: number;
  rows: string[];
}

/** Colour overrides for one drawing: palette character → CSS colour (or another palette character). */
export type Swaps = Record<string, string>;

export function sprite(source: string): Sprite {
  const rows = source
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  const w = rows[0]?.length ?? 0;
  for (const [index, row] of rows.entries()) {
    if (row.length !== w) {
      throw new Error(`Sprite row ${index} is ${row.length} wide, expected ${w}: "${row}"`);
    }
  }
  return { w, h: rows.length, rows };
}

function colourOf(char: string, swaps?: Swaps): string | undefined {
  const swapped = swaps?.[char];
  if (swapped !== undefined) return swapped.length === 1 ? PALETTE[swapped] : swapped;
  return PALETTE[char];
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  art: Sprite,
  x: number,
  y: number,
  swaps?: Swaps,
  flip = false,
): void {
  for (let row = 0; row < art.h; row++) {
    const line = art.rows[row]!;
    for (let col = 0; col < art.w; col++) {
      const char = line[col]!;
      if (char === '.') continue;
      const colour = colourOf(char, swaps);
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x + (flip ? art.w - 1 - col : col), y + row, 1, 1);
    }
  }
}

export function spriteCanvas(art: Sprite, swaps?: Swaps, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = art.w * scale;
  canvas.height = art.h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  drawSprite(ctx, art, 0, 0, swaps);
  return canvas;
}

const urlCache = new Map<string, string>();

/** A data URL for use in `<img>`; cached per key. */
export function spriteUrl(key: string, make: () => HTMLCanvasElement): string {
  let url = urlCache.get(key);
  if (!url) {
    url = make().toDataURL();
    urlCache.set(key, url);
  }
  return url;
}
