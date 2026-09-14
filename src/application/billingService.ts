import {
  type CalendarDate,
  type Payment,
  isValidPaidUntil,
  latestPayment,
  nextSchoolDayStart,
  schoolDate,
} from '@/domain/billing';
import { AppError } from './errors';
import type { ChangeListener, Clock, PaymentRepository, Unsubscribe } from './ports';

interface BillingDependencies {
  payments: PaymentRepository;
  clock: Clock;
}

export function createBillingService({ payments, clock }: BillingDependencies) {
  return {
    listPayments: (): Promise<Payment[]> => payments.list(),

    subscribe: (listener: ChangeListener): Unsubscribe => payments.subscribe(listener),

    /** The day access is decided for, in Tashkent. */
    today: (): CalendarDate => schoolDate(clock.now()),

    /** Time left until the next day starts, when access may open or close. */
    msUntilTomorrow(): number {
      const now = clock.now();
      return nextSchoolDayStart(now).getTime() - now.getTime();
    },

    /**
     * "To'ladi": the student may use the app until `paidUntil`. The latest payment decides,
     * so a wrong day is fixed by recording the right one.
     */
    async recordPayment(studentId: string, paidUntil: CalendarDate): Promise<Payment> {
      if (!isValidPaidUntil(paidUntil, schoolDate(clock.now()))) throw new AppError('INVALID_PAID_UNTIL');
      return payments.record(studentId, paidUntil);
    },

    /** Takes back the latest payment, so the one before it counts again. */
    async cancelLatestPayment(studentId: string): Promise<void> {
      const latest = latestPayment(await payments.list(), studentId);
      if (!latest) throw new AppError('PAYMENT_NOT_FOUND');
      await payments.remove(latest.id);
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
