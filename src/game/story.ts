import type { GameState } from './game';

/**
 * The story moves in beats. Each one is a short scene with a key character, shown on the
 * first morning its condition holds, and most of them unlock something.
 */
export const STORY_BEATS = [
  'intro',
  'pedlar',
  'materials',
  'workshop',
  'weaponsmith',
  'tailor',
  'armorer',
  'wizard',
  'finale',
] as const;

export type StoryBeat = (typeof STORY_BEATS)[number];

export type Speaker = 'rozi' | 'pedlar' | 'lili' | 'palko' | 'weaponsmith' | 'tailor' | 'armorer' | 'wizard';

/** Who speaks each line of a scene; the words themselves live in the translations. */
export const STORY_SPEAKERS: Record<StoryBeat, Speaker[]> = {
  intro: ['rozi', 'rozi', 'rozi', 'rozi'],
  pedlar: ['pedlar', 'pedlar', 'pedlar'],
  materials: ['pedlar', 'pedlar', 'pedlar'],
  workshop: ['lili', 'lili', 'palko', 'palko', 'lili'],
  weaponsmith: ['weaponsmith', 'weaponsmith', 'weaponsmith'],
  tailor: ['tailor', 'tailor', 'tailor'],
  armorer: ['armorer', 'armorer', 'armorer'],
  wizard: ['wizard', 'wizard', 'wizard'],
  finale: ['rozi', 'rozi', 'rozi'],
};

const LEVEL_NEEDED: Record<StoryBeat, number> = {
  intro: 1,
  pedlar: 2,
  materials: 3,
  workshop: 4,
  weaponsmith: 5,
  tailor: 6,
  armorer: 7,
  wizard: 8,
  finale: 10,
};

/** The next scene that is due, if any. Beats always play in order, at most one a morning. */
export function nextStoryBeat(state: GameState): StoryBeat | null {
  const beat = STORY_BEATS[state.story.length];
  if (!beat || state.level < LEVEL_NEEDED[beat]) return null;
  return beat;
}

export function storyLevel(beat: StoryBeat): number {
  return LEVEL_NEEDED[beat];
}

/** What a scene changes in the world, applied the morning it plays. */
export const STORY_EFFECTS: Partial<Record<StoryBeat, (state: GameState) => void>> = {
  pedlar: (state) => {
    // The pedlar's welcome gift: his grandmother's recipe and the bread for it.
    if (!state.recipes.includes('onionBread')) state.recipes.push('onionBread');
    state.stock.bread += 3;
  },
  materials: (state) => {
    state.stock.wood += 2;
    state.stock.cloth += 2;
    state.stock.leather += 1;
  },
  workshop: (state) => {
    if (!state.crafters.includes('apprentice')) {
      state.crafters.push('apprentice');
      state.stock.wood += 2;
    }
  },
};
