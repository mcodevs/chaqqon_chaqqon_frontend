import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import { generateProblem } from './problem';
import { describeMove } from './soroban';
import { TOPICS, allowedByTopic, getTopic, matchesTopic, topicMaxTotal } from './topics';

/** Reads a problem back move by move, the way a student would work it on the abacus. */
function walk(numbers: readonly number[]) {
  let total = numbers[0];
  return numbers.slice(1).map((value) => {
    const facts = describeMove(total, value);
    total += value;
    return { value, facts, total };
  });
}

describe('describeMove', () => {
  it('names the ones-column technique the way the curriculum does', () => {
    expect(describeMove(3, 1).onesTechnique).toBe('direct');
    expect(describeMove(3, 2).onesTechnique).toBe('small5'); // +5−3
    expect(describeMove(6, 9).onesTechnique).toBe('big10'); // +10−1, and −1 fits
    expect(describeMove(7, 6).onesTechnique).toBe('mix'); // +10−4, and −4 needs −5+1
    expect(describeMove(12, -9).onesTechnique).toBe('big10');
    expect(describeMove(11, -6).onesTechnique).toBe('mix'); // −10+4 onto 1 needs +5−1
  });

  it('reports the boundary the running total steps over', () => {
    expect(describeMove(48, 9).crossed).toBe(50);
    expect(describeMove(96, 9).crossed).toBe(100);
    expect(describeMove(41, 5).crossed).toBe(0);
    expect(describeMove(102, -9).crossed).toBe(100);
  });

  it('reads every column of a multi-digit move', () => {
    const facts = describeMove(46, 39); // 6+9 carries; tens 4 + (3+1) needs +5−1
    expect(facts.columns.map((column) => column.technique)).toEqual(['big10', 'small5']);
    expect(facts.onesAmount).toBe(9);
    expect(facts.crossed).toBe(50);

    // 2+9 carries; tens 7 + (6+1) carries into the hundreds and its −3 needs −5+2
    const overTheHundred = describeMove(72, 69);
    expect(overTheHundred.columns.map((column) => column.technique)).toEqual(['big10', 'mix', 'direct']);
    expect(overTheHundred.crossed).toBe(100);
  });
});

describe('topic catalogue', () => {
  it('has unique ids and a sane shape', () => {
    const ids = TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const topic of TOPICS) {
      expect(topic.digitCounts.length).toBeGreaterThan(0);
      expect(topic.minRowCount).toBeGreaterThanOrEqual(2);
      expect(topic.pool).toContain(topic.target.technique);
    }
  });

  it.each(TOPICS.map((topic) => [topic.id, topic] as const))(
    'generates problems that really drill %s',
    (_id, topic) => {
      const random = createSeededRandom(7);
      const digitCount = topic.digitCounts[0];
      const rowCount = Math.max(topic.minRowCount, 5);
      const maxTotal = topicMaxTotal(topic, digitCount);
      let drilled = 0;

      for (let round = 0; round < 12; round++) {
        const problem = generateProblem(
          { section: topic.section, topicId: topic.id, rowCount, digitCount },
          random,
        );

        expect(problem.numbers).toHaveLength(rowCount);
        expect(problem.answer).toBe(problem.numbers.reduce((sum, n) => sum + n, 0));

        let total = problem.numbers[0];
        for (const step of walk(problem.numbers)) {
          total = step.total;
          expect(total).toBeGreaterThanOrEqual(0);
          expect(total).toBeLessThanOrEqual(maxTotal);
        }

        if (walk(problem.numbers).some((step) => matchesTopic(topic, step.facts))) drilled++;
      }

      // The site itself does not hit the target in every single problem, but it is the rule.
      expect(drilled).toBeGreaterThanOrEqual(9);
    },
  );

  it('keeps every row inside the topic pool for the taught drills', () => {
    const random = createSeededRandom(11);
    for (const topic of TOPICS.filter((t) => t.poolAmounts)) {
      for (let round = 0; round < 8; round++) {
        const problem = generateProblem(
          { section: topic.section, topicId: topic.id, rowCount: topic.minRowCount, digitCount: 1 },
          random,
        );
        for (const step of walk(problem.numbers)) {
          expect(allowedByTopic(topic, step.facts)).toBe(true);
        }
      }
    }
  });

  it('never lets a "50 dan o‘tish" drill leave the hundred', () => {
    const topic = getTopic('o50+9');
    expect(topic).toBeDefined();
    if (!topic) return;
    const random = createSeededRandom(3);
    for (let round = 0; round < 10; round++) {
      const problem = generateProblem(
        { section: topic.section, topicId: topic.id, rowCount: 5, digitCount: 2 },
        random,
      );
      for (const step of walk(problem.numbers)) expect(step.total).toBeLessThanOrEqual(99);
    }
  });
});
