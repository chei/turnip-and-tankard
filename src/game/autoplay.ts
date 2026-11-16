import { RECIPES } from './data';
import type { GameState } from './game';
import { addToPan, cook, serve, startService, tick, type Service } from './service';

/**
 * Plays one service the way a competent player would: cook whatever is ordered, serve it.
 * Used by the tests and by the development hook that fast-forwards through days.
 */
export function playService(state: GameState): Service {
  const service = startService(state);
  for (let step = 0; step < 20000 && !service.done; step++) {
    tick(state, service, 0.1);
    if (service.plate) {
      if (!serve(state, service)) service.plate = null;
    } else if (!service.cooking) {
      const waiting = service.seats.find((customer) => customer?.mood === 'waiting');
      if (waiting?.order) {
        const ok = RECIPES[waiting.order].ingredients.every((item) => addToPan(state, service, item));
        if (ok) cook(state, service);
        else while (service.pan.length) state.stock[service.pan.pop()!] += 1;
      }
    }
  }
  return service;
}
