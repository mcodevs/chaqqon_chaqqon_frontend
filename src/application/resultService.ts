import { type LaneScore, isValidClassroomSize } from '@/domain/classroom';
import type { PracticeConfig } from '@/domain/practice/config';
import type { PracticeResult } from '@/domain/results';
import { AppError } from './errors';
import type { ChangeListener, Clock, IdGenerator, ResultRepository, Unsubscribe } from './ports';

interface ResultDependencies {
  results: ResultRepository;
  generateId: IdGenerator;
  clock: Clock;
}

export type RecordResultInput = Omit<PracticeResult, 'id' | 'completedAt'>;

export interface ClassroomMatchInput {
  config: PracticeConfig;
  scores: readonly LaneScore[];
}

export function createResultService({ results, generateId, clock }: ResultDependencies) {
  return {
    list: (): Promise<PracticeResult[]> => results.list(),

    subscribe: (listener: ChangeListener): Unsubscribe => results.subscribe(listener),

    async record(input: RecordResultInput): Promise<PracticeResult> {
      const result: PracticeResult = { ...input, id: generateId(), completedAt: clock.now().toISOString() };
      await results.add([result]);
      return result;
    },

    /** Records every participant of a split-screen classroom match in one go. */
    async recordClassroomMatch({ config, scores }: ClassroomMatchInput): Promise<PracticeResult[]> {
      if (!isValidClassroomSize(scores.length)) throw new AppError('CLASSROOM_SIZE');

      const completedAt = clock.now().toISOString();
      const recorded = scores.map((score): PracticeResult => ({
        id: generateId(),
        studentId: score.studentId,
        completedAt,
        config,
        correct: score.correct,
        total: score.total,
        mode: 'classroom',
        roomId: null,
      }));
      await results.add(recorded);
      return recorded;
    },
  };
}

export type ResultService = ReturnType<typeof createResultService>;
