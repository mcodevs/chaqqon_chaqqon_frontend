import { type Random, randomInt } from '@/domain/random';
import {
  MIN_PASSWORD_LENGTH,
  type Student,
  type StudentAccount,
  isValidAge,
  isValidUsername,
  normalizeUsername,
} from '@/domain/users';
import { AppError } from './errors';
import type { ChangeListener, StudentRepository, Unsubscribe } from './ports';

interface StudentDependencies {
  students: StudentRepository;
  random: Random;
}

import type { LevelGroup } from '@/domain/users';

export interface StudentCredentials {
  username: string;
  password: string;
}

export interface NewStudentInput extends StudentCredentials {
  firstName: string;
  lastName: string;
  age: number | null;
  birthYear?: number | null;
  levelGroup?: LevelGroup;
}

export interface CreatedStudent {
  student: StudentAccount;
  credentials: StudentCredentials;
}

const MAX_SUGGESTED_SLUG_LENGTH = 20;

export function createStudentService({ students, random }: StudentDependencies) {
  const generatePassword = () => String(randomInt(random, 1000, 9999));

  const findAccount = async (id: string): Promise<StudentAccount> => {
    const account = (await students.listAccounts()).find((s) => s.id === id);
    if (!account) throw new AppError('STUDENT_NOT_FOUND');
    return account;
  };

  return {
    list: (): Promise<Student[]> => students.list(),

    listAccounts: (): Promise<StudentAccount[]> => students.listAccounts(),

    subscribe: (listener: ChangeListener): Unsubscribe => students.subscribe(listener),

    suggestCredentials(firstName: string): StudentCredentials {
      const slug =
        normalizeUsername(firstName)
          .replace(/[^a-z0-9]/g, '')
          .slice(0, MAX_SUGGESTED_SLUG_LENGTH) || 'oquvchi';
      return { username: `${slug}${randomInt(random, 10, 99)}`, password: generatePassword() };
    },

    async add(input: NewStudentInput): Promise<CreatedStudent> {
      const firstName = input.firstName.trim();
      const username = normalizeUsername(input.username);
      const password = input.password.trim();

      if (!firstName || !username || !password) throw new AppError('STUDENT_FIELDS_REQUIRED');
      if (!isValidUsername(username)) throw new AppError('INVALID_USERNAME');
      if (password.length < MIN_PASSWORD_LENGTH) throw new AppError('PASSWORD_TOO_SHORT');
      if (!isValidAge(input.age)) throw new AppError('INVALID_AGE');
      if ((await students.listAccounts()).some((s) => s.username === username)) {
        throw new AppError('USERNAME_TAKEN');
      }

      const student = await students.create(
        {
          firstName,
          lastName: input.lastName.trim(),
          age: input.age,
          birthYear: input.birthYear ?? null,
          levelGroup: input.levelGroup ?? 'A',
          username,
        },
        password,
      );
      return { student, credentials: { username, password } };
    },

    /** Passwords are never readable, so the only way to hand one out again is to issue a new one. */
    async resetPassword(id: string): Promise<StudentCredentials> {
      const account = await findAccount(id);
      const password = generatePassword();
      await students.setPassword(id, password);
      return { username: account.username, password };
    },

    updateProfile: (
      id: string,
      updates: Partial<Pick<Student, 'birthYear' | 'levelGroup' | 'avatarUrl' | 'lastActiveAt'>>,
    ) => students.updateProfile(id, updates),

    touchActive: (id: string) => students.touchActive(id),

    remove: (id: string): Promise<void> => students.remove(id),
  };
}

export type StudentService = ReturnType<typeof createStudentService>;
