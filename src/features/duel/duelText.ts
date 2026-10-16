import type { Duel } from '@/domain/duel';
import type { PracticeConfig } from '@/domain/practice/config';
import { drillDetail } from '@/features/share/resultCard';

/** "Chaqnovchi · 2 xonali · 1,5 s · 10 ta karta" — a duel's settings in one line. */
export function duelSummary(duel: Duel, config: PracticeConfig): string {
  const unit = config.kind === 'soroban' ? 'karta' : 'misol';
  return `${drillDetail(config)} · ${duel.roundCount} ta ${unit}`;
}

/** 24-hour clock: a class plays several duels a day, so the day alone does not tell them apart. */
const timeFormatter = new Intl.DateTimeFormat('uz-UZ', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatTimeOfDay(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Seconds with one decimal, as the standings read them: "12,4 s". */
export function formatAnswerTime(answerMs: number): string {
  return `${(answerMs / 1000).toFixed(1).replace('.', ',')} s`;
}
