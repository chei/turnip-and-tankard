/** All sound is synthesised with Web Audio: a few blips for the interface and a short lute tune. */

export type Sfx = 'tap' | 'pan' | 'cook' | 'ready' | 'coin' | 'fail' | 'level' | 'page' | 'buy' | 'discover' | 'bell';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let soundOn = true;
let musicOn = true;
let musicTimer: number | null = null;
let nextNoteTime = 0;
let step = 0;

function ensure(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);
  musicGain = context.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  return context;
}

/** Browsers only allow sound after a user gesture; call this from one. */
export function unlockAudio(): void {
  const ctx = ensure();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  if (musicOn) startMusic();
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  destination: AudioNode,
  slideTo?: number,
): void {
  const ctx = context!;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(start: number, duration: number, volume: number, cutoff: number): void {
  const ctx = context!;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(master!);
  source.start(start);
}

export function play(name: Sfx): void {
  if (!soundOn) return;
  const ctx = ensure();
  if (!ctx || !master || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const out = master;
  switch (name) {
    case 'tap':
      tone(520, t, 0.06, 'square', 0.08, out);
      break;
    case 'pan':
      tone(300, t, 0.07, 'triangle', 0.2, out, 420);
      break;
    case 'cook':
      noise(t, 0.9, 0.09, 3500);
      break;
    case 'ready':
      tone(880, t, 0.09, 'square', 0.09, out);
      tone(1175, t + 0.09, 0.14, 'square', 0.09, out);
      break;
    case 'coin':
      tone(1319, t, 0.07, 'square', 0.09, out);
      tone(1760, t + 0.07, 0.2, 'square', 0.09, out);
      break;
    case 'fail':
      tone(220, t, 0.16, 'sawtooth', 0.09, out, 150);
      tone(165, t + 0.16, 0.25, 'sawtooth', 0.09, out, 110);
      break;
    case 'level':
      [523, 659, 784, 1047, 1319].forEach((freq, i) => tone(freq, t + i * 0.09, 0.22, 'square', 0.09, out));
      break;
    case 'page':
      noise(t, 0.12, 0.05, 1800);
      break;
    case 'buy':
      tone(660, t, 0.06, 'square', 0.08, out);
      tone(990, t + 0.06, 0.1, 'square', 0.08, out);
      break;
    case 'discover':
      [659, 784, 988, 1319].forEach((freq, i) => tone(freq, t + i * 0.07, 0.25, 'triangle', 0.16, out));
      break;
    case 'bell':
      tone(1568, t, 0.5, 'sine', 0.14, out);
      tone(2093, t + 0.12, 0.6, 'sine', 0.1, out);
      break;
  }
}

// --- music: a plucked tune in D dorian over a drone, sixteen bars, looping ---

const NOTE: Record<string, number> = {
  D3: 146.83, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G3: 196, F3: 174.61, C3: 130.81,
};

// Eighth notes; '-' holds, '.' rests.
const MELODY = (
  'D4 . F4 G4 A4 - A4 G4 | F4 - E4 F4 D4 - . . | F4 . A4 C5 D5 - C5 A4 | G4 - A4 F4 E4 - . . |' +
  'D4 . F4 G4 A4 - C5 A4 | G4 F4 E4 F4 G4 - E4 . | F4 E4 D4 C4 D4 - F4 E4 | D4 - - - . . . . |' +
  'A4 . A4 C5 D5 - E5 D5 | C5 - A4 C5 G4 - . . | F4 . G4 A4 C5 - A4 G4 | A4 - - G4 E4 - . . |' +
  'D4 . F4 G4 A4 - D5 C5 | A4 G4 F4 G4 A4 - F4 . | E4 F4 G4 E4 D4 - C4 E4 | D4 - - - . . . . |'
)
  .replace(/\|/g, ' ')
  .trim()
  .split(/\s+/);

const BASS = ['D3', 'D3', 'F3', 'C3', 'D3', 'C3', 'G3', 'D3', 'D3', 'F3', 'F3', 'A3', 'D3', 'F3', 'C3', 'D3'];
const STEP_SECONDS = 0.21;

function pluck(freq: number, start: number, duration: number, volume: number): void {
  const ctx = context!;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2600, start);
  filter.frequency.exponentialRampToValueAtTime(500, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(filter).connect(gain).connect(musicGain!);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function schedule(): void {
  const ctx = context;
  if (!ctx || !musicGain) return;
  if (nextNoteTime < ctx.currentTime) nextNoteTime = ctx.currentTime + 0.05;
  while (nextNoteTime < ctx.currentTime + 0.4) {
    const index = step % MELODY.length;
    const note = MELODY[index]!;
    if (note !== '.' && note !== '-') {
      let held = 1;
      while (MELODY[(index + held) % MELODY.length] === '-' && held < 8) held++;
      pluck(NOTE[note] ?? 440, nextNoteTime, STEP_SECONDS * held + 0.25, 0.5);
    }
    if (index % 8 === 0) {
      const bass = NOTE[BASS[(index / 8) % BASS.length]!] ?? 146.83;
      pluck(bass, nextNoteTime, STEP_SECONDS * 7, 0.55);
      pluck(bass * 1.5, nextNoteTime + STEP_SECONDS * 4, STEP_SECONDS * 3, 0.3);
    }
    nextNoteTime += STEP_SECONDS;
    step += 1;
  }
}

export function startMusic(): void {
  const ctx = ensure();
  if (!ctx || musicTimer !== null) return;
  musicTimer = window.setInterval(schedule, 100);
}

export function stopMusic(): void {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
}

export function setSound(on: boolean): void {
  soundOn = on;
}

export function setMusic(on: boolean): void {
  musicOn = on;
  if (on) startMusic();
  else stopMusic();
}
