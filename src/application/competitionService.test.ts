import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { createCompetitionService } from './competitionService';
import { createTestDependencies } from '@/testing/fakes';

const configsFor = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, DEFAULT_PRACTICE_CONFIG]));

function setup() {
  return createCompetitionService(createTestDependencies());
}

describe('competitionService', () => {
  it('runs a room from opening to closing', async () => {
    const service = setup();
    const room = await service.open({ participantIds: ['a', 'b'], configs: configsFor(['a', 'b']) });

    let snapshot = await service.getSnapshot();
    expect(snapshot.room?.status).toBe('waiting');
    expect(snapshot.progress.a).toMatchObject({ answered: 0, total: DEFAULT_PRACTICE_CONFIG.problemCount });

    await expect(
      service.reportProgress(room.id, 'a', { answered: 1, correct: 1, finished: false }),
    ).rejects.toMatchObject({ code: 'ROOM_NOT_RUNNING' });

    await service.start(room.id);
    await service.reportProgress(room.id, 'a', { answered: 2, correct: 1, finished: false });
    await service.reportProgress(room.id, 'b', { answered: 5, correct: 5, finished: true });

    snapshot = await service.getSnapshot();
    expect(snapshot.room?.status).toBe('running');
    expect(snapshot.progress.a).toMatchObject({ answered: 2, correct: 1, finished: false });
    expect(snapshot.progress.b).toMatchObject({ answered: 5, correct: 5, finished: true });

    await service.close(room.id);
    expect(await service.getSnapshot()).toEqual({ room: null, progress: {} });
  });

  it('allows only one active room', async () => {
    const service = setup();
    await service.open({ participantIds: ['a'], configs: configsFor(['a']) });
    await expect(service.open({ participantIds: ['b'], configs: configsFor(['b']) })).rejects.toMatchObject({
      code: 'ROOM_ACTIVE',
    });
  });

  it('validates participant count', async () => {
    const service = setup();
    await expect(service.open({ participantIds: [], configs: {} })).rejects.toMatchObject({
      code: 'ROOM_EMPTY',
    });

    const ids = ['1', '2', '3', '4', '5', '6'];
    await expect(service.open({ participantIds: ids, configs: configsFor(ids) })).rejects.toMatchObject({
      code: 'ROOM_TOO_LARGE',
    });
  });

  it('rejects progress from students outside the room', async () => {
    const service = setup();
    const room = await service.open({ participantIds: ['a'], configs: configsFor(['a']) });
    await service.start(room.id);
    await expect(
      service.reportProgress(room.id, 'z', { answered: 1, correct: 0, finished: false }),
    ).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
    });
  });
});
