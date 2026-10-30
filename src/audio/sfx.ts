import * as Tone from 'tone';

export type Cue = 'correct' | 'wrong' | 'combo' | 'roundEnd' | 'achievement' | 'tick';

let synth: Tone.PolySynth | null = null;

function cueSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.25 },
    }).toDestination();
    synth.volume.value = -16;
  }
  return synth;
}

// [note, offset in seconds, length in seconds]
const CUES: Record<Cue, [string, number, number][]> = {
  correct: [
    ['E6', 0, 0.08],
    ['A6', 0.07, 0.14],
  ],
  wrong: [
    ['D4', 0, 0.12],
    ['A3', 0.1, 0.22],
  ],
  combo: [
    ['C6', 0, 0.07],
    ['E6', 0.06, 0.07],
    ['G6', 0.12, 0.07],
    ['C7', 0.18, 0.16],
  ],
  roundEnd: [
    ['G5', 0, 0.1],
    ['C6', 0.1, 0.1],
    ['E6', 0.2, 0.1],
    ['G6', 0.3, 0.3],
  ],
  achievement: [
    ['A5', 0, 0.08],
    ['C#6', 0.08, 0.08],
    ['E6', 0.16, 0.08],
    ['A6', 0.24, 0.35],
  ],
  tick: [['C7', 0, 0.03]],
};

/** Play a short game cue. Silent when disabled or before audio has been unlocked by a click. */
export function sfx(cue: Cue, enabled: boolean): void {
  if (!enabled || Tone.getContext().state !== 'running') return;
  const s = cueSynth();
  const now = Tone.now();
  for (const [note, at, len] of CUES[cue]) s.triggerAttackRelease(note, len, now + at);
}
