import { describe, expect, it } from 'vitest';
import { resolvePracticeMode } from './results';

describe('resolvePracticeMode', () => {
  it('keeps a known mode', () => {
    expect(resolvePracticeMode('classroom', null)).toBe('classroom');
  });

  it('infers the mode of results saved before modes existed', () => {
    expect(resolvePracticeMode(undefined, 'room-1')).toBe('online');
    expect(resolvePracticeMode('unknown', null)).toBe('practice');
  });
});
