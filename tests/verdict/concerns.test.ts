import { CONCERNS, SD_ACTIONS, TARGETABLE, getConcern, isConcernId } from '@/lib/verdict/concerns';

test('catalog has 16 SD concerns', () => {
  expect(SD_ACTIONS).toHaveLength(16);
  expect(new Set(CONCERNS.map(c => c.id))).toEqual(new Set(SD_ACTIONS));
});

test('13 targetable concerns; eyelids and skin_type are not', () => {
  expect(TARGETABLE).toHaveLength(13);
  for (const id of ['droopy_upper_eyelid', 'droopy_lower_eyelid', 'skin_type'] as const)
    expect(getConcern(id).targetable).toBe(false);
});

test('windows match spec', () => {
  expect(getConcern('moisture').windowDays).toBe(14);
  expect(getConcern('oiliness').windowDays).toBe(28);
  expect(getConcern('acne').windowDays).toBe(42);
  expect(getConcern('pore').windowDays).toBe(56);
  expect(getConcern('wrinkle').windowDays).toBe(84);
  expect(getConcern('skin_type').windowDays).toBeNull();
});

test('moisture, firmness, tear_trough are not simulable', () => {
  expect(CONCERNS.filter(c => c.targetable && !c.simulable).map(c => c.id).sort())
    .toEqual(['firmness', 'moisture', 'tear_trough']);
});

test('labels', () => {
  expect(getConcern('acne').label).toBe('Breakouts');
  expect(getConcern('dark_circle_v2').label).toBe('Dark circles');
  expect(getConcern('age_spot').label).toBe('Dark spots');
  expect(getConcern('wrinkle').label).toBe('Fine lines');
});

test('simulation keys map to the Skin Simulation API names', () => {
  expect(getConcern('oiliness').simKey).toBe('oiliness');
  expect(getConcern('eye_bag').simKey).toBe('eye_bags');
  expect(getConcern('dark_circle_v2').simKey).toBe('dark_circle');
  expect(getConcern('age_spot').simKey).toBe('spots');
  expect(getConcern('pore').simKey).toBe('pores');
  expect(getConcern('moisture').simKey).toBeNull();
  expect(CONCERNS.filter(c => c.simKey !== null).every(c => c.simulable)).toBe(true);
  expect(CONCERNS.filter(c => c.simulable).every(c => c.simKey !== null)).toBe(true);
});

test('isConcernId accepts only SD concern names', () => {
  expect(isConcernId('oiliness')).toBe(true);
  expect(isConcernId('all')).toBe(false);
  expect(isConcernId('hd_pore')).toBe(false);
});
