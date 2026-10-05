import { getTopic, isTopicId } from './topics';

export const SECTION_IDS = ['formulasiz', 'kichik', 'katta', 'miks'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const PRACTICE_KINDS = ['anzan', 'soroban', 'ustun'] as const;
/**
 * Which drill a config describes:
 * `anzan` flashes signed numbers and asks for their sum;
 * `soroban` flashes one abacus and asks which number is standing on it;
 * `ustun` writes the same numbers as a column that stays on screen while the child adds them.
 */
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

export interface PracticeConfig {
  kind: PracticeKind;
  /** The formula section. A soroban card teaches no formula, so it keeps the default. */
  section: SectionId;
  /**
   * Optional drill inside the section — one named topic from the curriculum (see topics.ts),
   * e.g. `kichik+4` or `o100-6mf`. Without it the whole section is practised.
   */
  topicId?: string;
  /** How many numbers are flashed in one problem. Unused by the soroban drill — a card is one number. */
  rowCount: number;
  /** Time from one number to the next, blank included (see `numberTiming`). The column drill never flashes, so it ignores this. */
  secondsPerNumber: number;
  /** Problems in a session — cards in the soroban drill. */
  problemCount: number;
  /** Number of digits in each number. */
  digitCount: number;
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
  digitCount: { min: 1, max: 3, step: 1 },
} as const satisfies Record<string, Range>;

/**
 * A soroban card is read, not added up: it takes a second instead of a minute, so a session
 * holds many more cards, and a wider number still fits on the rods.
 */
export const SOROBAN_LIMITS = {
  ...PRACTICE_LIMITS,
  problemCount: { min: 5, max: 30, step: 1 },
  digitCount: { min: 1, max: 5, step: 1 },
} as const satisfies Record<string, Range>;

export type PracticeLimits = typeof PRACTICE_LIMITS | typeof SOROBAN_LIMITS;

export function limitsFor(kind: PracticeKind): PracticeLimits {
  return kind === 'soroban' ? SOROBAN_LIMITS : PRACTICE_LIMITS;
}

/** True when a drill flashes its numbers; the column drill shows them all at once instead. */
export function isFlashed(kind: PracticeKind): boolean {
  return kind !== 'ustun';
}

export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  kind: 'anzan',
  section: 'formulasiz',
  rowCount: 4,
  secondsPerNumber: 6,
  problemCount: 5,
  digitCount: 1,
};

/** The reading drill starts faster and longer than the adding one — one card is one glance. */
export const DEFAULT_SOROBAN_CONFIG: PracticeConfig = {
  ...DEFAULT_PRACTICE_CONFIG,
  kind: 'soroban',
  secondsPerNumber: 1.5,
  problemCount: 10,
  digitCount: 2,
};

/**
 * The column drill is read, not remembered, so it can afford more rows than a flash of the same
 * length: the child's limit is adding speed, not how many numbers fit in their head.
 */
export const DEFAULT_USTUN_CONFIG: PracticeConfig = {
  ...DEFAULT_PRACTICE_CONFIG,
  kind: 'ustun',
  rowCount: 5,
};

/** The config a kind starts from, used when the drill is switched. */
export function defaultConfigFor(kind: PracticeKind): PracticeConfig {
  if (kind === 'soroban') return DEFAULT_SOROBAN_CONFIG;
  return kind === 'ustun' ? DEFAULT_USTUN_CONFIG : DEFAULT_PRACTICE_CONFIG;
}

/** Clamps `value` into a topic's own limits: its section, digit counts and shortest problem. */
function applyTopic(config: PracticeConfig): PracticeConfig {
  const topic = getTopic(config.topicId);
  if (!topic) return { ...config, topicId: undefined };

  const digitCount = topic.digitCounts.includes(config.digitCount) ? config.digitCount : topic.digitCounts[0];

  return {
    ...config,
    topicId: topic.id,
    section: topic.section,
    digitCount,
    rowCount: Math.max(config.rowCount, topic.minRowCount),
  };
}

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as readonly string[]).includes(value);
}

export function isPracticeKind(value: unknown): value is PracticeKind {
  return typeof value === 'string' && (PRACTICE_KINDS as readonly string[]).includes(value);
}

/**
 * Brings a config from a form, storage or the network within the rules: unknown sections fall back,
 * numbers are snapped to their step and clamped.
 */
export function normalizePracticeConfig(value: unknown): PracticeConfig {
  const input = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  // Configs stored before the soroban drill existed carry no kind; they are anzan sessions.
  const kind = isPracticeKind(input.kind) ? input.kind : 'anzan';
  const defaults = defaultConfigFor(kind);
  const limits = limitsFor(kind);

  const config: PracticeConfig = {
    kind,
    section: isSectionId(input.section) ? input.section : defaults.section,
    topicId: isTopicId(input.topicId) ? input.topicId : undefined,
    rowCount: clampToRange(input.rowCount, limits.rowCount, defaults.rowCount),
    secondsPerNumber: clampToRange(
      input.secondsPerNumber,
      limits.secondsPerNumber,
      defaults.secondsPerNumber,
    ),
    problemCount: clampToRange(input.problemCount, limits.problemCount, defaults.problemCount),
    digitCount: clampToRange(input.digitCount, limits.digitCount, defaults.digitCount),
  };

  // A soroban card has no formula and no topic to drill, so it never takes a topic's limits.
  return kind === 'soroban' ? { ...config, topicId: undefined } : applyTopic(config);
}

function clampToRange(value: unknown, { min, max, step }: Range, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  // Dividing keeps tenths exact: 3 / 10 is 0.3, while 3 * 0.1 is 0.30000000000000004.
  const stepsPerUnit = Math.round(1 / step);
  const snapped = Math.round(value * stepsPerUnit) / stepsPerUnit;
  return Math.min(max, Math.max(min, snapped));
}
