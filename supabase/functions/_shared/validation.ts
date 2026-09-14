/*
 * Server-side input rules. They mirror src/domain/users.ts on purpose:
 * an Edge Function must never rely on the client's validation.
 */

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD_LENGTH = 4;
const AGE_RANGE = { min: 3, max: 99 };
const MAX_NAME_LENGTH = 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function readPassword(value: unknown): string | null {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH ? value : null;
}

export function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length <= MAX_NAME_LENGTH ? name : null;
}

export type AgeInput = { valid: true; age: number | null } | { valid: false };

export function readAge(value: unknown): AgeInput {
  if (value === null || value === undefined) return { valid: true, age: null };
  const valid =
    typeof value === 'number' && Number.isInteger(value) && value >= AGE_RANGE.min && value <= AGE_RANGE.max;
  return valid ? { valid: true, age: value } : { valid: false };
}

export function readId(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
}
