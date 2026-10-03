/**
 * Date and Time utilities configured for Asia/Jakarta (WIB) timezone
 */

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Returns today's date in YYYY-MM-DD format (Asia/Jakarta)
 */
export function getJakartaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current time in HH:mm:ss format (Asia/Jakarta)
 */
export function getJakartaTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

export function isAttendanceWindowOpen(date: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    weekday: 'short',
  }).format(date);
  const [hour, minute] = getJakartaTimeString(date).split(':').map(Number);
  const minutesSinceMidnight = hour * 60 + minute;
  const isAllowedDay = weekday === 'Fri' || weekday === 'Sat' || weekday === 'Sun';
  const isAllowedTime = minutesSinceMidnight >= 5 * 60 && minutesSinceMidnight < 18 * 60;

  return isAllowedDay && isAllowedTime;
}

/**
 * Format date in Indonesian readable format (e.g., "21 September 2026")
 */
export function formatIndonesianDate(dateStr: string | Date): string {
  if (!dateStr) return '-';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format time in WIB (e.g. "14:30 WIB")
 */
export function formatIndonesianTime(timeStr: string): string {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]} WIB`;
  }
  return `${timeStr} WIB`;
}

/**
 * Format date & time together (e.g., "21 September 2026, 14:30 WIB")
 */
export function formatIndonesianDateTime(dateStr: string, timeStr?: string): string {
  const formattedDate = formatIndonesianDate(dateStr);
  if (timeStr) {
    return `${formattedDate}, ${formatIndonesianTime(timeStr)}`;
  }
  return formattedDate;
}

/**
 * Get Indonesian day name for a given date string (YYYY-MM-DD)
 */
export function getIndonesianDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    weekday: 'long',
  }).format(date);
}

/**
 * Returns the last N days with their dates (YYYY-MM-DD) and day names in Indonesian
 */
export function getLastNDays(daysCount: number = 7): { date: string; day: string }[] {
  const result: { date: string; day: string }[] = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getJakartaDateString(d);
    const day = getIndonesianDayName(dateStr);
    result.push({ date: dateStr, day });
  }

  return result;
}

/**
 * Returns the Friday through Sunday attendance window for the current week in Asia/Jakarta.
 */
export function getLatestAttendanceDays(
  date: Date = new Date()
): { date: string; day: string }[] {
  const today = getJakartaDateString(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    weekday: 'short',
  }).format(date);
  const daysSinceFriday: Record<string, number> = {
    Fri: 0,
    Sat: 1,
    Sun: 2,
    Mon: 3,
    Tue: 4,
    Wed: 5,
    Thu: 6,
  };
  const daysBackToFriday = daysSinceFriday[weekday];

  if (daysBackToFriday === undefined) {
    throw new RangeError('Unable to resolve the current Jakarta weekday.');
  }

  const friday = new Date(`${today}T00:00:00.000Z`);
  friday.setUTCDate(friday.getUTCDate() - daysBackToFriday);

  return [0, 1, 2].map((daysAfterFriday) => {
    const dayDate = new Date(friday);
    dayDate.setUTCDate(dayDate.getUTCDate() + daysAfterFriday);
    const dateString = dayDate.toISOString().slice(0, 10);
    return { date: dateString, day: getIndonesianDayName(dateString) };
  });
}
