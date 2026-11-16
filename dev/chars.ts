import { drawCharacter, lookFromSeed, type CharacterClass } from '../src/art/characters';

const classes: CharacterClass[] = ['warrior', 'mage', 'rogue', 'ranger', 'villager'];
const cols = 10;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = cols * 26;
canvas.height = classes.length * 36;
canvas.style.width = `${canvas.width * 4}px`;
const ctx = canvas.getContext('2d')!;
classes.forEach((cls, row) => {
  for (let i = 0; i < cols; i++) {
    drawCharacter(ctx, lookFromSeed(cls, (i + 1) * 2654435761 + row * 97), i * 26 + 1, row * 36 + 1);
  }
});
