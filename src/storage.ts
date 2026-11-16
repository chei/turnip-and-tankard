import { SAVE_VERSION, type GameState } from './game/game';
import { detectLanguage, isLanguage, type Language } from './i18n';

const SAVE_KEY = 'turnip-tankard-save';
const SETTINGS_KEY = 'turnip-tankard-settings';

export interface Settings {
  language: Language;
  sound: boolean;
  music: boolean;
}

/** Storage can be unavailable (private windows, blocked site data); the game then simply forgets. */
function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do: the game still runs, it just will not be remembered.
  }
}

export function loadSettings(): Settings {
  const stored = read(SETTINGS_KEY) as Partial<Settings> | null;
  return {
    language: isLanguage(stored?.language) ? stored.language : detectLanguage(navigator.languages ?? [navigator.language]),
    sound: stored?.sound !== false,
    music: stored?.music !== false,
  };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function loadGame(): GameState | null {
  const stored = read(SAVE_KEY) as GameState | null;
  if (!stored || stored.version !== SAVE_VERSION || !Array.isArray(stored.adventurers)) return null;
  return stored;
}

export function saveGame(state: GameState): void {
  write(SAVE_KEY, state);
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // See `write`.
  }
}
