import { describe, expect, it } from 'vitest';
import { ageFromBirthYear, fullName, isValidBirthYear, isValidUsername, normalizeUsername } from './users';

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
    [undefined, true],
    [2017, true],
    [1899, false],
    [2101, false],
    [2017.5, false],
  ])('validates birth year %s → %s', (birthYear, valid) => {
    expect(isValidBirthYear(birthYear)).toBe(valid);
  });

  it.each([
    [2017, 2026, 9],
    [2026, 2026, 0],
    [null, 2026, null],
    [undefined, 2026, null],
    // A year in the future is a typo, not a negative age.
    [2030, 2026, null],
  ])('turns birth year %s into an age in %s', (birthYear, currentYear, expected) => {
    expect(ageFromBirthYear(birthYear, currentYear)).toBe(expected);
  });

  it('joins first and last name, skipping blanks', () => {
    expect(fullName({ firstName: 'Ali', lastName: 'Valiyev' })).toBe('Ali Valiyev');
    expect(fullName({ firstName: 'Ali', lastName: '' })).toBe('Ali');
  });
});
