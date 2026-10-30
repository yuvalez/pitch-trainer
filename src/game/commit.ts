import { sfx } from '../audio/sfx';
import { t, tDyn } from '../i18n';
import { getProgress, setProgress, type ProgressData } from '../progress/store';
import { toast } from '../components/Toasts';
import { awardAchievements, newAchievements, type Achievement } from './achievements';
import { rankFor } from './rules';

/**
 * Save progress after a game event: award any newly earned achievements and
 * announce them (and rank-ups) with toasts. Returns the achievements earned.
 */
export function commitProgress(next: ProgressData, now = Date.now()): Achievement[] {
  const prev = getProgress();
  const earned = newAchievements(next);
  setProgress(awardAchievements(next, earned, now));

  for (const a of earned) {
    toast({ icon: a.icon, title: t('toast.achievement'), body: tDyn(`ach.${a.id}`, a.id) });
  }
  const before = rankFor(prev.game.xp);
  const after = rankFor(next.game.xp);
  if (after.index > before.index) {
    toast({ icon: after.icon, title: t('toast.rankUp'), body: tDyn(`rank.${after.index}`, '') });
  }
  if (earned.length || after.index > before.index) sfx('achievement', next.settings.sfx);
  return earned;
}
