export type LevelGroup = 'A' | 'B' | 'C' | 'D';
export const LEVEL_GROUPS: readonly LevelGroup[] = ['A', 'B', 'C', 'D'];

export const LEVEL_META: Record<
  LevelGroup,
  { label: string; formula: string; description: string; sectionId: string; tone: 'green' | 'blue' | 'violet' | 'pink' }
> = {
  A: {
    label: 'A toifa',
    formula: 'Formulasiz',
    description: 'Abakusda tosh yetadi',
    sectionId: 'formulasiz',
    tone: 'green',
  },
  B: {
    label: 'B toifa',
    formula: "Kichik do'st",
    description: '5 ichida, +5−x',
    sectionId: 'kichik',
    tone: 'blue',
  },
  C: {
    label: 'C toifa',
    formula: "Katta do'st",
    description: "10 ichida, o'nlikka o'tish",
    sectionId: 'katta',
    tone: 'violet',
  },
  D: {
    label: 'D toifa',
    formula: 'Miks / Oila formulasi',
    description: "Bir necha xonaga o'tish",
    sectionId: 'miks',
    tone: 'pink',
  },
};

/** Order of difficulty for sections/levels: A is 0, B is 1, C is 2, D is 3. */
export const LEVEL_INDEX: Record<LevelGroup, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export const SECTION_TO_LEVEL: Record<string, LevelGroup> = {
  formulasiz: 'A',
  kichik: 'B',
  katta: 'C',
  miks: 'D',
};

/** What classmates may see about a student (leaderboard, competition). */
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  birthYear?: number | null;
  levelGroup?: LevelGroup;
  avatarUrl?: string | null;
  lastActiveAt?: string | null;
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
