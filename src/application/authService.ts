import { MIN_PASSWORD_LENGTH, isValidUsername, normalizeUsername } from '@/domain/users';
import { AppError } from './errors';
import type { AuthGateway, ChangeListener, Unsubscribe } from './ports';
import type { Role, Session } from './session';

interface AuthDependencies {
  gateway: AuthGateway;
}

export interface RegisterTeacherInput {
  username: string;
  password: string;
  passwordConfirmation: string;
}

export interface LoginInput {
  role: Role;
  username: string;
  password: string;
}

export function createAuthService({ gateway }: AuthDependencies) {
  return {
    hasTeacher: (): Promise<boolean> => gateway.hasTeacher(),

    async registerTeacher({
      username,
      password,
      passwordConfirmation,
    }: RegisterTeacherInput): Promise<Session> {
      const normalizedUsername = normalizeUsername(username);
      if (!normalizedUsername) throw new AppError('USERNAME_REQUIRED');
      if (!isValidUsername(normalizedUsername)) throw new AppError('INVALID_USERNAME');
      if (password.length < MIN_PASSWORD_LENGTH) throw new AppError('PASSWORD_TOO_SHORT');
      if (password !== passwordConfirmation) throw new AppError('PASSWORDS_MISMATCH');

      return gateway.registerTeacher({ username: normalizedUsername, password });
    },

    async login({ role, username, password }: LoginInput): Promise<Session> {
      const normalizedUsername = normalizeUsername(username);
      if (!normalizedUsername || !password) throw new AppError('CREDENTIALS_REQUIRED');

      const session = await gateway.signIn(role, { username: normalizedUsername, password });
      if (!session) throw new AppError('INVALID_CREDENTIALS');
      return session;
    },

    logout: (): Promise<void> => gateway.signOut(),

    restoreSession: (): Promise<Session | null> => gateway.restoreSession(),

    onSessionEnded: (listener: ChangeListener): Unsubscribe => gateway.onSessionEnded(listener),
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
