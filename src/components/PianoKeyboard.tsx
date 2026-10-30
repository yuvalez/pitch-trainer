import { useEffect, useRef, useState } from 'react';
import { playNote } from '../audio/player';
import { noteLabel } from '../i18n/notes';
import { useT } from '../i18n/useT';
import { pcName } from '../theory/music';

export type KeyMark = 'selected' | 'correct' | 'wrong' | 'answer';

interface Props {
  lo: number;
  hi: number;
  onNote?: (midi: number) => void;
  marks?: Record<number, KeyMark>;
  showNames?: boolean;
  /** Map the computer keyboard (A W S E D F T G Y H U J K O L P ;) onto the piano. */
  computerKeys?: boolean;
}

const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = (m: number) => BLACK.has(((m % 12) + 12) % 12);
// Physical key codes (layout-independent, so they also work with a Hebrew keyboard): A W S E D F T G Y H U J K O L P ;
const KEYMAP = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon'];

export function PianoKeyboard({ lo, hi, onNote, marks = {}, showNames = true, computerKeys = true }: Props) {
  const t = useT();
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [octave, setOctave] = useState(0);
  const timers = useRef<number[]>([]);
  const handlerRef = useRef<(m: number) => void>(() => {});

  const press = (m: number) => {
    playNote(m);
    onNote?.(m);
    setPressed((p) => new Set(p).add(m));
    timers.current.push(
      window.setTimeout(() => {
        setPressed((p) => {
          const n = new Set(p);
          n.delete(m);
          return n;
        });
      }, 220),
    );
  };
  handlerRef.current = press;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const octaves = Math.floor((hi - lo) / 12);
  useEffect(() => {
    if (!computerKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.code === 'KeyZ') return setOctave((o) => Math.max(0, o - 1));
      if (e.code === 'KeyX') return setOctave((o) => Math.min(Math.max(0, octaves - 1), o + 1));
      const idx = KEYMAP.indexOf(e.code);
      if (idx < 0) return;
      const m = lo + octave * 12 + idx;
      if (m <= hi) {
        e.preventDefault();
        handlerRef.current(m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [computerKeys, lo, hi, octave, octaves]);

  const notes: number[] = [];
  for (let m = lo; m <= hi; m++) notes.push(m);
  const whites = notes.filter((m) => !isBlack(m));
  const ww = 100 / whites.length;
  const kbStart = lo + octave * 12;

  const cls = (m: number) =>
    ['key', isBlack(m) ? 'black' : 'white', marks[m] ?? '', pressed.has(m) ? 'pressed' : '', m >= kbStart && m < kbStart + 17 && computerKeys ? 'kb' : '']
      .filter(Boolean)
      .join(' ');

  return (
    <div className="piano-wrap" dir="ltr">
      <div className="piano" role="group" aria-label={t('piano.aria')} style={{ minWidth: `${whites.length * 34}px` }}>
        {whites.map((m) => (
          <button
            key={m}
            className={cls(m)}
            style={{ width: `${ww}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              press(m);
            }}
            aria-label={noteLabel(pcName(m))}
          >
            {showNames && (
              <span className="key-name">
                {noteLabel(pcName(m))}
                {m % 12 === 0 ? <sub>{Math.floor(m / 12) - 1}</sub> : ''}
              </span>
            )}
          </button>
        ))}
        {notes.filter(isBlack).map((m) => {
          const whitesBefore = whites.filter((w) => w < m).length;
          return (
            <button
              key={m}
              className={cls(m)}
              style={{ left: `${whitesBefore * ww - ww * 0.3}%`, width: `${ww * 0.6}%` }}
              onPointerDown={(e) => {
                e.preventDefault();
                press(m);
              }}
              aria-label={noteLabel(pcName(m, true))}
            />
          );
        })}
      </div>
      {computerKeys && (
        <p className="hint" dir="auto">
          {t('piano.hint')}
        </p>
      )}
    </div>
  );
}
