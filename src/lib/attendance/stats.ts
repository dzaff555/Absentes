import { getJakartaDateString, getJakartaTimeString } from '@/lib/utils/date';

export function getLastCompletedAttendanceDate(date: Date = new Date()): string {
  const today = getJakartaDateString(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(date);
  const [hour] = getJakartaTimeString(date).split(':').map(Number);
  const attendanceDay = weekday === 'Fri' || weekday === 'Sat' || weekday === 'Sun';

  if (!attendanceDay || hour >= 18) return today;

  const previousDate = new Date(`${today}T00:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  return previousDate.toISOString().slice(0, 10);
}

export function countWeekendDaysSince(joinedDate: string, throughDate: string): number {
  const current = new Date(`${joinedDate}T00:00:00.000Z`);
  const lastDay = new Date(`${throughDate}T00:00:00.000Z`);
  let count = 0;

  while (current <= lastDay) {
    const weekday = current.getUTCDay();
    if (weekday === 0 || weekday === 5 || weekday === 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
