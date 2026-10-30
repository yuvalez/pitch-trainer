import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { levelName } from '../exercises/levels';
import type { ExerciseId, Level } from '../exercises/types';
import { CLASSIC_HEARTS, CLASSIC_LENGTH, SURVIVAL_HEARTS, type PlayMode } from '../game/rules';
import { useT } from '../i18n/useT';
import { useProgress } from '../progress/store';
import { ChoiceInput, ChordNameInput, ChordNotesInput, DictationInput, KeyInput, SlotsInput } from './AnswerInputs';
import { RoundEnd } from './session/RoundEnd';
import { RoundHud } from './session/RoundHud';
import { useRound } from './session/useRound';

interface Props {
  id: ExerciseId;
  level: Level;
  mode: PlayMode;
  onLevelChange: (l: Level) => void;
  /** Custom chord practice: uses the saved chord selection and doesn't affect level progress. */
  custom?: boolean;
  /** Time Attack length in seconds. */
  seconds: number;
}

const MODE_ICONS: Record<PlayMode, string> = { classic: '⭐', timeAttack: '⏱️', survival: '❤️' };

export function Session({ id, level, mode, onLevelChange, custom = false, seconds }: Props) {
  const t = useT();
  const { settings } = useProgress();
  const round = useRound({ id, level, mode, custom, seconds });
  const { phase, q, qNum, result, stats, playing, playPart, finish, advance } = round;

  // Shortcuts: R replay, C hear key, Enter next. Physical key codes so they work on any layout.
  useEffect(() => {
    if (phase !== 'question' || !q) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyR') void playPart(q, 'main');
      else if (e.code === 'KeyC' && q.context) void playPart(q, 'context');
      else if (e.key === 'Enter' && result) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, q, result, playPart, advance]);

  if (phase === 'intro') {
    const lv = levelName(level);
    const intro = custom
      ? t('session.intro.custom', { n: CLASSIC_LENGTH })
      : mode === 'classic'
        ? t('session.intro.classic', { n: CLASSIC_LENGTH, level: lv, hearts: CLASSIC_HEARTS })
        : mode === 'timeAttack'
          ? t('session.intro.timeAttack', { s: seconds, level: lv })
          : t('session.intro.survival', { level: lv, hearts: SURVIVAL_HEARTS });
    return (
      <div className="card session-intro">
        <div className="intro-icon" aria-hidden>
          {custom ? '🎯' : MODE_ICONS[mode]}
        </div>
        <p className="intro-text">
          {intro} {t('session.headphones')}
        </p>
        <button className="btn primary big start-btn" onClick={() => void round.start()}>
          {t('session.start')}
        </button>
        <p className="hint">{t('session.shortcuts')}</p>
      </div>
    );
  }

  if (phase === 'done' && round.summary) {
    return (
      <RoundEnd
        summary={round.summary}
        mode={mode}
        custom={custom}
        level={level}
        onAgain={() => void round.start()}
        onLevelChange={onLevelChange}
      />
    );
  }

  if (!q) return null;
  const answered = result !== null;
  const inputProps = {
    given: result?.given ?? null,
    answered,
    onSubmit: finish,
    showNames: settings.showNoteNames,
    tempo: settings.tempo,
  };
  const singleNoteContext = q.kind === 'chordName' && q.context?.length === 1;
  const last = round.outOfHearts || (round.length !== null && qNum >= round.length);

  return (
    <div className="card session">
      <RoundHud
        stats={stats}
        qNum={qNum}
        answered={answered}
        length={round.length}
        maxHearts={round.maxHearts}
        heartsLeft={round.heartsLeft}
        timeLeft={mode === 'timeAttack' && !custom ? round.timeLeft : undefined}
        totalTime={seconds * 1000}
      />

      <p className="prompt">{q.prompt}</p>
      <div className="row">
        <button className={`btn ${playing ? 'playing' : ''}`} onClick={() => void playPart(q, 'main')}>
          {playing ? t('session.playing') : t('session.replay')}
        </button>
        {q.context && (
          <button className="btn" onClick={() => void playPart(q, 'context')}>
            {singleNoteContext && q.reference ? q.reference.label : t('session.hearKey')}
          </button>
        )}
        {q.reference && !singleNoteContext && (
          <button className="btn" onClick={() => void playPart(q, q.reference!.playback)}>
            {q.reference.label}
          </button>
        )}
        {q.kind === 'choice' && q.highlight && (
          <button className="btn" onClick={() => void playPart(q, q.highlight!.alone)}>
            {t('session.hearAlone', { n: q.highlight.index + 1 })}
          </button>
        )}
        {!answered && (
          <button className="btn ghost" onClick={() => finish(null)}>
            {t('session.showAnswer')}
          </button>
        )}
      </div>

      {q.kind === 'choice' && q.highlight && (
        <div className="slots" dir="ltr" aria-label={t('session.progression')}>
          {Array.from({ length: q.highlight.count }, (_, i) => (
            <div key={i} className={`slot static ${i === q.highlight!.index ? 'target' : ''}`}>
              <span className="slot-value">{i === q.highlight!.index ? '?' : i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* key={qNum} resets each input's local state for every new question */}
      {q.kind === 'choice' && <ChoiceInput key={qNum} q={q} {...inputProps} />}
      {q.kind === 'slots' && <SlotsInput key={qNum} q={q} {...inputProps} />}
      {q.kind === 'key' && <KeyInput key={qNum} q={q} {...inputProps} />}
      {q.kind === 'dictation' && <DictationInput key={qNum} q={q} {...inputProps} />}
      {q.kind === 'chordName' && <ChordNameInput key={qNum} q={q} {...inputProps} />}
      {q.kind === 'chordNotes' && <ChordNotesInput key={qNum} q={q} {...inputProps} />}

      {result && (
        <div key={`feedback-${qNum}`} className={`feedback ${result.grade.correct ? 'ok pop' : 'bad shake'}`}>
          {result.xp > 0 && (
            <span className="xp-float" aria-hidden>
              +{result.xp} XP
            </span>
          )}
          <p className="feedback-title">
            {result.grade.correct ? t(`session.cheer.${(qNum % 4) as 0 | 1 | 2 | 3}`) : t('session.wrong')}
          </p>
          <p>{result.grade.detail}</p>
          {mode !== 'timeAttack' && <p className="muted">{q.explanation}</p>}
          <div className="row">
            <button className="btn primary" onClick={advance} autoFocus>
              {last ? t('session.results') : t('session.next')} ⏎
            </button>
            {!result.grade.correct && mode !== 'timeAttack' && (
              <button className="btn" onClick={() => void playPart(q, 'main')}>
                {t('session.hearAgain')}
              </button>
            )}
            {mode !== 'timeAttack' && (
              <Link className="btn ghost" to={`/learn#${q.learnTopic}`}>
                {t('session.learnMore')}
              </Link>
            )}
          </div>
        </div>
      )}

      {(mode !== 'classic' || custom) && (
        <div className="row end-row">
          <button className="btn ghost small-btn" onClick={() => round.endRound('quit')}>
            {t('session.quit')}
          </button>
        </div>
      )}
    </div>
  );
}
