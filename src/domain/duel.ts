import { type PracticeConfig, normalizePracticeConfig } from './practice/config';
import { generateDrillProblems } from './practice/drills';
import type { Problem } from './practice/problem';
import type { Random } from './random';

/*
 * A duel — "bellashuv" — is the competition the children run themselves. One of them hosts it from
 * their own phone: they pick classmates, choose the settings, and from then on decide when the next
 * problem starts. Everyone plays on their own device, so the numbers flash everywhere at once and
 * the host watches the answers land before moving on.
 *
 * It drills nothing the practice page does not, and nobody supervises it, so it pays no stars and
 * stays out of the class ranking (`computeLeaderboard` drops its results). What it does leave is a
 * record: the standings are kept, and both the children and their teacher can look them up.
 */

/** The host counts as one of them, so a duel is the host plus at least one classmate. */
export const DUEL_PARTICIPANTS = { min: 2, max: 8 } as const;

/**
 * A duel nobody has moved on for this long is over: the host closed the tab, lost the network or
 * simply walked away. Whoever notices first closes it, and the scores played so far are kept.
 */
export const DUEL_IDLE_MS = 15 * 60 * 1000;

export type DuelStatus = 'lobby' | 'running' | 'finished';

export interface Duel {
  id: string;
  /** The student who opened it: its admin and a participant at the same time. */
  hostId: string;
  status: DuelStatus;
  /** Who may see it and join, the host included. */
  invitedIds: string[];
  /** Settings per invited student. The drill and the round count are the same for everyone. */
  configs: Record<string, PracticeConfig>;
  /** The problems each participant gets, drawn when the duel is opened. */
  problems: Record<string, Problem[]>;
  /** True when everyone plays the same settings, and therefore the very same numbers. */
  sameConfig: boolean;
  roundCount: number;
  /** The problem everyone is on. It moves only when the host says so. */
  round: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** When the duel last moved; it decides when an abandoned one times out. */
  updatedAt: string;
}

/** One player's row. Stored per student, so two devices writing at once never overwrite each other. */
export interface DuelParticipant {
  duelId: string;
  studentId: string;
  joinedAt: string;
  /** Rounds reached — answered or missed because the host moved on. */
  answered: number;
  correct: number;
  /** Time spent typing answers, in milliseconds. It breaks a tie between equal scores. */
  answerMs: number;
}

export interface DuelStanding extends DuelParticipant {
  /** 1-based; two players with the same score and the same time share a place. */
  place: number;
}

export function isValidDuelSize(count: number): boolean {
  return count >= DUEL_PARTICIPANTS.min && count <= DUEL_PARTICIPANTS.max;
}

export function emptyDuelParticipant(duelId: string, studentId: string, joinedAt: string): DuelParticipant {
  return { duelId, studentId, joinedAt, answered: 0, correct: 0, answerMs: 0 };
}

/**
 * Ranks by correct answers, and between equal scores by the time spent answering — everyone types
 * on their own device, so speed is measured here and can settle a draw. A score of zero is never
 * split by time: being quick about answering nothing is not a better result.
 */
export function rankDuel(participants: readonly DuelParticipant[]): DuelStanding[] {
  const beats = (a: DuelParticipant, b: DuelParticipant) =>
    a.correct > b.correct || (a.correct === b.correct && a.correct > 0 && a.answerMs < b.answerMs);

  return participants
    .map((participant) => ({
      ...participant,
      place: 1 + participants.filter((other) => beats(other, participant)).length,
    }))
    .sort((a, b) => a.place - b.place);
}

/** True once the duel has been left alone for `DUEL_IDLE_MS`; a finished one never goes stale. */
export function isDuelStale(duel: Duel, now: Date): boolean {
  if (duel.status === 'finished') return false;
  return now.getTime() - new Date(duel.updatedAt).getTime() > DUEL_IDLE_MS;
}

/** True when this player has already answered (or missed) the round the duel is on. */
export function hasAnsweredRound(participant: DuelParticipant, duel: Duel): boolean {
  return participant.answered > duel.round;
}

/**
 * Brings every player's settings in step. The rounds are driven together, so the drill and the
 * number of problems have to match; the difficulty — section, digits, rows, speed — may differ per
 * child, which is the point of setting them one by one.
 */
export function alignDuelConfigs(
  configs: Record<string, PracticeConfig>,
  shared: Pick<PracticeConfig, 'kind' | 'problemCount'>,
): Record<string, PracticeConfig> {
  return Object.fromEntries(
    Object.entries(configs).map(([id, config]) => [
      id,
      normalizePracticeConfig({ ...config, kind: shared.kind, problemCount: shared.problemCount }),
    ]),
  );
}

/**
 * The numbers every participant will see. With one shared setting everyone gets the same problems,
 * so the duel is a straight race; with settings of their own, each child gets their own draw.
 */
export function generateDuelProblems(
  configs: Record<string, PracticeConfig>,
  sameConfig: boolean,
  random: Random,
): Record<string, Problem[]> {
  const ids = Object.keys(configs);
  if (sameConfig && ids.length > 0) {
    const shared = generateDrillProblems(configs[ids[0]], random);
    return Object.fromEntries(ids.map((id) => [id, shared]));
  }
  return Object.fromEntries(ids.map((id) => [id, generateDrillProblems(configs[id], random)]));
}
