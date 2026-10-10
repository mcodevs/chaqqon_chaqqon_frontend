import type { LedgerKind } from '@/domain/teacherBilling';

export const KIND_LABEL: Record<LedgerKind, string> = {
  payment: "To'lov",
  bonus: 'Bonus',
  adjustment: 'Tuzatish',
  charge: 'Oylik yechim',
};
