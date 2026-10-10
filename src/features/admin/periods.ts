import { type CalendarDate, addDays, addMonths } from '@/domain/billing';
import type { DateRange } from '@/domain/platformStats';

export type PeriodId = 'week' | 'month30' | 'thisMonth' | 'lastMonth' | 'year';

export const PERIOD_OPTIONS: readonly { value: PeriodId; label: string }[] = [
  { value: 'week', label: '7 kun' },
  { value: 'month30', label: '30 kun' },
  { value: 'thisMonth', label: 'Shu oy' },
  { value: 'lastMonth', label: "O'tgan oy" },
  { value: 'year', label: 'Shu yil' },
];

/** The days a period covers, ending today (or with last month). */
export function rangeFor(period: PeriodId, today: CalendarDate): DateRange {
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (period) {
    case 'week':
      return { from: addDays(today, -6), to: today };
    case 'month30':
      return { from: addDays(today, -29), to: today };
    case 'thisMonth':
      return { from: monthStart, to: today };
    case 'lastMonth':
      return { from: addMonths(monthStart, -1), to: addDays(monthStart, -1) };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

/** '2026-10' → "okt 2026", or just "okt" when the year is clear from context. */
export function monthLabel(month: string, withYear = false): string {
  const [year, index] = month.split('-').map(Number);
  return withYear ? `${MONTHS[index - 1]} ${year}` : MONTHS[index - 1];
}

/** Short money for axes and tiles: 1 500 000 → "1,5 mln", 250 000 → "250 ming". */
export function compactSom(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    return `${sign}${(Math.round(abs / 100_000) / 10).toString().replace('.', ',')} mln`;
  }
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)} ming`;
  return `${sign}${abs}`;
}
