import type { CalendarDate } from './billing';
import { schoolDate } from './billing';

/**
 * A teacher's application from the landing page. Name and phone are required; everything else
 * helps the superadmin prepare the call. The rules mirror submit_teacher_application() in SQL.
 */

export type ApplicationStatus = 'new' | 'contacted' | 'approved' | 'rejected';

export interface TeacherApplication {
  id: string;
  fullName: string;
  phone: string;
  studentsCount: number | null;
  telegramUsername: string;
  city: string;
  centerName: string;
  heardFrom: string;
  tariffId: string | null;
  note: string;
  status: ApplicationStatus;
  teacherId: string | null;
  adminNote: string;
  createdAt: string;
}

export type ApplicationInput = Pick<
  TeacherApplication,
  | 'fullName'
  | 'phone'
  | 'studentsCount'
  | 'telegramUsername'
  | 'city'
  | 'centerName'
  | 'heardFrom'
  | 'tariffId'
  | 'note'
>;

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: 'Yangi',
  contacted: "Bog'lanildi",
  approved: 'Tasdiqlandi',
  rejected: 'Rad etildi',
};

/** The answers offered for "where did you hear about us"; anything else is typed in. */
export const HEARD_FROM_OPTIONS = [
  'Instagram',
  'Telegram',
  'Tanishlar orqali',
  'Boshqa ustozdan',
  'Internetda',
] as const;

export const APPLICATION_LIMITS = {
  fullName: { min: 2, max: 80 },
  telegramUsername: 40,
  city: 60,
  centerName: 100,
  heardFrom: 100,
  note: 1000,
  studentsCount: 10_000,
} as const;

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.trim());
}

/** What is wrong with an application, or null when it can be sent. */
export function applicationProblem(input: ApplicationInput): 'name' | 'phone' | 'count' | 'length' | null {
  const name = input.fullName.trim();
  if (name.length < APPLICATION_LIMITS.fullName.min || name.length > APPLICATION_LIMITS.fullName.max)
    return 'name';
  if (!isValidPhone(input.phone)) return 'phone';
  if (
    input.studentsCount !== null &&
    (!Number.isInteger(input.studentsCount) ||
      input.studentsCount < 0 ||
      input.studentsCount > APPLICATION_LIMITS.studentsCount)
  ) {
    return 'count';
  }
  if (
    input.telegramUsername.length > APPLICATION_LIMITS.telegramUsername ||
    input.city.length > APPLICATION_LIMITS.city ||
    input.centerName.length > APPLICATION_LIMITS.centerName ||
    input.heardFrom.length > APPLICATION_LIMITS.heardFrom ||
    input.note.length > APPLICATION_LIMITS.note
  ) {
    return 'length';
  }
  return null;
}

/** "@ustoz" or "ustoz" or a t.me link → the link to open a chat, or null. */
export function telegramLink(username: string): string | null {
  const handle = username
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^@/, '');
  return /^[A-Za-z0-9_]{4,32}$/.test(handle) ? `https://t.me/${handle}` : null;
}

export interface ApplicationFunnel {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  /** Approved out of all decided or open, in percent. */
  conversion: number;
  bySource: { source: string; count: number }[];
}

/** Applications received in the period: how far they got and where they came from. */
export function applicationFunnel(
  applications: readonly TeacherApplication[],
  range: { from: CalendarDate; to: CalendarDate },
): ApplicationFunnel {
  const inRange = applications.filter((a) => {
    const day = schoolDate(new Date(a.createdAt));
    return day >= range.from && day <= range.to;
  });
  const byStatus: Record<ApplicationStatus, number> = { new: 0, contacted: 0, approved: 0, rejected: 0 };
  const sources = new Map<string, number>();
  for (const application of inRange) {
    byStatus[application.status] += 1;
    const source = application.heardFrom.trim() || "Ko'rsatilmagan";
    sources.set(source, (sources.get(source) ?? 0) + 1);
  }
  return {
    total: inRange.length,
    byStatus,
    conversion: inRange.length > 0 ? Math.round((byStatus.approved / inRange.length) * 100) : 0,
    bySource: [...sources]
      .map(([source, count]) => ({ source, count }))
      .toSorted((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  };
}
