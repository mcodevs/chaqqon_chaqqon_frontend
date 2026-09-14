import type { Room, RoomProgress } from '@/domain/competition';
import type { PracticeResult } from '@/domain/results';
import type { Student, StudentAccount } from '@/domain/users';
import type { Role, Session } from './session';

export type Unsubscribe = () => void;
export type ChangeListener = () => void;

export interface Credentials {
  /** Already normalized with `normalizeUsername`. */
  username: string;
  password: string;
}

/** Identity provider. It owns passwords and sessions, so the rest of the app never handles them. */
export interface AuthGateway {
  hasTeacher(): Promise<boolean>;
  /** Creates the single teacher account and signs it in. Throws `AppError('TEACHER_EXISTS')`. */
  registerTeacher(credentials: Credentials): Promise<Session>;
  /** Resolves null when no account with this role matches the credentials. */
  signIn(role: Role, credentials: Credentials): Promise<Session | null>;
  signOut(): Promise<void>;
  /** The session kept from an earlier visit, if it is still valid. */
  restoreSession(): Promise<Session | null>;
  /** Fires when the session ends outside the app's control, e.g. it expired or was revoked. */
  onSessionEnded(listener: ChangeListener): Unsubscribe;
}

export type NewStudent = Omit<StudentAccount, 'id'>;

export interface StudentRepository {
  list(): Promise<Student[]>;
  /** Teacher-only view that includes usernames. */
  listAccounts(): Promise<StudentAccount[]>;
  /** Throws `AppError('USERNAME_TAKEN')` when the username already exists. */
  create(student: NewStudent, password: string): Promise<StudentAccount>;
  setPassword(id: string, password: string): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface ResultRepository {
  list(): Promise<PracticeResult[]>;
  /** Saves the results together; a classroom match records every participant at once. */
  add(results: readonly PracticeResult[]): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface RoomRepository {
  getCurrent(): Promise<Room | null>;
  /** Throws `AppError('ROOM_ACTIVE')` when saving a second unfinished room. */
  saveCurrent(room: Room): Promise<void>;
  listProgress(roomId: string): Promise<RoomProgress[]>;
  saveProgress(progress: RoomProgress): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

/** Everything a backend has to provide. */
export interface Ports {
  auth: AuthGateway;
  students: StudentRepository;
  results: ResultRepository;
  rooms: RoomRepository;
}

export interface Clock {
  now(): Date;
}

export type IdGenerator = () => string;
