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
  /** Parameter name in the Skin Simulation request body, or null if not simulable. */
  simKey: string | null;
}

// Spec §5.1, in order.
export const CONCERNS: readonly ConcernInfo[] = [
  { id: 'moisture', label: 'Hydration', windowDays: 14, targetable: true, simulable: false, simKey: null },
  { id: 'oiliness', label: 'Oiliness', windowDays: 28, targetable: true, simulable: true, simKey: 'oiliness' },
  { id: 'radiance', label: 'Radiance', windowDays: 28, targetable: true, simulable: true, simKey: 'radiance' },
  { id: 'redness', label: 'Redness', windowDays: 28, targetable: true, simulable: true, simKey: 'redness' },
  { id: 'acne', label: 'Breakouts', windowDays: 42, targetable: true, simulable: true, simKey: 'acne' },
  { id: 'pore', label: 'Pores', windowDays: 56, targetable: true, simulable: true, simKey: 'pores' },
  { id: 'texture', label: 'Texture', windowDays: 56, targetable: true, simulable: true, simKey: 'texture' },
  { id: 'dark_circle_v2', label: 'Dark circles', windowDays: 56, targetable: true, simulable: true, simKey: 'dark_circle' },
  { id: 'eye_bag', label: 'Eye bags', windowDays: 56, targetable: true, simulable: true, simKey: 'eye_bags' },
  { id: 'age_spot', label: 'Dark spots', windowDays: 84, targetable: true, simulable: true, simKey: 'spots' },
  { id: 'wrinkle', label: 'Fine lines', windowDays: 84, targetable: true, simulable: true, simKey: 'wrinkle' },
  { id: 'firmness', label: 'Firmness', windowDays: 84, targetable: true, simulable: false, simKey: null },
  { id: 'tear_trough', label: 'Tear trough', windowDays: 84, targetable: true, simulable: false, simKey: null },
  { id: 'droopy_upper_eyelid', label: 'Upper eyelid', windowDays: null, targetable: false, simulable: false, simKey: null },
  { id: 'droopy_lower_eyelid', label: 'Lower eyelid', windowDays: null, targetable: false, simulable: false, simKey: null },
  { id: 'skin_type', label: 'Skin type', windowDays: null, targetable: false, simulable: false, simKey: null },
];

export const SD_ACTIONS: readonly ConcernId[] = CONCERNS.map(c => c.id);

export const TARGETABLE: readonly ConcernInfo[] = CONCERNS.filter(c => c.targetable);

const BY_ID = new Map(CONCERNS.map(c => [c.id, c]));

export function getConcern(id: ConcernId): ConcernInfo {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown concern: ${id}`);
  return c;
}
