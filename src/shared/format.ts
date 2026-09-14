const dateFormatter = new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/** A billing day as it is written in Uzbekistan: '2026-10-14' → "14.10.2026". */
export function formatCalendarDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * Tenths of a second with the Uzbek decimal comma: 0.3 → "0,3", 6 → "6". Written by hand, since
 * browsers without Uzbek locale data print "0.3" through Intl.
 */
export function formatSeconds(seconds: number): string {
  return String(Math.round(seconds * 10) / 10).replace('.', ',');
}

export function formatSigned(value: number, isFirst: boolean): { sign: string; magnitude: number } {
  return { sign: isFirst ? '' : value < 0 ? '−' : '+', magnitude: Math.abs(value) };
}
