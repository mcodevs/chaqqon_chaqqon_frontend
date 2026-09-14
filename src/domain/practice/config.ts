export const SECTION_IDS = ['formulasiz', 'kichik', 'katta', 'miks'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface PracticeConfig {
  section: SectionId;
  /** How many numbers are flashed in one problem. */
  rowCount: number;
  /** Time from one number to the next, blank included (see `numberTiming`). */
  secondsPerNumber: number;
  problemCount: number;
}

export interface Range {
  min: number;
  max: number;
  /** Values snap to it; it must divide 1 evenly (1, 0.5, 0.1…). */
  step: number;
}

export const PRACTICE_LIMITS = {
  rowCount: { min: 3, max: 10, step: 1 },
  secondsPerNumber: { min: 0.3, max: 7, step: 0.1 },
  problemCount: { min: 5, max: 10, step: 1 },
} as const satisfies Record<string, Range>;

export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  section: 'formulasiz',
  rowCount: 4,
  secondsPerNumber: 6,
  problemCount: 5,
};

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as readonly string[]).includes(value);
}

/**
 * Brings a config from a form, storage or the network within the rules: unknown sections fall back,
 * numbers are snapped to their step and clamped.
 */
export function normalizePracticeConfig(value: unknown): PracticeConfig {
  const input = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_PRACTICE_CONFIG;

  return {
    section: isSectionId(input.section) ? input.section : defaults.section,
    rowCount: clampToRange(input.rowCount, PRACTICE_LIMITS.rowCount, defaults.rowCount),
    secondsPerNumber: clampToRange(
      input.secondsPerNumber,
      PRACTICE_LIMITS.secondsPerNumber,
      defaults.secondsPerNumber,
    ),
    problemCount: clampToRange(input.problemCount, PRACTICE_LIMITS.problemCount, defaults.problemCount),
  };
}

function clampToRange(value: unknown, { min, max, step }: Range, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  // Dividing keeps tenths exact: 3 / 10 is 0.3, while 3 * 0.1 is 0.30000000000000004.
  const stepsPerUnit = Math.round(1 / step);
  const snapped = Math.round(value * stepsPerUnit) / stepsPerUnit;
  return Math.min(max, Math.max(min, snapped));
}
