import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateKey,
  parseDateKey,
  addDays,
  getMondayOfWeek,
  calculateStreak,
  getWeeklyDays,
  calculateWeeklyStats,
  recordAcceptedSubmission
} from '../lib/streak-calculator.js';

describe('Streak Calculator - Date & Time Utilities', () => {
  it('formats dates to local YYYY-MM-DD format', () => {
    const testDate = new Date(2026, 10, 23); // Nov 23, 2026
    assert.equal(formatDateKey(testDate), '2026-11-23');
  });

  it('parses YYYY-MM-DD format back into local midnight Date', () => {
    const date = parseDateKey('2026-11-23');
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 10);
    assert.equal(date.getDate(), 23);
  });

  it('correctly calculates Monday of the current week', () => {
    // 2026-11-23 is a Monday
    const mondayDate = new Date(2026, 10, 23);
    const resultMonday = getMondayOfWeek(mondayDate);
    assert.equal(formatDateKey(resultMonday), '2026-11-23');

    // 2026-11-29 is a Sunday of that same week
    const sundayDate = new Date(2026, 10, 29);
    const resultFromSunday = getMondayOfWeek(sundayDate);
    assert.equal(formatDateKey(resultFromSunday), '2026-11-23');

    // 2026-11-25 is a Wednesday
    const wedDate = new Date(2026, 10, 25);
    const resultFromWed = getMondayOfWeek(wedDate);
    assert.equal(formatDateKey(resultFromWed), '2026-11-23');
  });
});

describe('Streak Calculator - Streak Calculations', () => {
  it('increments streak when today is completed', () => {
    const ref = new Date(2026, 10, 23); // Monday
    const progress = {
      '2026-11-21': { completed: true, acceptedCount: 1 },
      '2026-11-22': { completed: true, acceptedCount: 2 },
      '2026-11-23': { completed: true, acceptedCount: 1 }
    };
    const { currentStreak, longestStreak } = calculateStreak(progress, ref);
    assert.equal(currentStreak, 3);
    assert.equal(longestStreak, 3);
  });

  it('preserves yesterday streak when today is not completed yet (FR-17)', () => {
    const ref = new Date(2026, 10, 23); // Monday
    const progress = {
      '2026-11-21': { completed: true, acceptedCount: 1 },
      '2026-11-22': { completed: true, acceptedCount: 2 }
      // 2026-11-23 has no submissions yet today
    };
    const { currentStreak, longestStreak } = calculateStreak(progress, ref);
    // Streak is not broken until today ends!
    assert.equal(currentStreak, 2);
    assert.equal(longestStreak, 2);
  });

  it('breaks streak when yesterday was missed', () => {
    const ref = new Date(2026, 10, 23); // Monday
    const progress = {
      '2026-11-20': { completed: true, acceptedCount: 1 },
      '2026-11-21': { completed: true, acceptedCount: 1 }
      // 2026-11-22 missed
      // 2026-11-23 no submissions yet
    };
    const { currentStreak, longestStreak } = calculateStreak(progress, ref);
    assert.equal(currentStreak, 0);
    assert.equal(longestStreak, 2);
  });

  it('calculates longest streak accurately across gaps and historical records', () => {
    const ref = new Date(2026, 10, 23);
    const progress = {
      // Past 5-day streak
      '2026-10-01': { completed: true, acceptedCount: 1 },
      '2026-10-02': { completed: true, acceptedCount: 1 },
      '2026-10-03': { completed: true, acceptedCount: 1 },
      '2026-10-04': { completed: true, acceptedCount: 1 },
      '2026-10-05': { completed: true, acceptedCount: 1 },
      // Gap
      // Current 2-day streak
      '2026-11-22': { completed: true, acceptedCount: 1 },
      '2026-11-23': { completed: true, acceptedCount: 1 }
    };
    const { currentStreak, longestStreak } = calculateStreak(progress, ref);
    assert.equal(currentStreak, 2);
    assert.equal(longestStreak, 5);
  });
});

describe('Streak Calculator - Weekly Indicators & Statistics', () => {
  it('returns exactly 7 days from Monday to Sunday for the current week', () => {
    const ref = new Date(2026, 10, 25); // Wednesday Nov 25, 2026
    const progress = {
      '2026-11-23': { completed: true, acceptedCount: 1 },
      '2026-11-24': { completed: true, acceptedCount: 2 }
    };
    const weekDays = getWeeklyDays(progress, ref);
    assert.equal(weekDays.length, 7);
    assert.deepEqual(
      weekDays.map(d => d.dayLabel),
      ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    );
    assert.equal(weekDays[0].dateStr, '2026-11-23');
    assert.equal(weekDays[0].completed, true);
    assert.equal(weekDays[1].completed, true);
    assert.equal(weekDays[2].completed, false);
    assert.equal(weekDays[2].isToday, true); // Wednesday
  });

  it('calculates completion percentage and totals correctly', () => {
    const ref = new Date(2026, 10, 25);
    const progress = {
      '2026-11-23': { completed: true, acceptedCount: 1 },
      '2026-11-24': { completed: true, acceptedCount: 3 }
    };
    const stats = calculateWeeklyStats(progress, ref);
    assert.equal(stats.completedDays, 2);
    assert.equal(stats.weeklyPercentage, Math.round((2 / 7) * 100)); // 29%
    assert.equal(stats.totalAcceptedThisWeek, 4);
  });

  it('records accepted submission and updates daily completion immutably', () => {
    const initial = {};
    const updated = recordAcceptedSubmission(initial, '2026-11-23', 'sub-123');
    assert.equal(updated['2026-11-23'].completed, true);
    assert.equal(updated['2026-11-23'].acceptedCount, 1);
    assert.deepEqual(updated['2026-11-23'].submissionIds, ['sub-123']);

    // Multiple accepted submissions on the same day increment count
    const secondUpdate = recordAcceptedSubmission(updated, '2026-11-23', 'sub-456');
    assert.equal(secondUpdate['2026-11-23'].completed, true);
    assert.equal(secondUpdate['2026-11-23'].acceptedCount, 2);
    assert.deepEqual(secondUpdate['2026-11-23'].submissionIds, ['sub-123', 'sub-456']);
  });
});
