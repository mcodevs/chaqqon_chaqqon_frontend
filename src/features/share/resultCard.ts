import type { PracticeConfig } from '@/domain/practice/config';
import { accuracyPercent } from '@/domain/results';
import { DRILL_META, SECTION_META } from '@/features/practice/sections';
import { formatCalendarDate, formatSeconds } from '@/shared/format';

/**
 * What a shared result picture says. Kept apart from the drawing so the wording is
 * readable and testable on its own — the canvas below only places these strings.
 */
export interface ResultCardData {
  /** What the result is, in small type above the score. */
  title: string;
  name: string;
  /** Headline earned by the score. */
  praise: string;
  /** The emoji that goes with the praise. */
  badge: string;
  correct: number;
  total: number;
  accuracy: number;
  /** One line about the drill: "Chaqnovchi · 2 xonali · 1,5 s". */
  detail: string;
  /** Tashkent day, already written the way it is read: "29.09.2026". */
  date: string;
}

interface Praise {
  praise: string;
  badge: string;
}

/**
 * Every child leaves with something to show. The lowest band still looks forward instead of
 * scoring the child down — this picture is the one they send to people they care about.
 */
export function praiseFor(accuracy: number): Praise {
  if (accuracy >= 100) return { praise: 'Mukammal!', badge: '🏆' };
  if (accuracy >= 90) return { praise: "Zo'r natija!", badge: '🥇' };
  if (accuracy >= 75) return { praise: 'Ajoyib!', badge: '🎉' };
  if (accuracy >= 50) return { praise: 'Yaxshi!', badge: '👍' };
  return { praise: 'Mashq davom etadi!', badge: '💪' };
}

/** The drill in one line, the way the setup form describes it. */
export function drillDetail(config: PracticeConfig): string {
  const speed = `${formatSeconds(config.secondsPerNumber)} s`;
  if (config.kind === 'soroban') {
    return [DRILL_META.soroban.short, `${config.digitCount} xonali`, speed].join(' · ');
  }
  return [SECTION_META[config.section].label, `${config.rowCount} qator`, speed].join(' · ');
}

interface ResultCardInput {
  title: string;
  name: string;
  detail: string;
  correct: number;
  total: number;
  /** Tashkent day, 'YYYY-MM-DD'. */
  date: string;
}

export function resultCardData({
  title,
  name,
  detail,
  correct,
  total,
  date,
}: ResultCardInput): ResultCardData {
  const accuracy = accuracyPercent(correct, total);
  return {
    title,
    name,
    ...praiseFor(accuracy),
    correct,
    total,
    accuracy,
    detail,
    date: formatCalendarDate(date),
  };
}

/** The sentence that travels with the picture when an app asks for text as well. */
export function shareText(data: ResultCardData): string {
  return `${data.name} — ${data.title}: ${data.correct}/${data.total} to'g'ri (${data.accuracy}%). Chaqqon-chaqqon`;
}

/** A file name that says whose result it is without a date collision. */
export function shareFileName(data: ResultCardData): string {
  const slug = data.name
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `chaqqon-chaqqon-${slug || 'natija'}-${data.date.split('.').reverse().join('-')}.png`;
}
