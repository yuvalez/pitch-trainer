import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import { pc, pcName } from '../theory/music';
import type { Question, UserAnswer } from './types';

export interface GradeResult {
  correct: boolean;
  detail: string;
}

function labelOf(choices: { value: string; label: string }[], value: string): string {
  return choices.find((c) => c.value === value)?.label ?? value;
}

export function correctAnswer(q: Question): UserAnswer {
  switch (q.kind) {
    case 'choice':
      return { kind: 'choice', value: q.answer };
    case 'slots':
      return { kind: 'slots', values: [...q.answer] };
    case 'key':
      return { kind: 'key', tonicPc: q.askTonic ? q.answer.tonicPc : null, mode: q.answer.mode };
    case 'dictation':
      return { kind: 'dictation', notes: [...q.answer] };
    case 'chordName':
      return { kind: 'chordName', rootPc: q.answer.rootPc, type: q.answer.type };
    case 'chordNotes':
      return { kind: 'chordNotes', notes: [...q.answer] };
  }
}

export function grade(q: Question, a: UserAnswer): GradeResult {
  if (q.kind !== a.kind) return { correct: false, detail: t('grade.noAnswer') };
  switch (q.kind) {
    case 'choice': {
      const v = (a as Extract<UserAnswer, { kind: 'choice' }>).value;
      const correct = v === q.answer;
      return {
        correct,
        detail: correct
          ? t('grade.yes', { a: labelOf(q.choices, q.answer) })
          : t('grade.choiceNo', { given: labelOf(q.choices, v), a: labelOf(q.choices, q.answer) }),
      };
    }
    case 'slots': {
      const vals = (a as Extract<UserAnswer, { kind: 'slots' }>).values;
      const hits = q.answer.filter((v, i) => vals[i] === v).length;
      const correct = hits === q.answer.length && vals.length === q.answer.length;
      return {
        correct,
        detail: correct
          ? t('grade.yes', { a: q.answer.join(' – ') })
          : t('grade.slotsNo', { hits, n: q.answer.length, a: q.answer.join(' – ') }),
      };
    }
    case 'key': {
      const ka = a as Extract<UserAnswer, { kind: 'key' }>;
      const modeOk = ka.mode === q.answer.mode;
      const tonicOk = !q.askTonic || (ka.tonicPc !== null && pc(ka.tonicPc) === q.answer.tonicPc);
      const modeLabel = labelOf(q.modes, q.answer.mode);
      const keyLabel = q.askTonic ? t('key.withMode', { tonic: noteLabel(q.tonicName), mode: modeLabel }) : modeLabel;
      const parts: string[] = [];
      if (q.askTonic) parts.push(`${t('grade.tonic')} ${tonicOk ? '✓' : '✗'}`);
      parts.push(`${t('grade.scale')} ${modeOk ? '✓' : '✗'}`);
      return {
        correct: modeOk && tonicOk,
        detail: t('grade.parts', { parts: parts.join(', '), a: keyLabel }),
      };
    }
    case 'dictation': {
      const notes = (a as Extract<UserAnswer, { kind: 'dictation' }>).notes;
      const hits = q.answer.filter((n, i) => notes[i] === n).length;
      const correct = hits === q.answer.length && notes.length === q.answer.length;
      return {
        correct,
        detail: correct ? t('grade.dictationYes') : t('grade.dictationNo', { hits, n: q.answer.length }),
      };
    }
    case 'chordName': {
      const ca = a as Extract<UserAnswer, { kind: 'chordName' }>;
      const rootOk = ca.rootPc !== null && pc(ca.rootPc) === q.answer.rootPc;
      const typeOk = ca.type === q.answer.type;
      return {
        correct: rootOk && typeOk,
        detail: t('grade.parts', {
          parts: `${t('grade.root')} ${rootOk ? '✓' : '✗'}, ${t('grade.quality')} ${typeOk ? '✓' : '✗'}`,
          a: `${q.answerName} (${labelOf(q.qualities, q.answer.type)})`,
        }),
      };
    }
    case 'chordNotes': {
      const notes = (a as Extract<UserAnswer, { kind: 'chordNotes' }>).notes;
      const want = new Set(q.answer.map(pc));
      const got = new Set(notes.map(pc));
      const name = (p: number) => noteLabel(pcName(60 + p, q.sharps));
      const missing = [...want].filter((p) => !got.has(p));
      const extra = [...got].filter((p) => !want.has(p));
      const bassOk = !q.requireBass || (notes.length > 0 && pc(Math.min(...notes)) === pc(q.answer[0]));
      const correct = missing.length === 0 && extra.length === 0 && bassOk;
      if (correct) return { correct, detail: t('grade.yes', { a: q.answerName }) };
      const parts: string[] = [];
      if (missing.length) parts.push(t('grade.missing', { notes: missing.map(name).join(', ') }));
      if (extra.length) parts.push(t('grade.extra', { notes: extra.map(name).join(', ') }));
      if (!bassOk) parts.push(t('grade.bass', { note: name(pc(q.answer[0])) }));
      return { correct, detail: `${parts.join(' ')} ${t('grade.itWas', { a: q.answerName })}` };
    }
  }
}
