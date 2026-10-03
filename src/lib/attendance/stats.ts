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

export function countWeekendDaysSince(joinedAt: string, throughDate: string): number {
  const joinedDate = joinedAt.slice(0, 10);
  const current = new Date(`${joinedDate}T00:00:00.000Z`);
  const lastDay = new Date(`${throughDate}T00:00:00.000Z`);
  const joinedTime = joinedAt.slice(11, 19);

  if (joinedTime >= '18:00:00') {
    current.setUTCDate(current.getUTCDate() + 1);
  }

  let count = 0;

  while (current <= lastDay) {
    const weekday = current.getUTCDay();
    if (weekday === 0 || weekday === 5 || weekday === 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
