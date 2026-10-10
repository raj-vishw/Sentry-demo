import { Flag, Target, Award, Trophy, Calendar, CalendarCheck, Flame, PenLine, Users, Crown, type LucideIcon } from 'lucide-react';
import { CATEGORY_META } from './categories';
import type { Category } from '@/types';

export interface AchievementMeta {
  label: string;
  description: string;
  icon: LucideIcon;
}

const FIXED_META: Record<string, AchievementMeta> = {
  FIRST_SOLVE: { label: 'First Steps', description: 'Solved your first challenge.', icon: Flag },
  SOLVE_COUNT_10: { label: 'Getting Started', description: 'Solved 10 challenges.', icon: Target },
  SOLVE_COUNT_25: { label: 'Seasoned Operator', description: 'Solved 25 challenges.', icon: Award },
  SOLVE_COUNT_50: { label: 'Elite Hacker', description: 'Solved 50 challenges.', icon: Trophy },
  STREAK_7: { label: 'Week Warrior', description: 'Solved something 7 days in a row.', icon: Calendar },
  STREAK_30: { label: 'Unstoppable', description: 'Solved something 30 days in a row.', icon: CalendarCheck },
  FIRST_BLOOD: { label: 'First Blood', description: 'First to solve a challenge.', icon: Flame },
  FIRST_WRITEUP_PUBLISHED: { label: 'Published Author', description: 'Had a writeup approved.', icon: PenLine },
  TEAM_FOUNDER: { label: 'Team Founder', description: 'Founded a team.', icon: Users },
};

const UNKNOWN_META: AchievementMeta = { label: 'Achievement', description: '', icon: Award };

/** Category-scoped types (`CATEGORY_MASTER_web`, ...) are derived rather
 * than stored in the fixed catalog — the slug is baked into the type
 * string itself (see server/src/models/Achievement.ts). */
export function getAchievementMeta(type: string): AchievementMeta {
  if (type.startsWith('CATEGORY_MASTER_')) {
    const slug = type.slice('CATEGORY_MASTER_'.length) as Category;
    const category = CATEGORY_META[slug];
    const name = category?.name ?? slug;
    return { label: `${name} Master`, description: `Solved every published ${name} challenge.`, icon: Crown };
  }
  return FIXED_META[type] ?? UNKNOWN_META;
}
