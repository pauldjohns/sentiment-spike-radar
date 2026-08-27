import { describe, it, expect } from 'vitest';
import { startOfTodayEasternISO } from './tickerDeduplication';

describe('startOfTodayEasternISO', () => {
  it('uses midnight in New York during daylight saving time', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    expect(startOfTodayEasternISO(date)).toBe('2024-06-01T04:00:00.000Z');
  });

  it('uses midnight in New York during standard time', () => {
    const date = new Date('2024-12-01T12:00:00Z');
    expect(startOfTodayEasternISO(date)).toBe('2024-12-01T05:00:00.000Z');
  });
});
