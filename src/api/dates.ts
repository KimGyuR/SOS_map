// The server only sends ISO dates; display text such as "3시간 전" is computed here.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parse(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const date = parse(value);
  if (!date) return '';
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return '방금 전';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  if (elapsed < 2 * DAY) return '어제';
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`;
  const monthDay = `${date.getMonth() + 1}.${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? monthDay : `${date.getFullYear()}.${monthDay}`;
}

/** "10.24 – 10.26" style period, e.g. for festivals. */
export function formatDateRange(start: string, end: string): string {
  const from = parse(start);
  const to = parse(end);
  if (!from || !to) return '';
  return `${from.getMonth() + 1}.${from.getDate()} – ${to.getMonth() + 1}.${to.getDate()}`;
}
