import { describe, expect, it } from 'vitest';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { PRACTICE_KINDS, PRACTICE_LIMITS } from '@/domain/practice/config';
import { TOPICS } from '@/domain/practice/topics';
import type { Feature } from '@/domain/teacherBilling';
import { formatSeconds } from '@/shared/format';
import { FEATURE_GROUPS } from './landingCopy';
import {
  SHOW_FROM,
  featureCoverage,
  platformFacts,
  tariffTagLabel,
  topicGroupCounts,
  visibleFacts,
} from './landingFacts';

describe('visibleFacts', () => {
  it('shows each count only from its threshold', () => {
    const ids = (teachers: number, students: number, correctAnswers: number) =>
      visibleFacts({ teachers, students, correctAnswers }).map((fact) => fact.id);

    expect(ids(9, 49, 999)).toEqual([]);
    expect(ids(10, 49, 999)).toEqual(['teachers']);
    expect(ids(9, 50, 999)).toEqual(['students']);
    expect(ids(9, 49, 1000)).toEqual(['correctAnswers']);
    expect(ids(10, 50, 1000)).toEqual(['teachers', 'students', 'correctAnswers']);
    expect(SHOW_FROM).toEqual({ teachers: 10, students: 50, correctAnswers: 1000 });
  });

  it('shows nothing while the stats load', () => {
    expect(visibleFacts(undefined)).toEqual([]);
  });

  it('keeps the real number and says where it comes from', () => {
    const [fact] = visibleFacts({ teachers: 0, students: 1234, correctAnswers: 0 });
    expect(fact).toEqual({ id: 'students', value: 1234, label: "o'quvchi", caption: 'platformada' });
  });
});

describe('platformFacts', () => {
  it('takes every number from the code it describes', () => {
    const facts = Object.fromEntries(platformFacts().map((fact) => [fact.id, fact]));
    const speed = PRACTICE_LIMITS.secondsPerNumber;

    expect(facts.topics.value).toBe(String(TOPICS.length));
    expect(facts.kinds.value).toBe(String(PRACTICE_KINDS.length));
    expect(facts.speed.value).toBe(`${formatSeconds(speed.min)}–${formatSeconds(speed.max)}`);
    expect(facts.classroom.value).toBe(`${CLASSROOM_PARTICIPANTS.min}–${CLASSROOM_PARTICIPANTS.max}`);
  });

  it('names the drills by their short names', () => {
    const kinds = platformFacts().find((fact) => fact.id === 'kinds');
    expect(kinds?.caption).toBe('anzan, chaqnovchi, ustunlar');
  });

  const ids = (facts: { id: string }[]) => facts.map((fact) => fact.id);
  const caption = (facts: { id: string; caption: string }[], id: string) =>
    facts.find((fact) => fact.id === id)?.caption;

  it('shows all four while the tariffs load or when none is public', () => {
    expect(ids(platformFacts())).toEqual(['topics', 'kinds', 'speed', 'classroom']);
    expect(ids(platformFacts(undefined))).toEqual(['topics', 'kinds', 'speed', 'classroom']);
    expect(ids(platformFacts([]))).toEqual(['topics', 'kinds', 'speed', 'classroom']);
    expect(caption(platformFacts([]), 'classroom')).toBe('sinf musobaqasida bellashadi');
  });

  it('leaves out a fact about a section no offered tariff opens', () => {
    const facts = platformFacts([{ name: 'Start', features: ['telegram'] }]);
    expect(ids(facts)).toEqual(['topics', 'speed']);
  });

  it('tags a fact about a section only some tariffs open', () => {
    const facts = platformFacts([
      { name: 'Start', features: ['extra_drills'] },
      { name: 'Pro', features: ['extra_drills', 'classroom'] },
    ]);
    expect(ids(facts)).toEqual(['topics', 'kinds', 'speed', 'classroom']);
    expect(caption(facts, 'kinds')).toBe('anzan, chaqnovchi, ustunlar');
    expect(caption(facts, 'classroom')).toBe('sinf musobaqasida bellashadi · Pro tarifida');
    expect(caption(facts, 'speed')).toBe('son almashish tezligi');
  });
});

describe('topicGroupCounts', () => {
  it('adds up to the whole curriculum', () => {
    const counts = topicGroupCounts();
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(TOPICS.length);
    expect(Object.values(counts).every((count) => count > 0)).toBe(true);
  });
});

describe('featureCoverage', () => {
  const tariff = (name: string, features: Feature[]) => ({ name, features });
  const tariffs = [
    tariff('Start', ['telegram']),
    tariff('Pro', ['telegram', 'classroom']),
    tariff('Max', ['telegram', 'classroom', 'worksheet']),
  ];

  it('knows nothing while tariffs load or when none is offered', () => {
    expect(featureCoverage(undefined, ['classroom'])).toEqual({ state: 'unknown' });
    expect(featureCoverage([], ['classroom'])).toEqual({ state: 'unknown' });
  });

  it('needs no tag for what every tariff, or every teacher, gets', () => {
    expect(featureCoverage(tariffs, ['telegram'])).toEqual({ state: 'all' });
    expect(featureCoverage(tariffs, [])).toEqual({ state: 'all' });
    expect(featureCoverage(undefined, [])).toEqual({ state: 'all' });
  });

  it('names the tariffs that open it, in the order they are offered', () => {
    expect(featureCoverage(tariffs, ['classroom'])).toEqual({ state: 'some', names: ['Pro', 'Max'] });
    expect(featureCoverage(tariffs, ['worksheet'])).toEqual({ state: 'some', names: ['Max'] });
  });

  it('counts a card open in a tariff that has any of its sections', () => {
    expect(featureCoverage(tariffs, ['market', 'worksheet'])).toEqual({ state: 'some', names: ['Max'] });
  });

  it('hides a card no offered tariff opens', () => {
    expect(featureCoverage(tariffs, ['market', 'leaderboard'])).toEqual({ state: 'none' });
  });

  it('with all, counts only a tariff that has every one of its sections', () => {
    expect(featureCoverage(tariffs, ['telegram', 'classroom'], 'all')).toEqual({
      state: 'some',
      names: ['Pro', 'Max'],
    });
    expect(featureCoverage(tariffs, ['classroom', 'worksheet'], 'all')).toEqual({
      state: 'some',
      names: ['Max'],
    });
    expect(featureCoverage(tariffs, ['worksheet', 'market'], 'all')).toEqual({ state: 'none' });
    expect(featureCoverage(tariffs, ['telegram'], 'all')).toEqual({ state: 'all' });
  });

  it('never counts the motivation card open on a tariff with only one of its promises', () => {
    const motivation = FEATURE_GROUPS.flatMap((group) => group.cards).find(
      (card) => card.id === 'motivation',
    );
    if (!motivation) throw new Error('the motivation card is missing');
    const offered = [
      tariff('Reyting', ['leaderboard']),
      tariff('Hammasi', ['homework_rooms', 'market', 'leaderboard']),
    ];
    expect(featureCoverage(offered, motivation.features, motivation.match)).toEqual({
      state: 'some',
      names: ['Hammasi'],
    });
    expect(
      featureCoverage([tariff('Reyting', ['leaderboard'])], motivation.features, motivation.match),
    ).toEqual({
      state: 'none',
    });
  });
});

describe('tariffTagLabel', () => {
  it('reads naturally for one name and for several', () => {
    expect(tariffTagLabel(['Pro'])).toBe('Pro tarifida');
    expect(tariffTagLabel(['Pro', 'Max'])).toBe('Pro, Max tariflarida');
  });
});
