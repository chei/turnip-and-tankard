import { lookFromSeed } from '../src/art/characters';
import { Scene, type Daylight, type SeatView } from '../src/art/scene';

const root = document.getElementById('root')!;
const seat = (key: number, cls: any, icons: string[], patience: number, mood: any = 'waiting'): SeatView => ({
  key, look: lookFromSeed(cls, key * 7919 + 13), icons, patience, mood, age: 5, leaveIn: 1,
  dish: { art: 'roast', swaps: { X: 'm', x: 'M', L: 'w' } },
});
const setups: [Daylight, (SeatView | null)[]][] = [
  ['morning', [seat(1, 'warrior', [], -1, 'idle'), seat(2, 'mage', [], -1, 'idle')]],
  ['day', [seat(3, 'villager', ['turnip'], 0.9), seat(4, 'rogue', ['turnip', 'sausage'], 0.5), seat(5, 'ranger', ['mushroom', 'onion', 'herbs'], 0.2)]],
  ['day', [seat(6, 'villager', ['sausage', 'cheese', 'bread', 'turnip'], 0.7), seat(7, 'mage', ['ale'], 0.4, 'happy'), null, seat(9, 'warrior', ['meat', 'herbs'], 0.1, 'angry')]],
  ['evening', [seat(10, 'warrior', [], -1, 'idle'), null, seat(11, 'ranger', [], -1, 'idle')]],
];
for (const [light, seats] of setups) {
  const scene = new Scene();
  scene.canvas.style.cssText = 'width:640px;image-rendering:pixelated';
  root.append(scene.canvas);
  scene.draw(3.3, light, seats);
}
