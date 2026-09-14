import type { PracticeConfig } from './practice/config';

export const PRACTICE_MODES = ['practice', 'online', 'classroom'] as const;

/** How a result was produced: solo practice, an online competition room, or a split-screen classroom match. */
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export interface PracticeResult {
  id: string;
  studentId: string;
  /** ISO-8601 timestamp. */
  completedAt: string;
  config: PracticeConfig;
  correct: number;
  total: number;
  mode: PracticeMode;
  /** The online competition room; null for every other mode. */
  roomId: string | null;
}

export function accuracyPercent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && (PRACTICE_MODES as readonly string[]).includes(value);
}

/** Reads a stored mode; results saved before modes existed are inferred from their room. */
export function resolvePracticeMode(value: unknown, roomId: string | null): PracticeMode {
  if (isPracticeMode(value)) return value;
  return roomId ? 'online' : 'practice';
}
