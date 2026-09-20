import type { SectionId } from './config';
import type { ColumnTechniqueId, MoveFacts } from './soroban';

/*
 * Topic catalogue: the curriculum anzan.iama.kz teaches, rebuilt from its generator
 * (see docs/research/anzan-iama-formulas.md). A topic is one drill — "kichik do'st +4",
 * "katta do'st −9", "50 dan o'tish +9" — and it says three things:
 *   target  — the move the drill is about (ones-column amount + technique + boundary crossed);
 *   pool    — everything the student already knows, which the other rows are drawn from;
 *   shape   — which digit counts it works with and how many rows it needs at minimum.
 */

export type TopicGroupId = 'togri' | 'kichik' | 'katta' | 'miks' | 'o50' | 'o100';

export interface TopicTarget {
  /** Signed ones-column amounts that count as the drilled move; empty means "any". */
  amounts: readonly number[];
  technique: ColumnTechniqueId;
  /** Boundary the running total must step over on that move. */
  crossing?: 50 | 100;
}

export interface Topic {
  id: string;
  label: string;
  group: TopicGroupId;
  /** Section this topic reports as, so statistics and levels keep working. */
  section: SectionId;
  target: TopicTarget;
  /** Techniques any row is allowed to use — the target plus everything learned before it. */
  pool: readonly ColumnTechniqueId[];
  /** Ones-column amounts any row may use; undefined means every ±1…9. */
  poolAmounts?: readonly number[];
  digitCounts: readonly number[];
  minRowCount: number;
}

export type TopicId = Topic['id'];

export const TOPIC_GROUPS: Record<TopicGroupId, { label: string; hint: string }> = {
  togri: { label: "To'g'ri (formulasiz)", hint: 'Abakusda tosh yetadi' },
  kichik: { label: "Kichik do'st", hint: '5 ning juftligi: +5−x' },
  katta: { label: "Katta do'st", hint: "10 ning juftligi: o'nlikka o'tish" },
  miks: { label: 'Miks formula', hint: "O'tishda yana 5 ning juftligi kerak" },
  o50: { label: "50 dan o'tish", hint: "O'nliklar xonasida 5 ga o'tish" },
  o100: { label: "100 dan o'tish", hint: 'Yuzlikka ikki bosqichli ko‘chirish' },
};

const ALL: readonly ColumnTechniqueId[] = ['direct', 'small5', 'big10', 'mix'];
const UPTO_SMALL: readonly ColumnTechniqueId[] = ['direct', 'small5'];
const UPTO_BIG: readonly ColumnTechniqueId[] = ['direct', 'small5', 'big10'];

const signed = (amounts: readonly number[]) => amounts.flatMap((n) => [n, -n]);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function directTopic(
  id: string,
  label: string,
  target: readonly number[],
  pool: readonly number[],
  minRowCount = 3,
): Topic {
  return {
    id,
    label,
    group: 'togri',
    section: 'formulasiz',
    target: { amounts: target, technique: 'direct' },
    pool: ['direct'],
    poolAmounts: pool,
    digitCounts: [1],
    minRowCount,
  };
}

/** T1–T13 on the site: straight moves, one digit, introduced one number at a time. */
const DIRECT_TOPICS: readonly Topic[] = [
  directTopic('togri+1-4', "To'g'ri qo'shish +1…4", [1, 2, 3, 4], [1, 2, 3, 4], 2),
  directTopic('togri-1-4', "To'g'ri ayirish −1…4", [-1, -2, -3, -4], [-1, -2, -3, -4], 2),
  directTopic('togri±1-4', "To'g'ri ±1…4", signed([1, 2, 3, 4]), signed([1, 2, 3, 4])),
  directTopic('togri+5', "To'g'ri +5", [5], [5, ...signed([1, 2, 3])]),
  directTopic('togri-5', "To'g'ri −5", [-5], [-5, ...signed([1, 2, 3, 4])]),
  directTopic('togri±5', "To'g'ri ±5", [5, -5], signed([1, 2, 3, 4, 5])),
  directTopic('togri+6', "To'g'ri +6", [6], [6, ...signed([1, 2, 3, 4, 5])]),
  directTopic('togri-6', "To'g'ri −6", [-6], [-6, ...signed([1, 2, 3, 4, 5])]),
  directTopic('togri±6', "To'g'ri ±6", [6, -6], signed([1, 2, 3, 4, 5, 6])),
  directTopic('togri+7', "To'g'ri +7", [7], [7, ...signed([1, 2, 3, 5, 6])]),
  directTopic('togri-7', "To'g'ri −7", [-7], [-7, ...signed([1, 2, 3, 5, 6])]),
  directTopic('togri±7', "To'g'ri ±7", [7, -7], signed([1, 2, 3, 5, 6, 7])),
  directTopic('togri±8-9', "To'g'ri ±8 va ±9", signed([8, 9]), signed(range(1, 9))),
  {
    id: 'togri2d',
    label: "To'g'ri ±, ko'p xonali",
    group: 'togri',
    section: 'formulasiz',
    target: { amounts: [], technique: 'direct' },
    pool: ['direct'],
    digitCounts: [2, 3],
    minRowCount: 2,
  },
];

/** T19–T27: the 5-complement, taught from the biggest gap (+4) down to +1. */
const SMALL_FRIEND_TOPICS: readonly Topic[] = [
  ...[4, 3, 2, 1].flatMap((digit) =>
    [1, -1].map((sign) => {
      const amount = digit * sign;
      const learned = range(digit, 4).flatMap((n) => [n, -n]);
      return {
        id: `kichik${amount > 0 ? '+' : ''}${amount}`,
        label: `Kichik do'st ${amount > 0 ? '+' : '−'}${digit}`,
        group: 'kichik' as const,
        section: 'kichik' as SectionId,
        target: { amounts: [amount], technique: 'small5' as ColumnTechniqueId },
        pool: UPTO_SMALL,
        poolAmounts: [...learned, ...signed([5, 6, 7, 8, 9])],
        digitCounts: [1],
        minRowCount: 3,
      };
    }),
  ),
  {
    id: 'kichik2d',
    label: "Kichik do'st ±, ko'p xonali",
    group: 'kichik',
    section: 'kichik',
    target: { amounts: [], technique: 'small5' },
    pool: UPTO_SMALL,
    digitCounts: [2, 3],
    minRowCount: 2,
  },
];

/** T28–T50: the 10-complement, plus and minus, then the combined minus drill. */
const BIG_FRIEND_TOPICS: readonly Topic[] = [
  ...range(1, 9)
    .reverse()
    .map((digit) => ({
      id: `katta+${digit}`,
      label: `Katta do'st +${digit}`,
      group: 'katta' as const,
      section: 'katta' as SectionId,
      target: { amounts: [digit], technique: 'big10' as ColumnTechniqueId },
      pool: UPTO_BIG,
      digitCounts: [1, 2, 3],
      minRowCount: 3,
    })),
  ...range(1, 9)
    .reverse()
    .map((digit) => ({
      id: `katta-${digit}`,
      label: `Katta do'st −${digit}`,
      group: 'katta' as const,
      section: 'katta' as SectionId,
      target: { amounts: [-digit], technique: 'big10' as ColumnTechniqueId },
      pool: UPTO_BIG,
      digitCounts: [1, 2, 3],
      minRowCount: 3,
    })),
  {
    id: 'katta-all',
    label: "Katta do'st − (aralash)",
    group: 'katta',
    section: 'katta',
    target: { amounts: signed(range(1, 9)).filter((n) => n < 0), technique: 'big10' },
    pool: UPTO_BIG,
    digitCounts: [1, 2, 3],
    minRowCount: 4,
  },
];

/** T37–T40 and T51–T55: the carry whose complement needs the 5-bead as well. */
const MIX_TOPICS: readonly Topic[] = [
  ...[6, 7, 8, 9].map((digit) => ({
    id: `miks+${digit}`,
    label: `Miks formula +${digit}`,
    group: 'miks' as const,
    section: 'miks' as SectionId,
    target: { amounts: [digit], technique: 'mix' as ColumnTechniqueId },
    pool: ALL,
    digitCounts: [1, 2, 3],
    minRowCount: 3,
  })),
  ...[6, 7, 8, 9].map((digit) => ({
    id: `miks-${digit}`,
    label: `Miks formula −${digit}`,
    group: 'miks' as const,
    section: 'miks' as SectionId,
    target: { amounts: [-digit], technique: 'mix' as ColumnTechniqueId },
    pool: ALL,
    digitCounts: [1, 2, 3],
    minRowCount: 3,
  })),
  {
    id: 'miks-all',
    label: 'Miks formula − (aralash)',
    group: 'miks',
    section: 'miks',
    target: { amounts: [-6, -7, -8, -9], technique: 'mix' },
    pool: ALL,
    digitCounts: [1, 2, 3],
    minRowCount: 4,
  },
];

function crossingTopics(crossing: 50 | 100): Topic[] {
  const group: TopicGroupId = crossing === 50 ? 'o50' : 'o100';
  const prefix = crossing === 50 ? 'o50' : 'o100';
  const name = crossing === 50 ? "50 dan o'tish" : "100 dan o'tish";
  // The site also runs 50-crossings with three digits, but there it drills the 500 rod as often as
  // the 50 one, so the drill stops being one thing; we keep 50-crossings two-digit.
  const digitCounts = crossing === 50 ? [2] : [2, 3];
  const base = (id: string, label: string, target: TopicTarget): Topic => ({
    id,
    label,
    group,
    section: 'miks',
    target,
    pool: ALL,
    digitCounts,
    minRowCount: 4,
  });

  const topics: Topic[] = [];
  for (const sign of [1, -1] as const) {
    const mark = sign > 0 ? '+' : '−';
    for (const digit of range(1, 9).reverse()) {
      topics.push(
        base(`${prefix}${sign > 0 ? '+' : '-'}${digit}`, `${name} ${mark}${digit}`, {
          amounts: [sign * digit],
          technique: 'big10',
          crossing,
        }),
      );
    }
    for (const digit of [6, 7, 8, 9]) {
      topics.push(
        base(`${prefix}${sign > 0 ? '+' : '-'}${digit}mf`, `${name} ${mark}${digit} (miks)`, {
          amounts: [sign * digit],
          technique: 'mix',
          crossing,
        }),
      );
    }
    topics.push(
      base(`${prefix}${sign > 0 ? '+' : '-'}all`, `${name} ${mark} (aralash)`, {
        amounts: range(1, 9).map((d) => sign * d),
        technique: 'big10',
        crossing,
      }),
    );
  }
  topics.push(base(`${prefix}-free`, `${name} ± (erkin)`, { amounts: [], technique: 'big10', crossing }));
  return topics;
}

export const TOPICS: readonly Topic[] = [
  ...DIRECT_TOPICS,
  ...SMALL_FRIEND_TOPICS,
  ...BIG_FRIEND_TOPICS,
  ...MIX_TOPICS,
  ...crossingTopics(50),
  ...crossingTopics(100),
];

const BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]));

export function getTopic(id: string | undefined | null): Topic | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function isTopicId(value: unknown): value is TopicId {
  return typeof value === 'string' && BY_ID.has(value);
}

/** Topics that can be practised with this many digits per number. */
export function topicsForDigitCount(digitCount: number): readonly Topic[] {
  return TOPICS.filter((topic) => topic.digitCounts.includes(digitCount));
}

/** How far the running total may climb, mirroring what the site's own problems stay within. */
export function topicMaxTotal(topic: Topic, digitCount: number): number {
  if (topic.target.crossing === 100) return 3 * 10 ** digitCount;
  if (digitCount === 1) return topic.pool.includes('big10') ? 99 : 9;
  return 10 ** digitCount - 1;
}

/** True when the move is the one the topic drills. */
export function matchesTopic(topic: Topic, facts: MoveFacts): boolean {
  const { amounts, technique, crossing } = topic.target;
  if (facts.onesTechnique !== technique) return false;
  if (amounts.length > 0 && !amounts.includes(facts.onesAmount)) return false;
  if (crossing !== undefined && facts.crossed !== crossing) return false;
  return true;
}

/** True when a move is inside the topic's pool — a row the student can already handle. */
export function allowedByTopic(topic: Topic, facts: MoveFacts): boolean {
  if (topic.poolAmounts && !topic.poolAmounts.includes(facts.onesAmount)) return false;
  // "50 dan o'tish" drills stay inside the hundred; only the 100 topics step over it.
  if (topic.target.crossing === 50 && facts.crossed === 100) return false;
  return facts.columns.every((column) => topic.pool.includes(column.technique));
}
