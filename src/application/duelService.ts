import {
  type Duel,
  type DuelParticipant,
  emptyDuelParticipant,
  alignDuelConfigs,
  generateDuelProblems,
  isDuelStale,
  isValidDuelSize,
} from '@/domain/duel';
import type { PracticeConfig } from '@/domain/practice/config';
import type { Random } from '@/domain/random';
import { AppError } from './errors';
import type { ChangeListener, Clock, DuelRepository, IdGenerator, Unsubscribe } from './ports';

interface DuelDependencies {
  duels: DuelRepository;
  generateId: IdGenerator;
  clock: Clock;
  random: Random;
}

/** How many duels a page looks back over; a class plays a handful a day. */
const RECENT_LIMIT = 60;

export interface DuelSnapshot {
  duel: Duel;
  /** Everyone who has joined, in the order they did. */
  participants: DuelParticipant[];
}

/** What a student's duel page is looking at. */
export interface DuelInbox {
  /** The duel they are in: waiting in its lobby, playing it, or reading its final scores. */
  active: DuelSnapshot | null;
  /** Lobbies they have been invited to and not joined yet. */
  invites: DuelSnapshot[];
}

export interface OpenDuelInput {
  hostId: string;
  /** The classmates the host picked; the host plays too and is added here. */
  guestIds: readonly string[];
  /** Settings per participant. The host's own decide the drill and the round count for all. */
  configs: Record<string, PracticeConfig>;
  /** Whether everyone plays the same settings, and so the same numbers. */
  sameConfig: boolean;
}

export interface DuelProgress {
  /** Rounds reached, answered or missed. */
  answered: number;
  correct: number;
  answerMs: number;
}

export function createDuelService({ duels, generateId, clock, random }: DuelDependencies) {
  const requireDuel = async (duelId: string): Promise<Duel> => {
    const duel = await duels.getById(duelId);
    if (!duel) throw new AppError('DUEL_NOT_FOUND');
    return duel;
  };

  const snapshotsOf = async (duelList: readonly Duel[]): Promise<DuelSnapshot[]> => {
    const participants = await duels.listParticipants(duelList.map((duel) => duel.id));
    return duelList.map((duel) => ({
      duel,
      participants: participants
        .filter((participant) => participant.duelId === duel.id)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
    }));
  };

  const recentSnapshots = async (): Promise<DuelSnapshot[]> =>
    snapshotsOf(await duels.listRecent(RECENT_LIMIT));

  return {
    subscribe: (listener: ChangeListener): Unsubscribe => duels.subscribe(listener),

    /**
     * The signed-in student's duel page in one read. A duel left alone for too long is closed
     * here, by whoever opens the page first, so an abandoned one never hangs on anybody's screen;
     * if another device got there first, the error is simply the duel already being closed.
     */
    async getInbox(studentId: string): Promise<DuelInbox> {
      let snapshots = await recentSnapshots();
      const joined = (snapshot: DuelSnapshot) =>
        snapshot.participants.some((participant) => participant.studentId === studentId);

      const stale = snapshots.find((snapshot) => joined(snapshot) && isDuelStale(snapshot.duel, clock.now()));
      if (stale) {
        try {
          await duels.finish(stale.duel.id);
        } catch {
          // Someone else closed it first; the reload below shows the result either way.
        }
        snapshots = await recentSnapshots();
      }

      return {
        active: snapshots.find(joined) ?? null,
        invites: snapshots.filter(
          (snapshot) =>
            !joined(snapshot) && snapshot.duel.status === 'lobby' && !isDuelStale(snapshot.duel, clock.now()),
        ),
      };
    },

    /** The teacher's record of what their class has been playing, newest first. */
    listClassDuels: (): Promise<DuelSnapshot[]> => recentSnapshots(),

    async open({ hostId, guestIds, configs, sameConfig }: OpenDuelInput): Promise<Duel> {
      const invitedIds = [...new Set([hostId, ...guestIds])];
      if (!isValidDuelSize(invitedIds.length)) throw new AppError('DUEL_SIZE');

      const hostConfig = configs[hostId];
      if (!hostConfig) throw new Error(`Missing practice config for the host ${hostId}`);
      const aligned = alignDuelConfigs(
        Object.fromEntries(invitedIds.map((id) => [id, configs[id] ?? hostConfig])),
        hostConfig,
      );
      const now = clock.now().toISOString();

      const duel: Duel = {
        id: generateId(),
        hostId,
        status: 'lobby',
        invitedIds,
        configs: aligned,
        problems: generateDuelProblems(aligned, sameConfig, random),
        sameConfig,
        roundCount: hostConfig.problemCount,
        round: 0,
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        updatedAt: now,
      };
      await duels.open(duel);
      return duel;
    },

    async join(duelId: string, studentId: string): Promise<void> {
      const duel = await requireDuel(duelId);
      if (duel.status !== 'lobby') throw new AppError('DUEL_CLOSED');
      if (!duel.invitedIds.includes(studentId)) throw new AppError('DUEL_NOT_FOUND');
      await duels.join(emptyDuelParticipant(duelId, studentId, clock.now().toISOString()));
    },

    /** The host starts the first round once enough classmates have joined. */
    async start(duelId: string): Promise<void> {
      const duel = await requireDuel(duelId);
      if (duel.status !== 'lobby') throw new AppError('DUEL_CLOSED');
      const participants = await duels.listParticipants([duelId]);
      if (!isValidDuelSize(participants.length)) throw new AppError('DUEL_SIZE');
      await duels.start(duelId, clock.now().toISOString());
    },

    /**
     * The host moves everyone on. After the last problem there is nothing left to show, so the
     * duel closes itself and its scores are recorded.
     */
    async nextRound(duelId: string): Promise<void> {
      const duel = await requireDuel(duelId);
      if (duel.status !== 'running') throw new AppError('DUEL_NOT_RUNNING');
      if (duel.round + 1 >= duel.roundCount) {
        await duels.finish(duelId);
        return;
      }
      await duels.setRound(duelId, duel.round + 1);
    },

    /** Closing it early keeps what has been played so far. */
    finish: (duelId: string): Promise<void> => duels.finish(duelId),

    async reportProgress(duelId: string, studentId: string, progress: DuelProgress): Promise<void> {
      const duel = await requireDuel(duelId);
      if (duel.status !== 'running') throw new AppError('DUEL_NOT_RUNNING');
      const own = (await duels.listParticipants([duelId])).find((p) => p.studentId === studentId);
      if (!own) throw new AppError('DUEL_NOT_FOUND');
      await duels.saveProgress({ ...own, ...progress });
    },
  };
}

export type DuelService = ReturnType<typeof createDuelService>;
