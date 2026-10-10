import { describe, expect, it } from 'vitest';
import { planMove } from '@/domain/practice/abacus';
import { PRACTICE_LIMITS } from '@/domain/practice/config';
import { TOPICS, TOPIC_GROUPS, type TopicGroupId } from '@/domain/practice/topics';
import { createSeededRandom } from '@/domain/random';
import { formatSeconds } from '@/shared/format';
import {
  AUTOPLAY_STEP_MS,
  CURRICULUM_RODS,
  DEFAULT_MILESTONE,
  MILESTONES,
  MILESTONE_EXAMPLES,
  PLACE_TARGET,
  RAIL_TITLE,
  drawPlaceTarget,
  frameSummary,
  milestoneAriaLabel,
  milestoneFrames,
  milestoneOf,
  practiceChips,
} from './curriculum';

const plan = (id: TopicGroupId) => {
  const [total, value] = MILESTONE_EXAMPLES[id];
  return planMove(total, value, CURRICULUM_RODS);
};

describe('MILESTONES', () => {
  it('walks every topic group in the order the curriculum teaches it', () => {
    expect(MILESTONES.map((milestone) => milestone.id)).toEqual([
      'togri',
      'kichik',
      'katta',
      'miks',
      'o50',
      'o100',
    ]);
    expect(new Set(MILESTONES.map((milestone) => milestone.id))).toEqual(new Set(Object.keys(TOPIC_GROUPS)));
  });

  it('counts its topics from the curriculum, adding up to the whole of it', () => {
    expect(MILESTONES.reduce((sum, milestone) => sum + milestone.count, 0)).toBe(TOPICS.length);
    for (const milestone of MILESTONES) {
      expect(milestone.count).toBe(TOPICS.filter((topic) => topic.group === milestone.id).length);
    }
  });

  it('takes its words from the topic groups and its example from the locked moves', () => {
    expect(milestoneOf('kichik')).toMatchObject({
      label: TOPIC_GROUPS.kichik.label,
      hint: TOPIC_GROUPS.kichik.hint,
      expression: '3 + 4 = 7',
    });
    expect(MILESTONES.map((milestone) => milestone.expression)).toEqual([
      '2 + 2 = 4',
      '3 + 4 = 7',
      '4 + 8 = 12',
      '7 + 6 = 13',
      '47 + 5 = 52',
      '95 + 8 = 103',
    ]);
  });

  it('colours each milestone with a data token, crossings with one of their own', () => {
    for (const milestone of MILESTONES) expect(milestone.color).toMatch(/^var\(--data-\d\)$/);
    expect(milestoneOf('o50').color).toBe(milestoneOf('o100').color);
    expect(milestoneOf('o50').color).not.toBe(milestoneOf('miks').color);
  });

  it('starts on a milestone that shows a formula', () => {
    expect(plan(DEFAULT_MILESTONE).some((step) => step.formula !== '')).toBe(true);
  });
});

describe('milestone examples', () => {
  it('togri: beads suffice — every step direct, nothing carried', () => {
    const steps = plan('togri');
    expect(steps.every((step) => step.kind === 'direct' && !step.carry && step.formula === '')).toBe(true);
  });

  it('kichik: one small-friend step', () => {
    const steps = plan('kichik');
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ kind: 'small5', carry: false, formula: '+4 = +5 − 1' });
  });

  it('katta: a big-friend carry with no small friend in it', () => {
    const steps = plan('katta');
    expect(steps.some((step) => step.carry)).toBe(true);
    expect(steps.some((step) => step.kind === 'small5')).toBe(false);
    expect(steps[0].formula).toBe('+8 = +10 − 2');
  });

  it('miks: the big-friend complement itself needs the small friend', () => {
    const steps = plan('miks');
    const complement = steps.find((step) => !step.carry);
    expect(complement).toMatchObject({ kind: 'small5', column: 0, formula: '+6 = +10 − 4' });
    expect(steps.some((step) => step.carry)).toBe(true);
  });

  it('o50: the carry onto the tens rod steps over 50 with the small friend', () => {
    const carry = plan('o50').find((step) => step.carry && step.column === 1);
    expect(carry).toMatchObject({ kind: 'small5', value: 52 });
  });

  it('o100: the cascade climbs onto the hundreds rod', () => {
    const steps = plan('o100');
    expect(steps.at(-1)?.value).toBeGreaterThanOrEqual(100);
    expect(steps.at(-1)?.column).toBe(2);
  });
});

describe('milestoneFrames', () => {
  it('opens on the first number and ends on the sum, on the landing rods', () => {
    for (const milestone of MILESTONES) {
      const frames = milestoneFrames(milestone.id);
      const [total, value] = milestone.numbers;
      expect(frames[0]).toMatchObject({ value: total, column: null });
      expect(frames.at(-1)?.value).toBe(total + value);
      expect(frames.every((frame) => frame.column === null || frame.column < CURRICULUM_RODS)).toBe(true);
    }
  });

  it('keeps every autoplay under five seconds', () => {
    for (const milestone of MILESTONES) {
      const frames = milestoneFrames(milestone.id);
      expect(frames.length).toBeLessThanOrEqual(4);
      expect((frames.length - 1) * AUTOPLAY_STEP_MS).toBeLessThan(5000);
    }
  });
});

describe('copy', () => {
  it('names a card by what it shows and what pressing it does', () => {
    expect(milestoneAriaLabel(milestoneOf('kichik'))).toBe("Kichik do'st: 3 + 4 = 7 — ko'rsatish");
  });

  it('lists a step by its instruction, with the formula only when it has one', () => {
    const [opening, step] = milestoneFrames('kichik');
    expect(frameSummary(opening)).toBe("Abakusga 3 ni qo'ying");
    expect(frameSummary(step)).toBe(
      "Kichik do'st: Birlar xonasida 5 likni tushiring va 1 ni oling — +4 = +5 − 1",
    );
  });

  it('counts the curriculum in the rail title', () => {
    expect(RAIL_TITLE).toBe(`Birinchi darsdan chaqqon hisobgacha · ${TOPICS.length} ta mavzu`);
  });

  it('writes the drill settings from the limits the setup form enforces', () => {
    const { secondsPerNumber, digitCount, rowCount } = PRACTICE_LIMITS;
    expect(practiceChips()).toEqual([
      `Tezlik: ${formatSeconds(secondsPerNumber.min)}–${formatSeconds(secondsPerNumber.max)} soniya`,
      `${digitCount.min}–${digitCount.max} xonali sonlar`,
      `${rowCount.min}–${rowCount.max} ta son`,
    ]);
    expect(practiceChips()).toEqual(['Tezlik: 0,3–7 soniya', '1–3 xonali sonlar', '3–10 ta son']);
  });
});

describe('drawPlaceTarget', () => {
  it('asks for a two-digit number that fits the rods, never the one just asked', () => {
    const random = createSeededRandom(7);
    let previous: number | null = null;
    for (let draw = 0; draw < 1000; draw++) {
      const target = drawPlaceTarget(random, previous);
      expect(target).toBeGreaterThanOrEqual(PLACE_TARGET.min);
      expect(target).toBeLessThanOrEqual(PLACE_TARGET.max);
      expect(target).not.toBe(previous);
      expect(target).toBeLessThan(10 ** CURRICULUM_RODS);
      previous = target;
    }
  });

  it('still moves on when the randomness keeps repeating itself', () => {
    expect(drawPlaceTarget(() => 0, PLACE_TARGET.min)).toBe(PLACE_TARGET.max);
    expect(drawPlaceTarget(() => 0.999, PLACE_TARGET.max)).toBe(PLACE_TARGET.min);
  });
});
