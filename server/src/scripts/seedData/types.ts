import type { CategorySlug } from '../../models/Category.js';
import type { Difficulty } from '../../models/Challenge.js';

export interface DemoHintSpec {
  title: string;
  content: string;
  cost: number;
  order: number;
}

export interface DemoChallengeSpec {
  title: string;
  category: CategorySlug;
  difficulty: Difficulty;
  points: number;
  description: string;
  flag: string;
  hints: DemoHintSpec[];
}
