export type ConcernId =
  | 'moisture'
  | 'oiliness'
  | 'radiance'
  | 'redness'
  | 'acne'
  | 'pore'
  | 'texture'
  | 'dark_circle_v2'
  | 'eye_bag'
  | 'age_spot'
  | 'wrinkle'
  | 'firmness'
  | 'tear_trough'
  | 'droopy_upper_eyelid'
  | 'droopy_lower_eyelid'
  | 'skin_type';

export interface ConcernInfo {
  id: ConcernId;
  label: string;
  /** Days before a fair verdict is possible (heuristic, ~28-day skin cycle). */
  windowDays: number | null;
  targetable: boolean;
  simulable: boolean;
}

// Spec §5.1, in order.
export const CONCERNS: readonly ConcernInfo[] = [
  { id: 'moisture', label: 'Hydration', windowDays: 14, targetable: true, simulable: false },
  { id: 'oiliness', label: 'Oiliness', windowDays: 28, targetable: true, simulable: true },
  { id: 'radiance', label: 'Radiance', windowDays: 28, targetable: true, simulable: true },
  { id: 'redness', label: 'Redness', windowDays: 28, targetable: true, simulable: true },
  { id: 'acne', label: 'Breakouts', windowDays: 42, targetable: true, simulable: true },
  { id: 'pore', label: 'Pores', windowDays: 56, targetable: true, simulable: true },
  { id: 'texture', label: 'Texture', windowDays: 56, targetable: true, simulable: true },
  { id: 'dark_circle_v2', label: 'Dark circles', windowDays: 56, targetable: true, simulable: true },
  { id: 'eye_bag', label: 'Eye bags', windowDays: 56, targetable: true, simulable: true },
  { id: 'age_spot', label: 'Dark spots', windowDays: 84, targetable: true, simulable: true },
  { id: 'wrinkle', label: 'Fine lines', windowDays: 84, targetable: true, simulable: true },
  { id: 'firmness', label: 'Firmness', windowDays: 84, targetable: true, simulable: false },
  { id: 'tear_trough', label: 'Tear trough', windowDays: 84, targetable: true, simulable: false },
  { id: 'droopy_upper_eyelid', label: 'Upper eyelid', windowDays: null, targetable: false, simulable: false },
  { id: 'droopy_lower_eyelid', label: 'Lower eyelid', windowDays: null, targetable: false, simulable: false },
  { id: 'skin_type', label: 'Skin type', windowDays: null, targetable: false, simulable: false },
];

export const SD_ACTIONS: readonly ConcernId[] = CONCERNS.map(c => c.id);

export const TARGETABLE: readonly ConcernInfo[] = CONCERNS.filter(c => c.targetable);

const BY_ID = new Map(CONCERNS.map(c => [c.id, c]));

export function getConcern(id: ConcernId): ConcernInfo {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown concern: ${id}`);
  return c;
}
