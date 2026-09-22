import { describe, expect, it } from 'vitest';
import { accessOf } from '@/domain/billing';
import { createTestDependencies } from '@/testing/fakes';
import { createBillingService } from './billingService';
import { createStudentService } from './studentService';

const ALI = { firstName: 'Ali', lastName: '', username: 'ali10', password: '1234' };

/** Billing is already in use when Ali joins. The test clock reads 2026-09-13, 15:00 in Tashkent. */
async function withNewStudent() {
  const deps = createTestDependencies();
  const billing = createBillingService(deps);
  await billing.listPayments();
  const { student } = await createStudentService(deps).add(ALI);
  return { billing, studentId: student.id };
}

describe('billingService', () => {
  it('keeps a new student closed until the teacher records a payment', async () => {
    const { billing, studentId } = await withNewStudent();
    expect(billing.today()).toBe('2026-09-13');
    expect(await billing.listPayments()).toEqual([]);

    expect(await billing.recordPayment(studentId, '2027-01-13')).toMatchObject({
      studentId,
      paidUntil: '2027-01-13',
      kind: 'payment',
    });
  });

  it('accepts days from tomorrow up to 24 months ahead', async () => {
    const { billing, studentId } = await withNewStudent();
    for (const invalid of ['2026-09-13', '2028-09-14', '2027-02-30', '']) {
      await expect(billing.recordPayment(studentId, invalid)).rejects.toMatchObject({
        code: 'INVALID_PAID_UNTIL',
      });
    }

    await billing.recordPayment(studentId, '2026-09-14');
    await billing.recordPayment(studentId, '2028-09-13');
    expect(await billing.listPayments()).toHaveLength(2);
  });

  it('lets the latest payment decide, and undoing it brings back the one before', async () => {
    const { billing, studentId } = await withNewStudent();
    const paidUntil = async () =>
      accessOf(await billing.listPayments(), studentId, billing.today()).paidUntil;

    await billing.recordPayment(studentId, '2027-01-13');
    await billing.recordPayment(studentId, '2026-12-13');
    expect(await paidUntil()).toBe('2026-12-13');

    await billing.cancelLatestPayment(studentId);
    expect(await paidUntil()).toBe('2027-01-13');

    await billing.cancelLatestPayment(studentId);
    expect(await paidUntil()).toBeNull();
    await expect(billing.cancelLatestPayment(studentId)).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });

  it('rejects payments for unknown students', async () => {
    const { billing } = await withNewStudent();
    await expect(billing.recordPayment('missing', '2026-10-13')).rejects.toMatchObject({
      code: 'STUDENT_NOT_FOUND',
    });
  });

  it('gives students who existed before billing the rest of the month', async () => {
    const deps = createTestDependencies();
    const { student } = await createStudentService(deps).add(ALI);

    expect(await createBillingService(deps).listPayments()).toEqual([
      expect.objectContaining({ studentId: student.id, paidUntil: '2026-10-01', kind: 'launch' }),
    ]);
  });

  it('counts the time left until the next day in Tashkent', () => {
    const billing = createBillingService(createTestDependencies());
    expect(billing.msUntilTomorrow()).toBe(9 * 60 * 60 * 1000);
  });
});
