import type { PlatformSettings } from '@/application/ports';
import type { TeacherStatus } from '@/domain/teacherBilling';

export const STATUS_LABEL: Record<TeacherStatus, string> = {
  unbilled: 'Hisob yuritilmaydi',
  ok: 'Faol',
  due_soon: "To'lov yaqinlashmoqda",
  overdue: 'Qarzdor',
  blocked: 'Bloklangan',
  disabled: "To'xtatilgan",
};

export const STATUS_TONE: Record<TeacherStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  unbilled: 'neutral',
  ok: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  blocked: 'danger',
  disabled: 'neutral',
};

/** "+998 90 … · @admin", or null while the admin has not set a contact. */
export function contactLine(settings: PlatformSettings | undefined): string | null {
  const parts = [settings?.contactPhone, settings?.contactTelegram].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(' · ') : null;
}
