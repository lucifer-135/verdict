import { costLine, formatUsd, monthlyCost, parseCost } from '@/lib/trials/cost';

test('monthlyCost spreads the price over the weeks one bottle lasts', () => {
  expect(monthlyCost({ price: 24, weeksPerUnit: 8 })).toBeCloseTo(13);
  expect(monthlyCost({ price: 12, weeksPerUnit: 4 })).toBeCloseTo(13);
});

test('formatUsd rounds to whole dollars', () => {
  expect(formatUsd(13.04)).toBe('$13');
  expect(formatUsd(1234.6)).toBe('$1,235');
  expect(formatUsd(0.4)).toBe('under $1');
});

test('costLine wording follows the verdict', () => {
  const cost = { price: 24, weeksPerUnit: 8 };
  expect(costLine('not_moving', cost)).toBe('Stopping saves about $13 a month.');
  expect(costLine('pause', cost)).toBe('Stopping saves about $13 a month.');
  expect(costLine('working', cost)).toBe('It costs about $13 a month, and it is working.');
  expect(costLine('give_it_time', cost)).toBe('It costs about $13 a month while you wait for a fair verdict.');
  expect(costLine('too_early', cost)).toBe('It costs about $13 a month while you wait for a fair verdict.');
});

test('parseCost: empty price means no cost; bad values explain themselves', () => {
  expect(parseCost('', '8')).toEqual({ cost: null, error: null });
  expect(parseCost(' 24.50 ', '6')).toEqual({ cost: { price: 24.5, weeksPerUnit: 6 }, error: null });
  expect(parseCost('0', '8').error).toBe('Enter a price greater than $0.');
  expect(parseCost('abc', '8').error).toBe('Enter a price greater than $0.');
  expect(parseCost('24', '0').error).toBe('Enter how many weeks one bottle lasts, from 1 to 52.');
  expect(parseCost('24', '2.5').error).toBe('Enter how many weeks one bottle lasts, from 1 to 52.');
  expect(parseCost('24', '60').error).toBe('Enter how many weeks one bottle lasts, from 1 to 52.');
});
