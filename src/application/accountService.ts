import { schoolDate } from '@/domain/billing';
import { type TeacherBillingState, canAddStudent, teacherBillingState } from '@/domain/teacherBilling';
import { AppError } from './errors';
import type { AccountRepository, Clock, TeacherAccount, TeacherProfileInput } from './ports';

interface AccountDependencies {
  account: AccountRepository;
  clock: Clock;
}

/** The teacher's account with what it means today: billing status and room for more students. */
export interface TeacherAccountView extends TeacherAccount {
  billing: TeacherBillingState;
  canAddStudent: boolean;
}

export const TEACHER_FIELD_LIMITS = { name: 60, phone: 30, centerName: 100 } as const;

export function isValidTeacherProfile(profile: TeacherProfileInput): boolean {
  return (
    profile.firstName.trim().length > 0 &&
    profile.firstName.trim().length <= TEACHER_FIELD_LIMITS.name &&
    profile.lastName.trim().length <= TEACHER_FIELD_LIMITS.name &&
    profile.phone.trim().length <= TEACHER_FIELD_LIMITS.phone &&
    profile.centerName.trim().length <= TEACHER_FIELD_LIMITS.centerName
  );
}

export function createAccountService({ account, clock }: AccountDependencies) {
  return {
    async getTeacherAccount(): Promise<TeacherAccountView> {
      const mine = await account.myTeacherAccount();
      const billing = teacherBillingState({
        entries: mine.ledger,
        anchor: mine.billingStartsOn,
        monthlyPrice: mine.tariff.monthlyPrice,
        disabled: mine.disabledAt !== null,
        today: schoolDate(clock.now()),
      });
      return { ...mine, billing, canAddStudent: canAddStudent(mine.studentCount, mine.tariff.maxStudents) };
    },

    async updateProfile(profile: TeacherProfileInput): Promise<void> {
      if (!isValidTeacherProfile(profile)) throw new AppError('TEACHER_FIELDS_REQUIRED');
      await account.updateMyTeacherProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim(),
        centerName: profile.centerName.trim(),
      });
    },

    myFeatures: () => account.myFeatures(),

    myTeacherCard: () => account.myTeacherCard(),

    subscribe: account.subscribe,
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
