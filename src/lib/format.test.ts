import { formatRelative } from './format';

const NOW = Date.parse('2026-10-03T12:00:00Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe('formatRelative', () => {
  it.each([
    [10, 'just now'],
    [120, '2 minutes ago'],
    [3 * 3600, '3 hours ago'],
    [24 * 3600, 'yesterday'],
    [3 * 24 * 3600, '3 days ago'],
    [14 * 24 * 3600, '2 weeks ago'],
  ])('%i s ago → %s', (seconds, expected) => {
    expect(formatRelative(ago(seconds), NOW)).toBe(expected);
  });
});
