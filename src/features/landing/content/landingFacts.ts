import type { PublicStats } from '@/application/ports';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { PRACTICE_KINDS, PRACTICE_LIMITS } from '@/domain/practice/config';
import { TOPICS, type TopicGroupId } from '@/domain/practice/topics';
import type { Feature, Tariff } from '@/domain/teacherBilling';
import { DRILL_META } from '@/features/practice/sections';
import { formatSeconds } from '@/shared/format';

/*
 * The numbers the landing shows. The constant ones are computed from the code they describe, so
 * they stay true as the curriculum grows; the live ones appear only once they are big enough to
 * reassure ("1 ustoz" would say the opposite of what social proof is for).
 */

/** The smallest platform count worth showing; each fact appears by itself as the platform grows. */
export const SHOW_FROM = { teachers: 10, students: 50, correctAnswers: 1000 } as const;

export interface StatFact {
  id: keyof PublicStats;
  /** Counted up when it first comes into view, so it stays a number. */
  value: number;
  label: string;
  caption: string;
}

export function visibleFacts(stats: PublicStats | undefined): StatFact[] {
  if (!stats) return [];
  const facts: StatFact[] = [
    { id: 'teachers', value: stats.teachers, label: 'ustoz', caption: 'platformada' },
    { id: 'students', value: stats.students, label: "o'quvchi", caption: 'platformada' },
    { id: 'correctAnswers', value: stats.correctAnswers, label: "to'g'ri javob", caption: 'platformada' },
  ];
  return facts.filter((fact) => fact.value >= SHOW_FROM[fact.id]);
}

export interface PlatformFact {
  id: 'topics' | 'kinds' | 'speed' | 'classroom';
  /** Already written out: a count ("109") or a range ("0,3–7"). */
  value: string;
  label: string;
  caption: string;
}

/** The facts about a tariff section: the other two are what every teacher gets. */
const GATED_FACTS: Partial<Record<PlatformFact['id'], readonly Feature[]>> = {
  // Chaqnovchi and ustunlar open with extra_drills; without it a student has anzan alone.
  kinds: ['extra_drills'],
  classroom: ['classroom'],
};

/**
 * What the platform is, in four numbers that are true on an empty production database too. The
 * two about a tariff section follow the same rule as the feature cards: left out when no offered
 * tariff opens it, tagged when only some do, unchanged while the tariffs load (so nothing moves).
 */
export function platformFacts(
  tariffs?: readonly Pick<Tariff, 'name' | 'features'>[] | undefined,
): PlatformFact[] {
  const speed = PRACTICE_LIMITS.secondsPerNumber;
  const facts: PlatformFact[] = [
    {
      id: 'topics',
      value: String(TOPICS.length),
      label: 'mavzu',
      caption: "formulasizdan 100 dan o'tishgacha",
    },
    {
      id: 'kinds',
      value: String(PRACTICE_KINDS.length),
      label: 'xil mashq',
      caption: PRACTICE_KINDS.map((kind) => DRILL_META[kind].short.toLowerCase()).join(', '),
    },
    {
      id: 'speed',
      value: `${formatSeconds(speed.min)}–${formatSeconds(speed.max)}`,
      label: 'soniya',
      caption: 'son almashish tezligi',
    },
    {
      id: 'classroom',
      value: `${CLASSROOM_PARTICIPANTS.min}–${CLASSROOM_PARTICIPANTS.max}`,
      label: "o'quvchi",
      caption: 'sinf musobaqasida bellashadi',
    },
  ];
  return facts.flatMap((fact): PlatformFact[] => {
    const coverage = featureCoverage(tariffs, GATED_FACTS[fact.id] ?? []);
    if (coverage.state === 'none') return [];
    if (coverage.state === 'some')
      return [{ ...fact, caption: `${fact.caption} · ${tariffTagLabel(coverage.names)}` }];
    return [fact];
  });
}

/** How many topics each milestone of the curriculum holds. */
export function topicGroupCounts(): Record<TopicGroupId, number> {
  const counts: Record<TopicGroupId, number> = { togri: 0, kichik: 0, katta: 0, miks: 0, o50: 0, o100: 0 };
  for (const topic of TOPICS) counts[topic.group] += 1;
  return counts;
}

/**
 * How a card with several sections counts as open in a tariff: `any` of them (the default), or
 * `all`, for a card whose text promises every one of them.
 */
export type FeatureMatch = 'any' | 'all';

/**
 * Which offered tariffs open a feature card. A card counts as open in a tariff that has any of its
 * sections (or all of them, with `match: 'all'`); a card with no sections is something every
 * teacher gets.
 * - `unknown`: tariffs are loading or none is public (today's production): show the card, no tag;
 * - `all`: every tariff opens it: no tag;
 * - `some`: tag it with those tariffs' names, in the order they are offered;
 * - `none`: tariffs exist and none opens it: hide the card rather than promise it.
 */
export type FeatureCoverage =
  { state: 'unknown' } | { state: 'all' } | { state: 'some'; names: string[] } | { state: 'none' };

export function featureCoverage(
  tariffs: readonly Pick<Tariff, 'name' | 'features'>[] | undefined,
  features: readonly Feature[],
  match: FeatureMatch = 'any',
): FeatureCoverage {
  if (features.length === 0) return { state: 'all' };
  if (!tariffs || tariffs.length === 0) return { state: 'unknown' };

  const opens = (tariff: Pick<Tariff, 'features'>) =>
    match === 'all'
      ? features.every((feature) => tariff.features.includes(feature))
      : features.some((feature) => tariff.features.includes(feature));
  const names = tariffs.filter(opens).map((tariff) => tariff.name);
  if (names.length === tariffs.length) return { state: 'all' };
  return names.length > 0 ? { state: 'some', names } : { state: 'none' };
}

/** The caption chip on a card that only some tariffs open: "Pro tarifida", "Pro, Max tariflarida". */
export function tariffTagLabel(names: readonly string[]): string {
  return names.length === 1 ? `${names[0]} tarifida` : `${names.join(', ')} tariflarida`;
}
