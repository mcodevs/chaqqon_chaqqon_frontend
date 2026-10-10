import { AppError } from '@/application/errors';
import type { Clock, IdGenerator, PaymentRepository } from '@/application/ports';
import { type Payment, type PaymentKind, launchPaidUntil, schoolDate } from '@/domain/billing';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';
import type { LocalPlatform } from './localPlatform';
import type { StudentRecords } from './studentRecords';

const KEY = 'payments';

interface Dependencies {
  store: KeyValueStore;
  records: StudentRecords;
  platform: LocalPlatform;
  clock: Clock;
  generateId: IdGenerator;
}

export function createLocalPaymentRepository({
  store,
  records,
  platform,
  clock,
  generateId,
}: Dependencies): PaymentRepository {
  const newPayment = (studentId: string, paidUntil: string, kind: PaymentKind): Payment => ({
    id: generateId(),
    studentId,
    recordedAt: clock.now().toISOString(),
    paidUntil,
    kind,
  });

  // A browser that used the app before billing has no payments yet. As in the migration,
  // the students it already has keep access until the end of the month.
  const list = async (): Promise<Payment[]> => {
    const stored = await store.get<Payment[]>(KEY);
    if (stored) return stored;

    const paidUntil = launchPaidUntil(schoolDate(clock.now()));
    const launch = (await records.list()).map((record) => newPayment(record.id, paidUntil, 'launch'));
    await store.set(KEY, launch);
    return launch;
  };

  return {
    /** A teacher sees their students' payments, a student only their own. */
    async list() {
      const current = platform.session();
      const all = await list();
      if (current?.role === 'student')
        return all.filter((payment) => payment.studentId === current.studentId);
      const own = await platform.ownStudentIds();
      return all.filter((payment) => own.has(payment.studentId));
    },

    async record(studentId, paidUntil) {
      await platform.assertCanManage();
      if (!(await platform.ownStudentIds()).has(studentId)) throw new AppError('STUDENT_NOT_FOUND');
      const payment = newPayment(studentId, paidUntil, 'payment');
      await store.set(KEY, [...(await list()), payment]);
      return payment;
    },

    async remove(paymentId) {
      await platform.assertCanManage();
      const own = await platform.ownStudentIds();
      if (!(await list()).some((payment) => payment.id === paymentId && own.has(payment.studentId))) {
        throw new AppError('PAYMENT_NOT_FOUND');
      }
      await store.set(
        KEY,
        (await list()).filter((payment) => payment.id !== paymentId),
      );
    },

    subscribe: (listener) => store.subscribe((key) => keyMatches(key, (k) => k === KEY) && listener()),
  };
}
