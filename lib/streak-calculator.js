/**
 * Weekly LeetCode Consistency Tracker and Streak Calculator (FR-15 to FR-20).
 * Source of truth: dailyProgress object mapping "YYYY-MM-DD" -> { completed, acceptedCount, submissionIds }
 */

/**
 * Returns date key formatted as "YYYY-MM-DD" in the user's local timezone.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
export function formatDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" key into a local Date object set to 00:00:00.
 * @param {string} dateKey
 * @returns {Date}
 */
export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Adds offset days to a given date and returns a new Date object.
 * @param {Date} date
 * @param {number} offsetDays
 * @returns {Date}
 */
export function addDays(date, offsetDays) {
  const d = new Date(date);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/**
 * Returns the Monday (00:00:00 local time) of the week containing the given date.
 * Monday is day index 1, Sunday is day index 0 in JS getDay().
 * @param {Date} [date=new Date()]
 * @returns {Date}
 */
export function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // If Sunday (0), diff is -6 days; otherwise diff is (1 - day)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Calculate Current Streak and Longest Streak from dailyProgress history.
 * 
 * Rules:
 * - A completed day increments streak.
 * - A missed day breaks streak.
 * - If today is not completed yet, streak is NOT broken if yesterday was completed.
 * - Longest streak is the maximum consecutive completed calendar days in all recorded history.
 * 
 * @param {Record<string, { completed: boolean, acceptedCount: number }>} dailyProgress
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
export function calculateStreak(dailyProgress = {}, referenceDate = new Date()) {
  const todayKey = formatDateKey(referenceDate);
  const yesterday = addDays(referenceDate, -1);
  const yesterdayKey = formatDateKey(yesterday);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let cursorDate = new Date(referenceDate);
  cursorDate.setHours(0, 0, 0, 0);

  if (dailyProgress[todayKey]?.completed) {
    // Today is completed: count backward from today
    while (dailyProgress[formatDateKey(cursorDate)]?.completed) {
      currentStreak++;
      cursorDate = addDays(cursorDate, -1);
    }
  } else if (dailyProgress[yesterdayKey]?.completed) {
    // Today not completed yet: streak continues from yesterday until today ends
    cursorDate = new Date(yesterday);
    cursorDate.setHours(0, 0, 0, 0);
    while (dailyProgress[formatDateKey(cursorDate)]?.completed) {
      currentStreak++;
      cursorDate = addDays(cursorDate, -1);
    }
  } else {
    currentStreak = 0;
  }

  // 2. Calculate Longest Streak from all recorded dates
  const recordedDates = Object.keys(dailyProgress)
    .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && dailyProgress[k]?.completed)
    .sort();

  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  for (const dateKey of recordedDates) {
    const curDate = parseDateKey(dateKey);
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    prevDate = curDate;
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  // Longest streak should be at least as large as current streak
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

/**
 * Returns the 7-day weekly schedule (Monday - Sunday) for the given reference date.
 * @param {Record<string, { completed: boolean, acceptedCount: number }>} dailyProgress
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array<{ dayLabel: string, dateStr: string, isToday: boolean, completed: boolean, acceptedCount: number }>}
 */
export function getWeeklyDays(dailyProgress = {}, referenceDate = new Date()) {
  const monday = getMondayOfWeek(referenceDate);
  const todayKey = formatDateKey(referenceDate);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const week = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(monday, i);
    const dateStr = formatDateKey(dayDate);
    const dayRecord = dailyProgress[dateStr] || { completed: false, acceptedCount: 0 };

    week.push({
      dayLabel: dayLabels[i],
      dateStr,
      isToday: dateStr === todayKey,
      completed: Boolean(dayRecord.completed),
      acceptedCount: dayRecord.acceptedCount || 0
    });
  }

  return week;
}

/**
 * Calculate complete weekly statistics for the popup dashboard.
 * @param {Record<string, { completed: boolean, acceptedCount: number }>} dailyProgress
 * @param {Date} [referenceDate=new Date()]
 * @returns {Object}
 */
export function calculateWeeklyStats(dailyProgress = {}, referenceDate = new Date()) {
  const weekDays = getWeeklyDays(dailyProgress, referenceDate);
  const completedDays = weekDays.filter(d => d.completed).length;
  const weeklyPercentage = Math.round((completedDays / 7) * 100);
  const totalAcceptedThisWeek = weekDays.reduce((acc, d) => acc + (d.acceptedCount || 0), 0);

  const { currentStreak, longestStreak } = calculateStreak(dailyProgress, referenceDate);

  // Total accepted all time
  const totalAcceptedAllTime = Object.values(dailyProgress).reduce(
    (sum, record) => sum + (record?.acceptedCount || 0),
    0
  );

  return {
    weekDays,
    completedDays,
    weeklyPercentage,
    totalAcceptedThisWeek,
    currentStreak,
    longestStreak,
    totalAcceptedAllTime
  };
}

/**
 * Updates dailyProgress when an Accepted submission is received.
 * Pure function: returns a new updated dailyProgress map.
 * @param {Record<string, Object>} currentDailyProgress
 * @param {string|Date} dateOrKey
 * @param {string} [submissionId]
 * @returns {Record<string, Object>}
 */
export function recordAcceptedSubmission(currentDailyProgress = {}, dateOrKey = new Date(), submissionId = null) {
  const dateKey = typeof dateOrKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrKey)
    ? dateOrKey
    : formatDateKey(dateOrKey);

  const existing = currentDailyProgress[dateKey] || {
    completed: false,
    acceptedCount: 0,
    submissionIds: []
  };

  const existingIds = existing.submissionIds || [];
  const updatedIds = submissionId && !existingIds.includes(submissionId)
    ? [...existingIds, submissionId]
    : existingIds;

  return {
    ...currentDailyProgress,
    [dateKey]: {
      completed: true,
      acceptedCount: existing.acceptedCount + 1,
      submissionIds: updatedIds
    }
  };
}
