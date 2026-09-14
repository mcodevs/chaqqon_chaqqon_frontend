import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { createTestDependencies } from '@/testing/fakes';
import { createResultService } from './resultService';

describe('resultService', () => {
  it('records a practice result', async () => {
    const service = createResultService(createTestDependencies());
    const result = await service.record({
      studentId: 's1',
      config: DEFAULT_PRACTICE_CONFIG,
      correct: 3,
      total: 5,
      mode: 'practice',
      roomId: null,
    });
    expect(await service.list()).toEqual([result]);
  });

  it('records every participant of a classroom match with one timestamp', async () => {
    const service = createResultService(createTestDependencies());
    const recorded = await service.recordClassroomMatch({
      config: DEFAULT_PRACTICE_CONFIG,
      scores: [
        { studentId: 'a', correct: 4, total: 5 },
        { studentId: 'b', correct: 2, total: 5 },
      ],
    });

    expect(recorded.map((result) => [result.studentId, result.correct, result.mode, result.roomId])).toEqual([
      ['a', 4, 'classroom', null],
      ['b', 2, 'classroom', null],
    ]);
    expect(new Set(recorded.map((result) => result.completedAt)).size).toBe(1);
    expect(await service.list()).toHaveLength(2);
  });

  it.each([1, 5])('refuses a classroom match with %i participants', async (count) => {
    const service = createResultService(createTestDependencies());
    const scores = Array.from({ length: count }, (_, index) => ({
      studentId: `s${index}`,
      correct: 1,
      total: 5,
    }));
    await expect(
      service.recordClassroomMatch({ config: DEFAULT_PRACTICE_CONFIG, scores }),
    ).rejects.toMatchObject({ code: 'CLASSROOM_SIZE' });
  });
});
