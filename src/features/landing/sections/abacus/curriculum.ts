import { type MoveFrame, moveExpression, problemFrames } from '@/domain/practice/abacus';
import { PRACTICE_LIMITS } from '@/domain/practice/config';
import { TOPICS, TOPIC_GROUPS, type TopicGroupId } from '@/domain/practice/topics';
import { type Random, randomInt } from '@/domain/random';
import { SECTION_META } from '@/features/practice/sections';
import { formatSeconds } from '@/shared/format';
import { topicGroupCounts } from '../../content/landingFacts';

/*
 * The abacus section's content: the six milestones of the curriculum, each with one example move
 * that shows the milestone's technique bead by bead, and the numbers the "O'zingiz suring" game
 * asks for. The examples are locked by test to the plan shape they stand for, so a change in
 * planMove cannot quietly turn the "Kichik do'st" example into a plain move.
 */

/** Rods on both landing abacuses: every example, and every two-digit target, fits on three. */
export const CURRICULUM_RODS = 3;

/** One frame every 1.2 s: slow enough to follow a bead, and no example runs past 5 s. */
export const AUTOPLAY_STEP_MS = 1200;

/** The milestone on show before the visitor picks one: the first that needs a formula. */
export const DEFAULT_MILESTONE: TopicGroupId = 'kichik';

/** The move each milestone demonstrates, as [the number on the abacus, the number added]. */
export const MILESTONE_EXAMPLES = {
  togri: [2, 2],
  kichik: [3, 4],
  katta: [4, 8],
  miks: [7, 6],
  o50: [47, 5],
  o100: [95, 8],
} as const satisfies Record<TopicGroupId, readonly [number, number]>;

/*
 * Crossing topics report as the miks section, so their own colour would repeat the miks card's;
 * the one data colour no section uses marks them as the last stretch of the path instead.
 */
const CROSSING_COLOR = 'var(--data-4)';

export interface Milestone {
  id: TopicGroupId;
  label: string;
  hint: string;
  /** Topics in this milestone, counted from the curriculum. */
  count: number;
  /** The milestone's identity colour, a --data-* token. */
  color: string;
  numbers: readonly [number, number];
  /** "3 + 4 = 7". */
  expression: string;
}

function milestoneColor(id: TopicGroupId): string {
  if (id === 'o50' || id === 'o100') return CROSSING_COLOR;
  const topic = TOPICS.find((candidate) => candidate.group === id);
  return topic ? SECTION_META[topic.section].color : CROSSING_COLOR;
}

/** The milestones in the order the curriculum teaches them, from the first lesson on. */
export const MILESTONES: readonly Milestone[] = (() => {
  const counts = topicGroupCounts();
  const order = [...new Set(TOPICS.map((topic) => topic.group))];
  return order.map((id) => {
    const numbers = MILESTONE_EXAMPLES[id];
    return {
      id,
      label: TOPIC_GROUPS[id].label,
      hint: TOPIC_GROUPS[id].hint,
      count: counts[id],
      color: milestoneColor(id),
      numbers,
      expression: moveExpression(numbers[0], numbers[1]),
    };
  });
})();

export function milestoneOf(id: TopicGroupId): Milestone {
  return MILESTONES.find((milestone) => milestone.id === id) ?? MILESTONES[0];
}

/** The example as the player steps through it: the opening number, then one frame per bead move. */
export function milestoneFrames(id: TopicGroupId): MoveFrame[] {
  return problemFrames(MILESTONE_EXAMPLES[id], CURRICULUM_RODS);
}

/** One line of the player's hidden step list: what the hand does, then the formula it is part of. */
export function frameSummary(frame: Pick<MoveFrame, 'text' | 'formula'>): string {
  return frame.formula ? `${frame.text} — ${frame.formula}` : frame.text;
}

/** A milestone card's name for a screen reader: what it shows, then what pressing it does. */
export function milestoneAriaLabel(milestone: Pick<Milestone, 'label' | 'expression'>): string {
  return `${milestone.label}: ${milestone.expression} — ko'rsatish`;
}

export const RAIL_TITLE = `Birinchi darsdan chaqqon hisobgacha · ${TOPICS.length} ta mavzu`;

/** What a teacher can set for a drill, written from the limits the setup form itself enforces. */
export function practiceChips(): string[] {
  const { secondsPerNumber: speed, digitCount: digits, rowCount: rows } = PRACTICE_LIMITS;
  return [
    `Tezlik: ${formatSeconds(speed.min)}–${formatSeconds(speed.max)} soniya`,
    `${digits.min}–${digits.max} xonali sonlar`,
    `${rows.min}–${rows.max} ta son`,
  ];
}

/** Two-digit numbers: one rod would be too easy to be a game, three would be a chore on a phone. */
export const PLACE_TARGET = { min: 10, max: 99 } as const;

/** A number for the game to ask for, never the one it just asked: a repeat would look like a bug. */
export function drawPlaceTarget(random: Random, avoid: number | null): number {
  for (let tries = 0; tries < 20; tries++) {
    const target = randomInt(random, PLACE_TARGET.min, PLACE_TARGET.max);
    if (target !== avoid) return target;
  }
  return avoid === PLACE_TARGET.min ? PLACE_TARGET.max : PLACE_TARGET.min;
}
