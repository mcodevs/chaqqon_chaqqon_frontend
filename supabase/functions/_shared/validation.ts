/*
 * Server-side input rules. They mirror src/domain/users.ts on purpose:
 * an Edge Function must never rely on the client's validation.
 */

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD_LENGTH = 4;
/** Teachers manage a whole class, so their password is a little longer than a child's PIN. */
export const MIN_TEACHER_PASSWORD_LENGTH = 6;
const MAX_PHONE_LENGTH = 30;
const MAX_CENTER_LENGTH = 100;
const MAX_AMOUNT = 1_000_000_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LENGTH = 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function readPassword(value: unknown, minLength = MIN_PASSWORD_LENGTH): string | null {
  return typeof value === 'string' && value.length >= minLength ? value : null;
}

/** Optional free text up to a length; missing means empty. */
export function readText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length <= maxLength ? text : null;
}

export const readPhone = (value: unknown) => readText(value, MAX_PHONE_LENGTH);
export const readCenterName = (value: unknown) => readText(value, MAX_CENTER_LENGTH);

/** A real 'YYYY-MM-DD' day, or null for "not set"; undefined when the value is malformed. */
export function readOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value ? value : undefined;
}

/** A whole, non-negative amount of so'm; missing means zero. */
export function readAmount(value: unknown): number | null {
  if (value === undefined || value === null) return 0;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_AMOUNT ? value : null;
}

export function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length <= MAX_NAME_LENGTH ? name : null;
}

export function readId(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
}
