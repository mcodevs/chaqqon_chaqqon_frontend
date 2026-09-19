import type { CalendarDate, Payment } from '@/domain/billing';
import type { Room, RoomProgress } from '@/domain/competition';
import type { MarketItem, MarketOrder, OrderStatus } from '@/domain/market';
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

import type { HomeworkStatus, WrittenHomework } from '@/domain/homework';

export type NewStudent = Omit<StudentAccount, 'id'>;

export interface StudentRepository {
  list(): Promise<Student[]>;
  /** Teacher-only view that includes usernames. */
  listAccounts(): Promise<StudentAccount[]>;
  /** Throws `AppError('USERNAME_TAKEN')` when the username already exists. */
  create(student: NewStudent, password: string): Promise<StudentAccount>;
  setPassword(id: string, password: string): Promise<void>;
  updateProfile(
    id: string,
    updates: Partial<Pick<Student, 'birthYear' | 'levelGroup' | 'avatarUrl' | 'lastActiveAt'>>,
  ): Promise<void>;
  touchActive(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface HomeworkRepository {
  list(): Promise<WrittenHomework[]>;
  setStatus(studentId: string, date: string, status: HomeworkStatus, notes?: string): Promise<WrittenHomework>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface StorageGateway {
  uploadAvatar(file: Blob, studentId: string): Promise<string>;
}

export interface ResultRepository {
  list(): Promise<PracticeResult[]>;
  /** Saves the results together; a classroom match records every participant at once. */
  add(results: readonly PracticeResult[]): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface RoomRepository {
  /** Returns all unfinished (waiting or running) rooms, newest first. */
  listActive(): Promise<Room[]>;
  getById(id: string): Promise<Room | null>;
  save(room: Room): Promise<void>;
  listProgress(roomId: string): Promise<RoomProgress[]>;
  saveProgress(progress: RoomProgress): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface PaymentRepository {
  /** Oldest first. The teacher gets every payment, a student only their own. */
  list(): Promise<Payment[]>;
  /**
   * Opens the student until `paidUntil`. The backend checks the day against its own clock:
   * `AppError('INVALID_PAID_UNTIL')` when it is out of range, `AppError('STUDENT_NOT_FOUND')` for an unknown id.
   */
  record(studentId: string, paidUntil: CalendarDate): Promise<Payment>;
  remove(paymentId: string): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface MarketRepository {
  listItems(): Promise<MarketItem[]>;
  saveItem(item: MarketItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  listOrders(): Promise<MarketOrder[]>;
  createOrder(order: MarketOrder): Promise<void>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

/** Everything a backend has to provide. */
export interface Ports {
  auth: AuthGateway;
  students: StudentRepository;
  results: ResultRepository;
  rooms: RoomRepository;
  payments: PaymentRepository;
  market: MarketRepository;
  homework: HomeworkRepository;
  storage: StorageGateway;
}

export interface Clock {
  now(): Date;
}

export type IdGenerator = () => string;
