import { describe, expect, it } from 'vitest';
import { DUEL_IDLE_MS } from '@/domain/duel';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { TEST_TEACHER_ID, createTestDependencies } from '@/testing/fakes';
import { createDuelService } from './duelService';

const CONFIG = DEFAULT_PRACTICE_CONFIG;
const ROUNDS = CONFIG.problemCount;

async function setup() {
  const dependencies = await createTestDependencies();
  await dependencies.enrol('ali', 'vali', 'guli');

  let now = new Date('2026-10-16T10:00:00.000Z');
  const service = createDuelService({
    duels: dependencies.duels,
    generateId: dependencies.generateId,
    clock: { now: () => now },
    random: dependencies.random,
  });

  const signInAs = (studentId: string) =>
    dependencies.signInAs({ role: 'student', studentId, teacherId: TEST_TEACHER_ID });
  signInAs('ali');

  return {
    ...dependencies,
    service,
    signInAs,
    wait: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
    openDuel: (guestIds = ['vali']) =>
      service.open({
        hostId: 'ali',
        guestIds,
        configs: Object.fromEntries(['ali', ...guestIds].map((id) => [id, CONFIG])),
        sameConfig: true,
      }),
  };
}

describe('a duel from the lobby to the places', () => {
  it('is hosted by one student, joined by another and driven round by round', async () => {
    const { service, signInAs, openDuel, results } = await setup();
    const duel = await openDuel();

    // The host is in it from the start, without joining.
    const hostInbox = await service.getInbox('ali');
    expect(hostInbox.active?.duel.status).toBe('lobby');
    expect(hostInbox.active?.participants.map((p) => p.studentId)).toEqual(['ali']);

    signInAs('vali');
    const guestInbox = await service.getInbox('vali');
    expect(guestInbox.active).toBeNull();
    expect(guestInbox.invites.map((invite) => invite.duel.id)).toEqual([duel.id]);

    await service.join(duel.id, 'vali');
    expect((await service.getInbox('vali')).active?.participants).toHaveLength(2);

    signInAs('ali');
    await service.start(duel.id);
    expect((await service.getInbox('ali')).active?.duel).toMatchObject({ status: 'running', round: 0 });

    // Each player writes only their own row, so two phones never overwrite each other.
    await service.reportProgress(duel.id, 'ali', { answered: 1, correct: 1, answerMs: 4_000 });
    signInAs('vali');
    await service.reportProgress(duel.id, 'vali', { answered: 1, correct: 0, answerMs: 9_000 });

    signInAs('ali');
    for (let round = 1; round < ROUNDS; round += 1) {
      await service.nextRound(duel.id);
    }
    await service.reportProgress(duel.id, 'ali', { answered: ROUNDS, correct: 4, answerMs: 20_000 });

    // The last "next" has nothing left to show, so it closes the duel and records the scores.
    await service.nextRound(duel.id);
    const finished = await service.getInbox('ali');
    expect(finished.active?.duel.status).toBe('finished');

    const recorded = await results.list();
    expect(recorded.filter((result) => result.mode === 'duel')).toEqual([
      expect.objectContaining({ studentId: 'ali', correct: 4, total: ROUNDS, mode: 'duel', roomId: null }),
      expect.objectContaining({ studentId: 'vali', correct: 0, total: 1, mode: 'duel' }),
    ]);
  });

  it('pays no star, however well it went', async () => {
    const { service, signInAs, openDuel, market } = await setup();
    const duel = await openDuel();
    signInAs('vali');
    await service.join(duel.id, 'vali');

    signInAs('ali');
    await service.start(duel.id);
    await service.reportProgress(duel.id, 'ali', { answered: ROUNDS, correct: ROUNDS, answerMs: 1_000 });
    await service.finish(duel.id);

    expect(await market.listAwards()).toEqual([]);
  });

  it('closes early with what was played so far', async () => {
    const { service, signInAs, openDuel, results } = await setup();
    const duel = await openDuel();
    signInAs('vali');
    await service.join(duel.id, 'vali');

    signInAs('ali');
    await service.start(duel.id);
    await service.reportProgress(duel.id, 'ali', { answered: 2, correct: 2, answerMs: 3_000 });
    await service.finish(duel.id);

    const recorded = await results.list();
    expect(recorded).toEqual([
      expect.objectContaining({ studentId: 'ali', correct: 2, total: 2, mode: 'duel' }),
    ]);
  });
});

describe('who may do what to a duel', () => {
  it('lets only the host drive it', async () => {
    const { service, signInAs, openDuel } = await setup();
    const duel = await openDuel();
    signInAs('vali');
    await service.join(duel.id, 'vali');

    await expect(service.start(duel.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    signInAs('ali');
    await service.start(duel.id);
    signInAs('vali');
    await expect(service.nextRound(duel.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('closes the lobby once the duel has started', async () => {
    const { service, signInAs, openDuel } = await setup();
    const duel = await openDuel(['vali', 'guli']);
    signInAs('vali');
    await service.join(duel.id, 'vali');

    signInAs('ali');
    await service.start(duel.id);
    signInAs('guli');
    await expect(service.join(duel.id, 'guli')).rejects.toMatchObject({ code: 'DUEL_CLOSED' });
  });

  it('needs the host plus at least one classmate, and takes at most eight players', async () => {
    const { openDuel } = await setup();
    await expect(openDuel([])).rejects.toMatchObject({ code: 'DUEL_SIZE' });
    await expect(openDuel(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).rejects.toMatchObject({
      code: 'DUEL_SIZE',
    });
  });

  it('invites classmates only', async () => {
    const { service } = await setup();
    await expect(
      service.open({
        hostId: 'ali',
        guestIds: ['someone-elses-student'],
        configs: { ali: CONFIG, 'someone-elses-student': CONFIG },
        sameConfig: true,
      }),
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });
});

describe('a duel nobody comes back to', () => {
  it('is closed by whoever opens the page next, keeping the rounds played', async () => {
    const { service, signInAs, openDuel, wait, results } = await setup();
    const duel = await openDuel();
    signInAs('vali');
    await service.join(duel.id, 'vali');
    signInAs('ali');
    await service.start(duel.id);
    await service.reportProgress(duel.id, 'ali', { answered: 3, correct: 1, answerMs: 8_000 });

    // The host walks away mid-match; the guest opens their page a quarter of an hour later.
    wait(DUEL_IDLE_MS + 1_000);
    signInAs('vali');
    const inbox = await service.getInbox('vali');

    expect(inbox.active?.duel.status).toBe('finished');
    expect(await results.list()).toEqual([
      expect.objectContaining({ studentId: 'ali', correct: 1, total: 3, mode: 'duel' }),
    ]);
  });
});
