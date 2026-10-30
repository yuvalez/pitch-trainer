import * as Tone from 'tone';
import type { Playback } from '../theory/music';

type Instrument = Tone.Sampler | Tone.PolySynth;

const SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/';
const SAMPLE_URLS: Record<string, string> = {};
for (let octave = 1; octave <= 7; octave++) {
  SAMPLE_URLS[`A${octave}`] = `A${octave}.mp3`;
  SAMPLE_URLS[`C${octave}`] = `C${octave}.mp3`;
  SAMPLE_URLS[`D#${octave}`] = `Ds${octave}.mp3`;
  SAMPLE_URLS[`F#${octave}`] = `Fs${octave}.mp3`;
}

let sampler: Tone.Sampler | null = null;
let samplerReady = false;
let synth: Tone.PolySynth | null = null;
let preferred: 'piano' | 'synth' = 'piano';
let playToken = 0;
const readyListeners = new Set<() => void>();

function init(): void {
  if (synth) return;
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.35, release: 0.8 },
  }).toDestination();
  synth.volume.value = -10;

  // Real piano samples; until they load (or if they fail) the synth plays instead.
  sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: SAMPLE_BASE,
    release: 1,
    onload: () => {
      samplerReady = true;
      readyListeners.forEach((l) => l());
    },
    onerror: () => {
      sampler = null;
    },
  }).toDestination();
  sampler.volume.value = -4;
}

function instrument(): Instrument {
  init();
  return preferred === 'piano' && sampler && samplerReady ? sampler : synth!;
}

const toFreq = (midi: number) => Tone.Frequency(midi, 'midi').toFrequency();

/** Browsers only allow audio after a user gesture. Call from a click handler. */
export async function ensureAudio(): Promise<void> {
  if (Tone.getContext().state !== 'running') await Tone.start();
  init();
}

export function setInstrument(i: 'piano' | 'synth'): void {
  preferred = i;
}

export function isPianoReady(): boolean {
  return samplerReady;
}

export function onPianoReady(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

/** Play one note immediately, without interrupting a playback in progress. */
export function playNote(midi: number, seconds = 0.9): void {
  void ensureAudio().then(() => {
    instrument().triggerAttackRelease(toFreq(midi), seconds, Tone.now());
  });
}

export function stop(): void {
  playToken++;
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  sampler?.releaseAll();
  synth?.releaseAll();
}

/** Play a sequence of events. Resolves when it ends or when another playback replaces it. */
export async function play(pb: Playback, bpm: number): Promise<void> {
  await ensureAudio();
  stop();
  const token = playToken;
  const secPerBeat = 60 / bpm;
  const transport = Tone.getTransport();
  let end = 0;
  for (const e of pb) {
    const start = e.start * secPerBeat;
    const dur = e.dur * secPerBeat;
    end = Math.max(end, start + dur);
    transport.schedule((time) => {
      instrument().triggerAttackRelease(e.midi.map(toFreq), dur * 0.95, time);
    }, start);
  }
  transport.start('+0.05');
  await new Promise((resolve) => setTimeout(resolve, (end + 0.15) * 1000));
  if (token === playToken) {
    transport.stop();
    transport.cancel(0);
  }
}
