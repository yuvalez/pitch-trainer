import { ensureAudio, play, setInstrument } from '../../audio/player';
import { CHORD_TYPES, chordLabel, chordSound } from '../../exercises/chords';
import { INTERVALS, intervalLabel, intervalSong } from '../../exercises/intervals';
import { MODES, modeColor, modeLabel } from '../../exercises/keyId';
import { NUMERALS } from '../../exercises/progressions';
import type { TKey } from '../../i18n';
import { notesLabel } from '../../i18n/notes';
import { useT } from '../../i18n/useT';
import { getProgress } from '../../progress/store';
import {
  chordsPlayback,
  melodyPlayback,
  scaleNoteNames,
  triadOnDegree,
  voiceChords,
  type Playback,
} from '../../theory/music';

const C4 = 60;

export function PlayButton({ pb, label = '▶' }: { pb: Playback; label?: string }) {
  return (
    <button
      className="btn small-btn"
      onClick={async () => {
        await ensureAudio();
        const { settings } = getProgress();
        setInstrument(settings.instrument);
        await play(pb, settings.tempo);
      }}
    >
      {label}
    </button>
  );
}

const prog = (numerals: string[]) => chordsPlayback(voiceChords(0, numerals.map((n) => NUMERALS[n])), 1.5);

export function IntervalTable() {
  const t = useT();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('learn.th.interval')}</th>
            <th>{t('learn.th.semis')}</th>
            <th>{t('learn.th.song')}</th>
            <th>{t('learn.th.hear')}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(INTERVALS)
            .filter(([, i]) => i.semis <= 12)
            .map(([k, i]) => (
              <tr key={k}>
                <td>{intervalLabel(k)}</td>
                <td>{i.semis}</td>
                <td className="muted">{intervalSong(k)}</td>
                <td className="nowrap">
                  <PlayButton pb={melodyPlayback([C4, C4 + i.semis])} label={t('learn.up')} />{' '}
                  <PlayButton pb={melodyPlayback([C4 + i.semis, C4])} label={t('learn.down')} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChordSoundList() {
  return (
    <ul className="sound-list">
      {Object.entries(CHORD_TYPES).map(([type, c]) => (
        <li key={type}>
          <PlayButton pb={[{ midi: c.semis.map((s) => C4 + s), start: 0, dur: 2 }]} />
          <span>
            <strong>{chordLabel(type)}</strong> <span className="muted">— {chordSound(type)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function InversionExamples() {
  const t = useT();
  return (
    <div className="row wrap" dir="ltr">
      <PlayButton pb={[{ midi: [60, 64, 67], start: 0, dur: 2 }]} label={t('learn.inv.root')} />
      <PlayButton pb={[{ midi: [64, 67, 72], start: 0, dur: 2 }]} label={t('learn.inv.first')} />
      <PlayButton pb={[{ midi: [55, 60, 64], start: 0, dur: 2 }]} label={t('learn.inv.second')} />
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ModeList() {
  const t = useT();
  return (
    <ul className="sound-list">
      {Object.entries(MODES).map(([id, m]) => (
        <li key={id}>
          <PlayButton pb={melodyPlayback([...m.scale, 12].map((s) => C4 + s), 0.5)} label={t('learn.scale')} />
          <PlayButton
            pb={chordsPlayback(voiceChords(0, m.progressions[0].map((d) => triadOnDegree(m.scale, d))), 1.5)}
            label={t('learn.chords')}
          />
          <span>
            <strong>{modeLabel(id)}</strong>{' '}
            <span className="muted" dir="ltr">
              {notesLabel(scaleNoteNames('C', m.tonal).join(' '))}
            </span>
            <span className="block muted small">{capitalize(modeColor(id))}.</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

export function NumeralRows() {
  const t = useT();
  return (
    <>
      <p className="muted small">{t('learn.majorKey')}</p>
      <div className="row wrap" dir="ltr">
        {MAJOR_NUMERALS.map((n) => (
          <PlayButton key={n} pb={prog([n])} label={n} />
        ))}
      </div>
      <p className="muted small">{t('learn.minorKey')}</p>
      <div className="row wrap" dir="ltr">
        {MINOR_NUMERALS.map((n) => (
          <PlayButton key={n} pb={prog([n])} label={n} />
        ))}
      </div>
    </>
  );
}

const COMMON_PROGRESSIONS: { name: string; chords: string[]; note: TKey }[] = [
  { name: 'I – IV – V – I', chords: ['I', 'IV', 'V', 'I'], note: 'prog.1' },
  { name: 'I – V – vi – IV', chords: ['I', 'V', 'vi', 'IV'], note: 'prog.2' },
  { name: 'vi – IV – I – V', chords: ['vi', 'IV', 'I', 'V'], note: 'prog.3' },
  { name: 'ii – V – I', chords: ['ii', 'V', 'I', 'I'], note: 'prog.4' },
  { name: 'i – VI – III – VII', chords: ['i', 'VI', 'III', 'VII'], note: 'prog.5' },
  { name: 'I – ♭VII – IV – I', chords: ['I', '♭VII', 'IV', 'I'], note: 'prog.6' },
];

export function ProgressionList() {
  const t = useT();
  return (
    <ul className="sound-list">
      {COMMON_PROGRESSIONS.map((p) => (
        <li key={p.note}>
          <PlayButton pb={prog(p.chords)} />
          <span>
            <strong dir="ltr">{p.name}</strong>{' '}
            <span className="muted">— {t(p.note)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
