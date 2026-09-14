import { describe, expect, it } from 'vitest';
import { fullName, isValidAge, isValidUsername, normalizeUsername } from './users';

describe('users', () => {
  it('normalizes usernames to trimmed lower case', () => {
    expect(normalizeUsername('  Ali10 ')).toBe('ali10');
  });

  it.each([
    ['ali10', true],
    ['Ali.Valiyev', true],
    ['mohira_ustoz-1', true],
    ['ab', false],
    ['ali 10', false],
    ["g'ayrat", false],
    ['алишер', false],
    ['a'.repeat(31), false],
  ])('validates username %s → %s', (username, valid) => {
    expect(isValidUsername(username)).toBe(valid);
  });

  it.each([
    [null, true],
    [8, true],
    [2, false],
    [100, false],
    [7.5, false],
  ])('validates age %s → %s', (age, valid) => {
    expect(isValidAge(age)).toBe(valid);
  });

  it('joins first and last name, skipping blanks', () => {
    expect(fullName({ firstName: 'Ali', lastName: 'Valiyev' })).toBe('Ali Valiyev');
    expect(fullName({ firstName: 'Ali', lastName: '' })).toBe('Ali');
  });
});
