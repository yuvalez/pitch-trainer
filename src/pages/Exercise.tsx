import { useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { CustomChordPicker } from '../components/CustomChordPicker';
import { ModePicker } from '../components/ModePicker';
import { Session } from '../components/Session';
import {
  CUSTOM_CHORD_EXERCISES,
  EXERCISES,
  exerciseTitle,
  exerciseWhy,
  levelDescription,
  levelName,
} from '../exercises/levels';
import { LEVELS, type ExerciseId, type Level } from '../exercises/types';
import { TIME_ATTACK_SECONDS, type PlayMode } from '../game/rules';
import { useT } from '../i18n/useT';
import { isMastered, recentAccuracy, useProgress } from '../progress/store';

const PLAY_MODES: PlayMode[] = ['classic', 'timeAttack', 'survival'];

export function Exercise() {
  const { id } = useParams();
  // Keyed by id so per-exercise state resets when switching exercises.
  return <ExercisePage key={id} id={id} />;
}

function ExercisePage({ id }: { id: string | undefined }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const progress = useProgress();
  const meta = EXERCISES.find((e) => e.id === id);
  // Default to the highest unlocked level when the page opens. Pinned so an unlock mid-round doesn't restart it.
  const [defaultLevel] = useState<Level>(() => (meta ? progress.exercises[meta.id].unlocked : 0));
  if (!meta) return <Navigate to="/" replace />;

  const p = progress.exercises[meta.id as ExerciseId];
  const fromUrl = Number(params.get('level'));
  const level: Level = LEVELS.includes(fromUrl as Level) && params.has('level') ? (fromUrl as Level) : defaultLevel;
  const modeParam = params.get('mode') as PlayMode | null;
  const mode: PlayMode = modeParam && PLAY_MODES.includes(modeParam) ? modeParam : 'classic';
  // Dev-only shorter clock for testing Time Attack: ?clock=5
  const clock = import.meta.env.DEV ? Number(params.get('clock')) : 0;
  const seconds = clock > 0 ? clock : TIME_ATTACK_SECONDS;

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    setParams(next);
  };
  const setLevel = (l: Level) => update({ level: String(l) });
  const hasCustom = CUSTOM_CHORD_EXERCISES.includes(meta.id);
  const custom = hasCustom && params.get('level') === 'custom';
  const stars = progress.game.stars[meta.id] ?? {};

  return (
    <div className="exercise-page" style={{ '--c': meta.color } as CSSProperties}>
      <p>
        <Link to="/" className="muted back-link">
          {t('exercise.back')}
        </Link>
      </p>
      <header className="ex-header">
        <span className="ex-icon big" aria-hidden>
          {meta.icon}
        </span>
        <div>
          <h1>{exerciseTitle(meta.id)}</h1>
          <p className="muted">{exerciseWhy(meta.id)}</p>
        </div>
      </header>

      <div className={`levels ${hasCustom ? 'five' : ''}`} role="tablist" aria-label={t('exercise.difficulty')}>
        {LEVELS.map((l) => {
          const stats = p.levels[l];
          const acc = recentAccuracy(stats);
          const locked = l > p.unlocked;
          const active = !custom && l === level;
          return (
            <button
              key={l}
              role="tab"
              aria-selected={active}
              className={`level-tab ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => setLevel(l)}
              title={locked ? t('exercise.lockedHint') : undefined}
            >
              <span className="level-name">
                {locked ? '🔒 ' : isMastered(stats) ? '✓ ' : ''}
                {levelName(l)}
              </span>
              <span className="level-meta">
                <span className="tab-stars" dir="ltr">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={n <= (stars[l] ?? 0) ? 'on' : ''}>
                      ★
                    </span>
                  ))}
                </span>
                <span className="level-acc">{acc === null ? '—' : `${Math.round(acc * 100)}%`}</span>
              </span>
            </button>
          );
        })}
        {hasCustom && (
          <button
            role="tab"
            aria-selected={custom}
            className={`level-tab ${custom ? 'active' : ''}`}
            onClick={() => update({ level: 'custom' })}
          >
            <span className="level-name">{t('exercise.custom')}</span>
            <span className="level-acc">{t('exercise.customSub')}</span>
          </button>
        )}
      </div>

      {custom ? (
        <>
          <CustomChordPicker />
          <Session
            key={`${meta.id}-custom`}
            id={meta.id}
            level={1}
            mode="classic"
            seconds={seconds}
            onLevelChange={setLevel}
            custom
          />
        </>
      ) : (
        <>
          <p className="level-desc">{levelDescription(meta.id, level)}</p>
          <ModePicker id={meta.id} mode={mode} seconds={seconds} onChange={(m) => update({ mode: m })} />
          <Session
            key={`${meta.id}-${level}-${mode}`}
            id={meta.id}
            level={level}
            mode={mode}
            seconds={seconds}
            onLevelChange={setLevel}
          />
        </>
      )}
    </div>
  );
}
