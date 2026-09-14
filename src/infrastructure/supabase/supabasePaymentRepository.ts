import { AppError } from '@/application/errors';
import type { PaymentRepository } from '@/application/ports';
import type { AppSupabaseClient } from './client';
import { toPayment } from './mappers';
import { liveSubscription } from './realtime';

/**
 * Row-level security refused the payment. For the teacher that means the day is out of range on the
 * database clock (or the id is not a student), since only the teacher's page records payments.
 */
const POSTGRES_INSUFFICIENT_PRIVILEGE = '42501';

export function createSupabasePaymentRepository(client: AppSupabaseClient): PaymentRepository {
  const live = liveSubscription(client, ['student_payments']);

  return {
    async list() {
      const { data, error } = await client.from('student_payments').select('*').order('recorded_at');
      if (error) throw error;
      return data.map(toPayment);
    },

    async record(studentId, paidUntil) {
      const { data, error } = await client
        .from('student_payments')
        .insert({ student_id: studentId, paid_until: paidUntil })
        .select()
        .single();
      if (error?.code === POSTGRES_INSUFFICIENT_PRIVILEGE) throw new AppError('INVALID_PAID_UNTIL');
      if (error) throw error;
      live.notify();
      return toPayment(data);
    },

    async remove(paymentId) {
      const { error } = await client.from('student_payments').delete().eq('id', paymentId);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}
