const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** 947 -> "3:47 pm" */
export function formatClock(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

/** 84 -> "in 1h 24m", 24 -> "in 24 min" */
export function formatCountdown(minutes: number) {
  if (minutes < 1) return 'in less than a minute';
  if (minutes < 60) return `in ${minutes} min`;
  const mins = minutes % 60;
  return mins ? `in ${Math.floor(minutes / 60)}h ${mins}m` : `in ${minutes / 60}h`;
}

/** "Tuesday 13 October" */
export const formatDate = (date: Date) => `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
