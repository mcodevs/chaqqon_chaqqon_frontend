/** A split-screen classroom match: one shared screen, one panel per student. */
export const CLASSROOM_PARTICIPANTS = { min: 2, max: 4 } as const;

export interface LaneScore {
  studentId: string;
  correct: number;
  total: number;
}

export interface RankedScore extends LaneScore {
  /** 1-based; students with the same score share a place (1, 2, 2, 4). */
  place: number;
}

export function isValidClassroomSize(count: number): boolean {
  return count >= CLASSROOM_PARTICIPANTS.min && count <= CLASSROOM_PARTICIPANTS.max;
}

/**
 * Ranks by correct answers. The teacher types the answers, so answer speed is not
 * measured and ties are not broken.
 */
export function rankScores(scores: readonly LaneScore[]): RankedScore[] {
  return scores
    .map((score) => ({
      ...score,
      place: 1 + scores.filter((other) => other.correct > score.correct).length,
    }))
    .sort((a, b) => a.place - b.place);
}
