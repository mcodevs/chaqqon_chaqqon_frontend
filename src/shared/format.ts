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

const tashkentTimeFormatter = new Intl.DateTimeFormat('uz-UZ', {
  timeZone: 'Asia/Tashkent',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function toTashkentCalendarDate(d: Date): string {
  return new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatLastActive(isoDate?: string | null): { text: string; isOnline: boolean } {
  if (!isoDate) return { text: 'Hali kirmagan', isOnline: false };

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return { text: 'Hali kirmagan', isOnline: false };

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Active within the last 5 minutes (and allow up to 1 minute of future clock skew)
  if (diffMs >= -60_000 && diffMs < 5 * 60_000) {
    return { text: 'Hozir onlayn', isOnline: true };
  }

  const timeStr = tashkentTimeFormatter.format(date);
  const todayStr = toTashkentCalendarDate(now);
  const dateStr = toTashkentCalendarDate(date);

  if (dateStr === todayStr) {
    return { text: `Bugun, ${timeStr}`, isOnline: false };
  }

  const yesterdayStr = toTashkentCalendarDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (dateStr === yesterdayStr) {
    return { text: `Kecha, ${timeStr}`, isOnline: false };
  }

  const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays < 7) {
    return { text: `${diffDays} kun oldin`, isOnline: false };
  }

  return { text: formatDate(isoDate), isOnline: false };
}
