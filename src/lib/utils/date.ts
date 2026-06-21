// ============================================================================
// IST Date Utilities
// All date logic uses Asia/Kolkata timezone (UTC+5:30)
// ============================================================================

const IST_TIMEZONE = 'Asia/Kolkata';
const EDIT_WINDOW_DAYS = 2; // today + 2 days back = 3-day window

/**
 * Get the current date in IST as a YYYY-MM-DD string
 */
export function getISTToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
}

/**
 * Get the current IST Date object
 */
export function getISTNow(): Date {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
  return new Date(istString);
}

/**
 * Format a date string to IST display format
 */
export function formatISTDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date for display in the matrix (DD/MM)
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Get the day name (Mon, Tue, etc.) for a date string
 */
export function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
  });
}

/**
 * Get full day name (Monday, Tuesday, etc.)
 */
export function getDayNameFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
  });
}

/**
 * Check if a date is within the editable 3-day window
 * entry_date >= (today_IST - 2 days)
 */
export function isWithinEditWindow(dateStr: string): boolean {
  const today = getISTToday();
  const todayDate = new Date(today + 'T00:00:00+05:30');
  const entryDate = new Date(dateStr + 'T00:00:00+05:30');

  const cutoffDate = new Date(todayDate);
  cutoffDate.setDate(cutoffDate.getDate() - EDIT_WINDOW_DAYS);

  return entryDate >= cutoffDate;
}

/**
 * Check if a date is today in IST
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getISTToday();
}

/**
 * Check if a date is in the future (IST)
 */
export function isFutureDate(dateStr: string): boolean {
  const today = getISTToday();
  return dateStr > today;
}

/**
 * Get an array of dates for a given month (YYYY-MM-DD strings)
 */
export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dates.push(dateStr);
  }

  return dates;
}

/**
 * Get the current IST month and year
 */
export function getISTMonthYear(): { year: number; month: number } {
  const now = getISTNow();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Get dates within the 3-day edit window (today, yesterday, day before)
 */
export function getEditableDates(): string[] {
  const today = getISTToday();
  const todayDate = new Date(today + 'T00:00:00+05:30');
  const dates: string[] = [];

  for (let i = 0; i <= EDIT_WINDOW_DAYS; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE }));
  }

  return dates;
}

/**
 * Format a month/year for display (e.g., "June 2026")
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
