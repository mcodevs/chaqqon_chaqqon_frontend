import { describe, expect, it } from 'vitest';
import { isValidClassroomSize, rankScores } from './classroom';

describe('rankScores', () => {
  it('orders by correct answers and lets ties share a place', () => {
    const ranked = rankScores([
      { studentId: 'a', correct: 3, total: 5 },
      { studentId: 'b', correct: 5, total: 5 },
      { studentId: 'c', correct: 3, total: 5 },
      { studentId: 'd', correct: 1, total: 5 },
    ]);

    expect(ranked.map(({ studentId, place }) => [studentId, place])).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 2],
      ['d', 4],
    ]);
  });
});

describe('isValidClassroomSize', () => {
  it.each([
    [1, false],
    [2, true],
    [4, true],
    [5, false],
  ])('%i students → %s', (count, valid) => {
    expect(isValidClassroomSize(count)).toBe(valid);
  });
});
