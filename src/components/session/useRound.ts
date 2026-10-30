import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAudio, play, setInstrument, stop } from '../../audio/player';
import { sfx } from '../../audio/sfx';
import { grade, type GradeResult } from '../../exercises/grade';
import { GENERATORS } from '../../exercises/index';
import type { ExerciseId, Level, Question, UserAnswer } from '../../exercises/types';
import type { Achievement } from '../../game/achievements';
import { commitProgress } from '../../game/commit';
import {
  CLASSIC_HEARTS,
  CLASSIC_LENGTH,
  SURVIVAL_HEARTS,
  rankFor,
  recordGameAnswer,
  recordRoundEnd,
  xpForAnswer,
  type PlayMode,
  type Stars,
} from '../../game/rules';
import { t } from '../../i18n';
import { chordWeights, getProgress, recordAnswer, recordItemOnly, useProgress } from '../../progress/store';
import { concatPlayback, type Playback } from '../../theory/music';

export type EndReason = 'complete' | 'hearts' | 'time' | 'quit';

export interface RoundStats {
  score: number;
  mistakes: number;
  combo: number;
  bestCombo: number;
  xp: number;
}

export interface RoundSummary extends RoundStats {
  reason: EndReason;
  answered: number;
  stars: Stars;
  bonusXp: number;
  newRecord: boolean;
  previousBest: number;
  unlocked: Level | null;
  /** New rank index if the round crossed a rank boundary. */
  rankUp: number | null;
  achievements: Achievement[];
}

export interface AnswerResult {
  grade: GradeResult;
  given: UserAnswer | null;
  xp: number;
}

export interface RoundOptions {
  id: ExerciseId;
  level: Level;
  mode: PlayMode;
  custom: boolean;
  /** Time Attack length in seconds. */
  seconds: number;
}

const EMPTY_STATS: RoundStats = { score: 0, mistakes: 0, combo: 0, bestCombo: 0, xp: 0 };
const COMBO_CUES = new Set([5, 10, 20, 30, 40, 50]);

/** State and rules of one round: questions, hearts, combo, XP, the Time Attack clock and recording. */
export function useRound({ id, level, mode, custom, seconds }: RoundOptions) {
  const { settings } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'question' | 'done'>('intro');
  const [q, setQ] = useState<Question | null>(null);
  const [qNum, setQNum] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [stats, setStats] = useState<RoundStats>(EMPTY_STATS);
  const [timeLeft, setTimeLeft] = useState(seconds * 1000);
  const [playing, setPlaying] = useState(false);
  const [summary, setSummary] = useState<RoundSummary | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const qNumRef = useRef(qNum);
  qNumRef.current = qNum;
  // The Time Attack clock pauses while a question plays for the first time.
  const autoPlaying = useRef(false);
  const autoToken = useRef(0);
  const advanceTimer = useRef<number | undefined>(undefined);
  const unlockedRef = useRef<Level | null>(null);
  const earnedRef = useRef<Achievement[]>([]);
  const startRank = useRef(0);
  const endedRef = useRef(false);

  const maxHearts = custom ? null : mode === 'classic' ? CLASSIC_HEARTS : mode === 'survival' ? SURVIVAL_HEARTS : null;
  const length = mode === 'classic' || custom ? CLASSIC_LENGTH : null;
  const heartsLeft = maxHearts === null ? null : Math.max(0, maxHearts - stats.mistakes);

  useEffect(() => setInstrument(settings.instrument), [settings.instrument]);
  useEffect(
    () => () => {
      stop();
      window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const playPart = useCallback(async (question: Question, part: 'all' | 'main' | 'context' | Playback, auto = false) => {
    const pb =
      typeof part !== 'string'
        ? part
        : part === 'context'
          ? (question.context ?? [])
          : part === 'main' || !question.context
            ? question.main
            : concatPlayback(question.context, question.main, 1.5);
    const token = ++autoToken.current;
    autoPlaying.current = auto;
    setPlaying(true);
    await play(pb, settingsRef.current.tempo);
    if (token === autoToken.current) {
      autoPlaying.current = false;
      setPlaying(false);
    }
  }, []);

  const nextQuestion = useCallback(() => {
    const st = settingsRef.current;
    const question = custom
      ? GENERATORS[id](1, Math.random, {
          fixedRoot: st.fixedRoot,
          chordTypes: st.customChords.types,
          inversions: st.customChords.inversions,
          weights: chordWeights(getProgress(), id, st.customChords.types),
        })
      : GENERATORS[id](level, Math.random, { fixedRoot: st.fixedRoot });
    setQ(question);
    setResult(null);
    setQNum((n) => n + 1);
    setPhase('question');
    void playPart(question, 'all', true);
  }, [id, level, custom, playPart]);

  const start = async () => {
    await ensureAudio();
    window.clearTimeout(advanceTimer.current);
    setStats(EMPTY_STATS);
    setQNum(0);
    setTimeLeft(seconds * 1000);
    setSummary(null);
    unlockedRef.current = null;
    earnedRef.current = [];
    endedRef.current = false;
    startRank.current = rankFor(getProgress().game.xp).index;
    nextQuestion();
  };

  const endRound = useCallback(
    (reason: EndReason) => {
      if (endedRef.current) return;
      endedRef.current = true;
      stop();
      window.clearTimeout(advanceTimer.current);
      const s = statsRef.current;
      const st = settingsRef.current;
      const data = getProgress();
      const out = recordRoundEnd(data.game, {
        id,
        level,
        mode,
        custom,
        finished: reason === 'complete',
        mistakes: s.mistakes,
        score: s.score,
        now: new Date(),
        goal: st.dailyGoal,
      });
      earnedRef.current.push(...commitProgress({ ...data, game: out.game }));
      const rank = rankFor(getProgress().game.xp).index;
      setSummary({
        ...s,
        reason,
        answered: qNumRef.current - (reason === 'time' ? 1 : 0),
        stars: out.stars,
        bonusXp: out.bonusXp,
        newRecord: out.newRecord,
        previousBest: out.previousBest,
        unlocked: unlockedRef.current,
        rankUp: rank > startRank.current ? rank : null,
        achievements: earnedRef.current,
      });
      setPhase('done');
      sfx('roundEnd', st.sfx);
    },
    [id, level, mode, custom],
  );

  const advance = useCallback(() => {
    stop();
    window.clearTimeout(advanceTimer.current);
    const s = statsRef.current;
    if (maxHearts !== null && s.mistakes >= maxHearts) endRound('hearts');
    else if (length !== null && qNumRef.current >= length) endRound('complete');
    else nextQuestion();
  }, [maxHearts, length, endRound, nextQuestion]);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const finish = (given: UserAnswer | null) => {
    if (!q || result || phase !== 'question') return;
    // Answering ends the Time Attack pause even if the question is still playing.
    autoPlaying.current = false;
    const g: GradeResult = given ? grade(q, given) : { correct: false, detail: t('session.revealed') };
    const st = settingsRef.current;
    const prev = statsRef.current;
    const combo = g.correct ? prev.combo + 1 : 0;
    const gain = g.correct ? xpForAnswer(custom ? 1 : level, combo) : 0;

    let data = getProgress();
    if (custom) {
      data = recordItemOnly(data, id, g.correct, q.item);
    } else {
      const rec = recordAnswer(data, id, level, g.correct, q.item);
      data = rec.data;
      if (rec.newlyUnlocked !== null) unlockedRef.current = rec.newlyUnlocked;
    }
    data = {
      ...data,
      game: recordGameAnswer(data.game, { id, correct: g.correct, xp: gain, combo, now: new Date(), goal: st.dailyGoal }),
    };
    earnedRef.current.push(...commitProgress(data));

    const next: RoundStats = {
      score: prev.score + (g.correct ? 1 : 0),
      mistakes: prev.mistakes + (g.correct ? 0 : 1),
      combo,
      bestCombo: Math.max(prev.bestCombo, combo),
      xp: prev.xp + gain,
    };
    statsRef.current = next;
    setStats(next);
    setResult({ grade: g, given, xp: gain });
    sfx(g.correct ? (COMBO_CUES.has(combo) ? 'combo' : 'correct') : 'wrong', st.sfx);

    if (mode === 'timeAttack') {
      advanceTimer.current = window.setTimeout(() => advanceRef.current(), g.correct ? 700 : 1600);
    }
  };

  // Time Attack clock.
  useEffect(() => {
    if (mode !== 'timeAttack' || phase !== 'question') return;
    let last = performance.now();
    const iv = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (!autoPlaying.current) setTimeLeft((ms) => Math.max(0, ms - dt));
    }, 100);
    return () => window.clearInterval(iv);
  }, [mode, phase]);

  useEffect(() => {
    if (mode === 'timeAttack' && phase === 'question' && timeLeft <= 0) endRound('time');
  }, [mode, phase, timeLeft, endRound]);

  return {
    phase,
    q,
    qNum,
    result,
    stats,
    timeLeft,
    playing,
    summary,
    maxHearts,
    heartsLeft,
    length,
    outOfHearts: heartsLeft === 0,
    start,
    finish,
    advance,
    endRound,
    playPart,
  };
}
