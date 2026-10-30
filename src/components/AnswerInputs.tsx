import { useEffect, useState } from 'react';
import { play } from '../audio/player';
import type {
  ChoiceQuestion,
  ChordNameQuestion,
  ChordNotesQuestion,
  DictationQuestion,
  KeyQuestion,
  SlotsQuestion,
  UserAnswer,
} from '../exercises/types';
import { noteLabel } from '../i18n/notes';
import { useT } from '../i18n/useT';
import { melodyPlayback, pc, pcName } from '../theory/music';
import { PianoKeyboard, type KeyMark } from './PianoKeyboard';

interface InputProps<Q> {
  q: Q;
  /** The answer the user gave, once answered (null if they gave up). */
  given: UserAnswer | null;
  answered: boolean;
  onSubmit: (a: UserAnswer) => void;
  showNames: boolean;
  tempo: number;
}

/** Number keys 1–9, 0 pick the matching button. */
function useNumberKeys(count: number, onPick: (i: number) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = e.key === '0' ? 10 : Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= count) {
        e.preventDefault();
        onPick(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onPick, enabled]);
}

export function ChoiceInput({ q, given, answered, onSubmit }: InputProps<ChoiceQuestion>) {
  const picked = given?.kind === 'choice' ? given.value : null;
  useNumberKeys(q.choices.length, (i) => onSubmit({ kind: 'choice', value: q.choices[i].value }), !answered);
  return (
    <div className="choices">
      {q.choices.map((c, i) => {
        const state = !answered ? '' : c.value === q.answer ? 'correct' : c.value === picked ? 'wrong' : 'dim';
        return (
          <button
            key={c.value}
            className={`choice ${state}`}
            disabled={answered}
            onClick={() => onSubmit({ kind: 'choice', value: c.value })}
          >
            <span className="shortcut">{i < 10 ? (i + 1) % 10 : ''}</span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export function SlotsInput({ q, given, answered, onSubmit }: InputProps<SlotsQuestion>) {
  const t = useT();
  const [slots, setSlots] = useState<(string | null)[]>(() => q.answer.map(() => null));
  const full = slots.every((s) => s !== null);
  const shown = answered && given?.kind === 'slots' ? given.values : slots;

  const fill = (v: string) =>
    setSlots((s) => {
      const i = s.indexOf(null);
      if (i < 0) return s;
      const n = [...s];
      n[i] = v;
      return n;
    });
  useNumberKeys(q.palette.length, (i) => fill(q.palette[i].value), !answered);

  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        setSlots((s) => {
          const filled = s.filter((x) => x !== null).length;
          if (!filled) return s;
          const n = [...s];
          n[filled - 1] = null;
          return n;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered]);

  return (
    <div>
      <div className="slots" dir="ltr">
        {q.answer.map((correct, i) => {
          const v = shown[i] ?? null;
          const state = !answered ? (v ? 'filled' : '') : v === correct ? 'correct' : 'wrong';
          return (
            <button
              key={i}
              className={`slot ${state}`}
              disabled={answered}
              onClick={() => setSlots((s) => s.map((x, j) => (j === i ? null : x)))}
              aria-label={t('input.slotAria', { n: i + 1, v: v ?? t('input.empty') })}
            >
              <span className="slot-value">{v ?? '?'}</span>
              {answered && v !== correct && <span className="slot-fix">{correct}</span>}
            </button>
          );
        })}
      </div>
      {!answered && (
        <>
          <div className="choices palette">
            {q.palette.map((p, i) => (
              <button key={p.value} className="choice" onClick={() => fill(p.value)} disabled={full}>
                <span className="shortcut">{i < 10 ? (i + 1) % 10 : ''}</span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn primary" disabled={!full} onClick={() => onSubmit({ kind: 'slots', values: slots as string[] })}>
              {t('input.check')}
            </button>
            <span className="hint">{t('input.slotsHint')}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** "F# / Gb" for black keys, "E" for white keys. */
const enharmonic = (m: number) => {
  const [sharp, flat] = [noteLabel(pcName(m, true)), noteLabel(pcName(m))];
  return sharp === flat ? sharp : `${sharp} / ${flat}`;
};

export function KeyInput({ q, given, answered, onSubmit, showNames }: InputProps<KeyQuestion>) {
  const t = useT();
  const [tonic, setTonic] = useState<number | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const ready = mode !== null && (!q.askTonic || tonic !== null);

  const submit = (m: string | null = mode, t: number | null = tonic) => {
    if (m === null) return;
    onSubmit({ kind: 'key', tonicPc: q.askTonic && t !== null ? pc(t) : null, mode: m });
  };

  useNumberKeys(
    q.modes.length,
    (i) => (q.askTonic ? setMode(q.modes[i].value) : submit(q.modes[i].value)),
    !answered,
  );

  const marks: Record<number, KeyMark> = {};
  const [lo, hi] = q.pianoRange;
  for (let m = lo; m <= hi; m++) {
    if (answered && pc(m) === q.answer.tonicPc) marks[m] = 'answer';
    else if (tonic !== null && pc(m) === pc(tonic)) marks[m] = answered ? 'wrong' : 'selected';
  }
  const givenMode = given?.kind === 'key' ? given.mode : null;

  return (
    <div>
      {q.askTonic && (
        <>
          <p className="hint">
            {t('input.tonicHint')} <strong>{tonic === null ? t('input.noneYet') : enharmonic(tonic)}</strong>
          </p>
          <PianoKeyboard
            lo={lo}
            hi={hi}
            marks={marks}
            showNames={showNames}
            onNote={(m) => !answered && setTonic(m)}
          />
        </>
      )}
      <div className="choices">
        {q.modes.map((m, i) => {
          const state = answered
            ? m.value === q.answer.mode
              ? 'correct'
              : m.value === givenMode
                ? 'wrong'
                : 'dim'
            : m.value === mode
              ? 'selected'
              : '';
          return (
            <button
              key={m.value}
              className={`choice ${state}`}
              disabled={answered}
              onClick={() => (q.askTonic ? setMode(m.value) : submit(m.value))}
            >
              <span className="shortcut">{i < 10 ? (i + 1) % 10 : ''}</span>
              {m.label}
            </button>
          );
        })}
      </div>
      {q.askTonic && !answered && (
        <div className="row">
          <button className="btn primary" disabled={!ready} onClick={() => submit()}>
            {t('input.check')}
          </button>
        </div>
      )}
    </div>
  );
}

export function DictationInput({ q, given, answered, onSubmit, showNames, tempo }: InputProps<DictationQuestion>) {
  const t = useT();
  const [notes, setNotes] = useState<number[]>(() => q.answer.slice(0, q.given));
  const full = notes.length === q.answer.length;
  const shown = answered && given?.kind === 'dictation' ? given.notes : notes;

  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') setNotes((n) => (n.length > q.given ? n.slice(0, -1) : n));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, q.given]);

  const marks: Record<number, KeyMark> = {};
  if (answered) q.answer.forEach((n) => (marks[n] = 'answer'));
  else if (notes.length) marks[notes[notes.length - 1]] = 'selected';

  return (
    <div>
      <div className="note-slots" dir="ltr">
        {q.answer.map((correct, i) => {
          const v = shown[i];
          const state = !answered ? (i < q.given ? 'given' : v !== undefined ? 'filled' : '') : v === correct ? 'correct' : 'wrong';
          return (
            <div key={i} className={`note-slot ${state}`}>
              <span>{v === undefined ? '·' : noteLabel(pcName(v, q.sharps))}</span>
              {answered && v !== correct && <span className="slot-fix">{noteLabel(pcName(correct, q.sharps))}</span>}
            </div>
          );
        })}
      </div>
      <PianoKeyboard
        lo={q.pianoRange[0]}
        hi={q.pianoRange[1]}
        marks={marks}
        showNames={showNames}
        onNote={(m) => !answered && setNotes((n) => (n.length < q.answer.length ? [...n, m] : n))}
      />
      <div className="row">
        {!answered ? (
          <>
            <button className="btn primary" disabled={!full} onClick={() => onSubmit({ kind: 'dictation', notes })}>
              {t('input.check')}
            </button>
            <button className="btn" disabled={notes.length <= q.given} onClick={() => setNotes((n) => n.slice(0, -1))}>
              {t('input.undo')}
            </button>
            <button className="btn" disabled={notes.length <= q.given} onClick={() => setNotes(q.answer.slice(0, q.given))}>
              {t('input.clear')}
            </button>
            <button className="btn" disabled={notes.length === 0} onClick={() => void play(melodyPlayback(notes), tempo)}>
              {t('input.hearMyNotes')}
            </button>
          </>
        ) : (
          given?.kind === 'dictation' && (
            <button className="btn" onClick={() => void play(melodyPlayback(given.notes), tempo)}>
              {t('input.hearMyAnswer')}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function ChordNameInput({ q, given, answered, onSubmit, showNames }: InputProps<ChordNameQuestion>) {
  const t = useT();
  const [root, setRoot] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const shownRoot = answered && given?.kind === 'chordName' ? given.rootPc : root;
  const shownType = answered && given?.kind === 'chordName' ? given.type : type;
  useNumberKeys(q.qualities.length, (i) => setType(q.qualities[i].value), !answered);

  const marks: Record<number, KeyMark> = {};
  for (let m = q.pianoRange[0]; m <= q.pianoRange[1]; m++) {
    if (answered && pc(m) === q.answer.rootPc) marks[m] = 'answer';
    else if (shownRoot !== null && pc(m) === pc(shownRoot)) marks[m] = answered ? 'wrong' : 'selected';
  }
  const state = (isAnswer: boolean, isPicked: boolean) =>
    answered ? (isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim') : isPicked ? 'selected' : '';

  return (
    <div>
      <p className="hint">{t('input.rootHint')}</p>
      <div className="choices roots">
        {q.rootChoices.map((r) => {
          const p = Number(r.value);
          return (
            <button
              key={r.value}
              className={`choice ${state(p === q.answer.rootPc, shownRoot !== null && pc(shownRoot) === p)}`}
              disabled={answered}
              onClick={() => setRoot(p)}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <PianoKeyboard
        lo={q.pianoRange[0]}
        hi={q.pianoRange[1]}
        marks={marks}
        showNames={showNames}
        computerKeys={false}
        onNote={(m) => !answered && setRoot(pc(m))}
      />
      <p className="hint">{t('input.quality')}</p>
      <div className="choices">
        {q.qualities.map((c, i) => (
          <button
            key={c.value}
            className={`choice ${state(c.value === q.answer.type, c.value === shownType)}`}
            disabled={answered}
            onClick={() => setType(c.value)}
          >
            <span className="shortcut">{i < 10 ? (i + 1) % 10 : ''}</span>
            {c.label}
          </button>
        ))}
      </div>
      {!answered && (
        <div className="row">
          <button
            className="btn primary"
            disabled={root === null || type === null}
            onClick={() => onSubmit({ kind: 'chordName', rootPc: root, type })}
          >
            {t('input.check')}
          </button>
        </div>
      )}
    </div>
  );
}

export function ChordNotesInput({ q, given, answered, onSubmit, showNames, tempo }: InputProps<ChordNotesQuestion>) {
  const t = useT();
  const [notes, setNotes] = useState<number[]>(() => [...q.given]);
  const shown = answered && given?.kind === 'chordNotes' ? given.notes : notes;
  const answerPcs = new Set(q.answer.map(pc));
  const sorted = [...shown].sort((a, b) => a - b);

  const toggle = (m: number) =>
    setNotes((n) => (n.includes(m) ? n.filter((x) => x !== m) : [...n, m]));

  const marks: Record<number, KeyMark> = {};
  if (answered) {
    q.answer.forEach((n) => (marks[n] = 'answer'));
    shown.forEach((n) => (marks[n] = answerPcs.has(pc(n)) ? 'correct' : 'wrong'));
  } else {
    notes.forEach((n) => (marks[n] = 'selected'));
  }

  return (
    <div>
      <div className="note-slots" dir="ltr">
        {sorted.length === 0 && <div className="note-slot">·</div>}
        {sorted.map((n) => (
          <div
            key={n}
            className={`note-slot ${answered ? (answerPcs.has(pc(n)) ? 'correct' : 'wrong') : q.given.includes(n) ? 'given' : 'filled'}`}
          >
            <span>{noteLabel(pcName(n, q.sharps))}</span>
          </div>
        ))}
      </div>
      <PianoKeyboard
        lo={q.pianoRange[0]}
        hi={q.pianoRange[1]}
        marks={marks}
        showNames={showNames}
        onNote={(m) => !answered && toggle(m)}
      />
      <div className="row">
        {!answered ? (
          <>
            <button className="btn primary" disabled={notes.length < 2} onClick={() => onSubmit({ kind: 'chordNotes', notes })}>
              {t('input.check')}
            </button>
            <button className="btn" disabled={notes.length === q.given.length} onClick={() => setNotes([...q.given])}>
              {t('input.clear')}
            </button>
            <button
              className="btn"
              disabled={notes.length === 0}
              onClick={() => void play([{ midi: sorted, start: 0, dur: 2 }], tempo)}
            >
              {t('input.hearMyChord')}
            </button>
            <span className="hint">{t('input.toggleHint')}</span>
          </>
        ) : (
          shown.length > 0 && (
            <button className="btn" onClick={() => void play([{ midi: sorted, start: 0, dur: 2 }], tempo)}>
              {t('input.hearMyAnswer')}
            </button>
          )
        )}
      </div>
    </div>
  );
}
