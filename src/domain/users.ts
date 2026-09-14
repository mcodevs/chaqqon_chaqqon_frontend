/** What classmates may see about a student (leaderboard, competition). */
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
}

/** A student together with the login the teacher hands out. Only the teacher sees this. */
export interface StudentAccount extends Student {
  username: string;
}

export const MIN_PASSWORD_LENGTH = 4;
export const AGE_RANGE = { min: 3, max: 99 } as const;

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/** Usernames are case-insensitive; they are compared and stored in this form. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function isValidAge(age: number | null): boolean {
  return age === null || (Number.isInteger(age) && age >= AGE_RANGE.min && age <= AGE_RANGE.max);
}

export function fullName(student: Pick<Student, 'firstName' | 'lastName'>): string {
  return [student.firstName, student.lastName].filter(Boolean).join(' ');
}
