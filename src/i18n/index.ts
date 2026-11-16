import { de } from './de';
import { en } from './en';
import { hu } from './hu';
import type { Messages } from './types';

export const LANGUAGES = ['hu', 'en', 'de'] as const;
export type Language = (typeof LANGUAGES)[number];

export const GAME_NAME = 'Turnip & Tankard';

export const LANGUAGE_NAMES: Record<Language, string> = { hu: 'Magyar', en: 'English', de: 'Deutsch' };

export const MESSAGES: Record<Language, Messages> = { hu, en, de };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** The first of the browser's preferred languages that the game speaks; English otherwise. */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0];
    if (isLanguage(code)) return code;
  }
  return 'en';
}

export type { Messages };
