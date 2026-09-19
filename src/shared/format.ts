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

export function formatLastActive(isoDate?: string | null): { text: string; isOnline: boolean } {
  if (!isoDate) return { text: 'Hali kirmagan', isOnline: false };

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 5) {
    return { text: 'Hozir onlayn', isOnline: true };
  }

  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  // Check if same calendar day
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return { text: `Bugun, ${timeStr}`, isOnline: false };
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return { text: `Kecha, ${timeStr}`, isOnline: false };
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return { text: `${diffDays} kun oldin`, isOnline: false };
  }

  return { text: formatDate(isoDate), isOnline: false };
}
