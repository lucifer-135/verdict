import { getConcern } from '@/lib/verdict/concerns';
import type { Trial } from '@/lib/verdict/types';

export type GoalPhase = 'ready' | 'unsupported' | 'no-baseline' | 'sample' | 'build';

/**
 * What the goal page should do for a trial. Only 'build' spends API units; the
 * read-only sample journey never builds a goal, even if its URL is opened directly.
 */
export function goalPhase(trial: Trial, hasBaseline: boolean): GoalPhase {
  if (trial.goal) return 'ready';
  if (trial.isSample) return 'sample';
  if (!trial.concerns.some(c => getConcern(c).simulable)) return 'unsupported';
  if (!hasBaseline) return 'no-baseline';
  return 'build';
}
