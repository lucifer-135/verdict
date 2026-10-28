import type { ConcernId } from './concerns';

export type ScanSource = 'camera' | 'import' | 'sample';

export interface ConcernScore {
  raw: number;
  ui: number;
}

export interface Scan {
  id: string;
  takenAt: string;
  source: ScanSource;
  sourceHash: string | null;
  photoBlobId: string;
  overall: number | null;
  skinAge: number | null;
  scores: Partial<Record<ConcernId, ConcernScore>>;
  maskBlobIds: Partial<Record<ConcernId, string>>;
  skinType: string | null;
}

export interface TrialGoal {
  imageBlobId: string;
  scores: Partial<Record<ConcernId, number>>;
}

export interface Trial {
  id: string;
  productName: string;
  concerns: ConcernId[];
  /** YYYY-MM-DD, local */
  startDate: string;
  goal: TrialGoal | null;
  createdAt: string;
  isSample: boolean;
  archived: boolean;
}

export type VerdictKind = 'too_early' | 'working' | 'give_it_time' | 'not_moving' | 'pause';

export interface ConcernVerdict {
  concern: ConcernId;
  kind: VerdictKind;
  baseline: number | null;
  delta: number | null;
  slope: number | null;
  noise: number;
  goal: number | null;
  goalProgress: number | null;
}

export interface SideEffect {
  concern: ConcernId;
  delta: number;
  noise: number;
}

export interface VerdictResult {
  kind: VerdictKind;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  perConcern: ConcernVerdict[];
  sideEffects: SideEffect[];
  goalProgress: number | null;
  overlapWarning: string | null;
  lateBaseline: boolean;
  daysIn: number;
}
