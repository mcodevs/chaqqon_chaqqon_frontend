import type { ApplicationInput, ApplicationStatus, TeacherApplication } from '@/domain/applications';
import type { CalendarDate, Payment } from '@/domain/billing';
import type { Room, RoomProgress } from '@/domain/competition';
import type { MarketItem, MarketOrder, OrderStatus, StarAward } from '@/domain/market';
import type { DateRange, TeacherOverview } from '@/domain/platformStats';
import type { PracticeResult } from '@/domain/results';
import type { Feature, LedgerEntry, LedgerKind, Tariff } from '@/domain/teacherBilling';
import type { Student, StudentAccount } from '@/domain/users';
import type { LoginRole, Session } from './session';

export type Unsubscribe = () => void;
export type ChangeListener = () => void;

export interface Credentials {
  /** Already normalized with `normalizeUsername`. */
  username: string;
  password: string;
}

/** Identity provider. It owns passwords and sessions, so the rest of the app never handles them. */
export interface AuthGateway {
  /**
   * True while the backend has no superadmin yet and the first one is created in the app. Only the
   * browser-only backend does that; on Supabase the admin account is set up by hand.
   */
  needsSetup(): Promise<boolean>;
  /** Creates the first superadmin and signs it in. Throws `AppError('ALREADY_SET_UP')`. */
  setUpAdmin(credentials: Credentials): Promise<Session>;
  /** Resolves null when no account with this role matches. The teacher form also signs the superadmin in. */
  signIn(role: LoginRole, credentials: Credentials): Promise<Session | null>;
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
    updates: Partial<
      Pick<Student, 'firstName' | 'lastName' | 'birthYear' | 'levelGroup' | 'avatarUrl' | 'lastActiveAt'>
    >,
  ): Promise<void>;
  touchActive(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface HomeworkRepository {
  list(): Promise<WrittenHomework[]>;
  setStatus(
    studentId: string,
    date: string,
    status: HomeworkStatus,
    notes?: string,
  ): Promise<WrittenHomework>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface StorageGateway {
  /** Stored under the uploader's own id: a student's own picture, or one the teacher picks for a student. */
  uploadAvatar(file: Blob): Promise<string>;
  /** A photo of the real gift the teacher is putting in the shop. */
  uploadMarketImage(file: Blob): Promise<string>;
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
  /**
   * The signed-in student buys an item: stock and stars are checked and taken in one step.
   * Throws `AppError('ITEM_NOT_FOUND' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STARS' | 'FEATURE_DISABLED')`.
   */
  placeOrder(itemId: string): Promise<void>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  /** The star ledger. The app only ever reads it; the backend is what writes a star. */
  listAwards(): Promise<StarAward[]>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

/**
 * Optional Telegram Mini App bridge. Outside Telegram (a normal browser) it is
 * simply unavailable and the app behaves exactly as before. When available, the
 * signed-in account is linked to this device's Telegram chat so it can receive
 * push notifications; logging out unlinks it.
 */
export interface TelegramGateway {
  /** True only when the app runs inside the Telegram Mini App container. */
  isAvailable(): boolean;
  /** Links the current session's account to this Telegram chat. Safe to call repeatedly. */
  link(): Promise<void>;
  /** Unlinks this device's Telegram chat from the account. Call before signing out. */
  unlink(): Promise<void>;
}

/** The signed-in teacher's own account as the platform keeps it. */
export interface TeacherAccount {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
  billingStartsOn: CalendarDate | null;
  disabledAt: string | null;
  tariff: Tariff;
  studentCount: number;
  ledger: LedgerEntry[];
}

export interface TeacherProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
}

/** What a student shows of their teacher (and a teacher of themselves). */
export interface TeacherCard {
  firstName: string;
  lastName: string;
  centerName: string;
  phone: string;
}

/** What the signed-in user may see of their own platform account. */
export interface AccountRepository {
  /** Teacher only. Any monthly fee that fell due is taken first. */
  myTeacherAccount(): Promise<TeacherAccount>;
  updateMyTeacherProfile(profile: TeacherProfileInput): Promise<void>;
  /** The sections open to the user: a teacher's tariff, a student's teacher's, all for the admin. */
  myFeatures(): Promise<Feature[]>;
  /** The caller's teacher (or themselves for a teacher); null for the admin. */
  myTeacherCard(): Promise<TeacherCard | null>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export type TariffInput = Omit<Tariff, 'id' | 'archivedAt'> & { archived: boolean };

export interface TariffRepository {
  /** What the landing page offers; guests may read it. */
  listOffered(): Promise<Tariff[]>;
  /** Superadmin: every tariff, archived ones too. */
  listAll(): Promise<Tariff[]>;
  create(input: TariffInput): Promise<void>;
  update(id: string, input: TariffInput): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export interface NewTeacher {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
  tariffId: string;
  billingStartsOn: CalendarDate | null;
  /** A welcome credit in so'm, e.g. a free first month; 0 for none. */
  bonus: number;
}

export interface TeacherUpdate extends TeacherProfileInput {
  tariffId: string;
  billingStartsOn: CalendarDate | null;
  disabled: boolean;
}

/** The superadmin's tools. */
export interface AdminRepository {
  /** Every teacher with their class counted for the period (no student is named). */
  listTeachers(range: DateRange): Promise<TeacherOverview[]>;
  /** Every teacher's ledger, oldest first, with fees that fell due already taken. */
  listLedger(): Promise<LedgerEntry[]>;
  recordLedgerEntry(
    teacherId: string,
    kind: Exclude<LedgerKind, 'charge'>,
    amount: number,
    note: string,
  ): Promise<void>;
  /** Throws `AppError('USERNAME_TAKEN' | 'TARIFF_NOT_FOUND')`. */
  createTeacher(teacher: NewTeacher): Promise<{ id: string }>;
  setTeacherPassword(teacherId: string, password: string): Promise<void>;
  /** Throws `AppError('BILLING_STARTED')` when the first billing day moves after a fee was taken. */
  updateTeacher(teacherId: string, update: TeacherUpdate): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

/** How teachers reach the admin to pay. */
export interface PlatformSettings {
  contactPhone: string;
  contactTelegram: string;
}

export interface PlatformSettingsRepository {
  get(): Promise<PlatformSettings>;
  save(settings: PlatformSettings): Promise<void>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

/** Teachers' applications from the landing page. */
export interface ApplicationRepository {
  /** Anyone may apply. Throws `AppError('TOO_MANY_APPLICATIONS' | 'INVALID_APPLICATION')`. */
  submit(application: ApplicationInput): Promise<void>;
  /** Superadmin: every application, newest first. */
  list(): Promise<TeacherApplication[]>;
  update(id: string, changes: { status: ApplicationStatus; teacherId?: string | null; adminNote?: string }): Promise<void>;
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
  account: AccountRepository;
  tariffs: TariffRepository;
  admin: AdminRepository;
  settings: PlatformSettingsRepository;
  applications: ApplicationRepository;
  storage: StorageGateway;
  telegram: TelegramGateway;
}

export interface Clock {
  now(): Date;
}

export type IdGenerator = () => string;
