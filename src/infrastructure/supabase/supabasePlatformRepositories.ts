import { AppError } from '@/application/errors';
import type {
  AccountRepository,
  AdminRepository,
  ApplicationRepository,
  PlatformSettingsRepository,
  TariffRepository,
  TeacherCard,
} from '@/application/ports';
import { isFeature } from '@/domain/teacherBilling';
import type { AppSupabaseClient } from './client';
import type { Database } from './database.types';
import { invokeFunction, raisedAppError } from './edgeFunctions';
import { toLedgerEntry, toTariff, toTariffRow, toTeacherApplication, toTeacherOverview } from './mappers';
import { liveSubscription } from './realtime';

type Tables = Database['public']['Tables'];

/** my_teacher_account() as it comes back: the tariff and ledger rows keep their column names. */
interface TeacherAccountJson {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
  billingStartsOn: string | null;
  disabledAt: string | null;
  tariff: Tables['tariffs']['Row'];
  studentCount: number;
  ledger: Tables['teacher_ledger']['Row'][];
}

export function createSupabaseAccountRepository(client: AppSupabaseClient): AccountRepository {
  const live = liveSubscription(client, ['teachers', 'teacher_ledger', 'tariffs']);

  return {
    async myTeacherAccount() {
      const { data, error } = await client.rpc('my_teacher_account');
      if (error) throw raisedAppError(error, ['FORBIDDEN']);
      const account = data as unknown as TeacherAccountJson;
      return {
        username: account.username,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        centerName: account.centerName,
        billingStartsOn: account.billingStartsOn,
        disabledAt: account.disabledAt,
        tariff: toTariff(account.tariff),
        studentCount: account.studentCount,
        ledger: account.ledger.map(toLedgerEntry),
      };
    },

    async updateMyTeacherProfile(profile) {
      const { error } = await client.rpc('update_my_teacher_profile', {
        p_first_name: profile.firstName,
        p_last_name: profile.lastName,
        p_phone: profile.phone,
        p_center_name: profile.centerName,
      });
      if (error) throw raisedAppError(error, ['FORBIDDEN']);
      live.notify();
    },

    async myFeatures() {
      const { data, error } = await client.rpc('my_features');
      if (error) throw error;
      return (data ?? []).filter(isFeature);
    },

    async myTeacherCard() {
      const { data, error } = await client.rpc('my_teacher_card');
      if (error) throw error;
      return (data as unknown as TeacherCard | null) ?? null;
    },

    subscribe: live.subscribe,
  };
}

export function createSupabaseTariffRepository(client: AppSupabaseClient): TariffRepository {
  const live = liveSubscription(client, ['tariffs']);

  return {
    async listOffered() {
      const { data, error } = await client
        .from('tariffs')
        .select('*')
        .eq('is_public', true)
        .is('archived_at', null)
        .order('sort_order')
        .order('monthly_price');
      if (error) throw error;
      return data.map(toTariff);
    },

    async listAll() {
      const { data, error } = await client
        .from('tariffs')
        .select('*')
        .order('sort_order')
        .order('monthly_price');
      if (error) throw error;
      return data.map(toTariff);
    },

    async create(input) {
      const { error } = await client.from('tariffs').insert(toTariffRow(input));
      if (error) throw error;
      live.notify();
    },

    async update(id, input) {
      const { error } = await client
        .from('tariffs')
        .update({
          ...toTariffRow(input),
          archived_at: input.archived ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}

export function createSupabaseAdminRepository(client: AppSupabaseClient): AdminRepository {
  const live = liveSubscription(client, ['teachers', 'teacher_ledger', 'tariffs']);

  return {
    async listTeachers(range) {
      const { data, error } = await client.rpc('admin_teacher_overview', {
        p_from: range.from,
        p_to: range.to,
      });
      if (error) throw raisedAppError(error, ['FORBIDDEN']);
      return data.map(toTeacherOverview);
    },

    async listLedger() {
      const { data, error } = await client.from('teacher_ledger').select('*').order('created_at');
      if (error) throw error;
      return data.map(toLedgerEntry);
    },

    async recordLedgerEntry(teacherId, kind, amount, note) {
      const { error } = await client
        .from('teacher_ledger')
        .insert({ teacher_id: teacherId, kind, amount, note });
      if (error) throw error;
      live.notify();
    },

    async createTeacher(teacher) {
      const result = await invokeFunction<{ teacher: { id: string } }>(client, 'manage-teachers', {
        action: 'create',
        ...teacher,
      });
      live.notify();
      return { id: result.teacher.id };
    },

    async setTeacherPassword(teacherId, password) {
      await invokeFunction(client, 'manage-teachers', { action: 'set-password', teacherId, password });
    },

    async updateTeacher(teacherId, update) {
      const { error } = await client.rpc('admin_update_teacher', {
        p_teacher: teacherId,
        p_first_name: update.firstName,
        p_last_name: update.lastName,
        p_phone: update.phone,
        p_center_name: update.centerName,
        p_tariff_id: update.tariffId,
        p_billing_starts_on: update.billingStartsOn,
        p_disabled: update.disabled,
      });
      if (error) {
        throw raisedAppError(error, [
          'BILLING_STARTED',
          'TARIFF_NOT_FOUND',
          'TEACHER_NOT_FOUND',
          'FORBIDDEN',
        ]);
      }
      live.notify();
    },

    subscribe: live.subscribe,
  };
}

export function createSupabasePlatformSettingsRepository(
  client: AppSupabaseClient,
): PlatformSettingsRepository {
  const live = liveSubscription(client, ['platform_settings']);

  return {
    async get() {
      const { data, error } = await client
        .from('platform_settings')
        .select('contact_phone, contact_telegram')
        .maybeSingle();
      if (error) throw error;
      return { contactPhone: data?.contact_phone ?? '', contactTelegram: data?.contact_telegram ?? '' };
    },

    async save(settings) {
      const { data, error } = await client
        .from('platform_settings')
        .update({
          contact_phone: settings.contactPhone,
          contact_telegram: settings.contactTelegram,
          updated_at: new Date().toISOString(),
        })
        .eq('id', true)
        .select('id');
      if (error) throw error;
      if (!data.length) throw new AppError('FORBIDDEN');
      live.notify();
    },

    subscribe: live.subscribe,
  };
}

export function createSupabaseApplicationRepository(client: AppSupabaseClient): ApplicationRepository {
  const live = liveSubscription(client, ['teacher_applications']);

  return {
    async submit(application) {
      const { error } = await client.rpc('submit_teacher_application', {
        p_full_name: application.fullName,
        p_phone: application.phone,
        p_students_count: application.studentsCount,
        p_telegram_username: application.telegramUsername,
        p_city: application.city,
        p_center_name: application.centerName,
        p_heard_from: application.heardFrom,
        p_tariff_id: application.tariffId,
        p_note: application.note,
      });
      if (error) throw raisedAppError(error, ['TOO_MANY_APPLICATIONS', 'INVALID_APPLICATION']);
    },

    async list() {
      const { data, error } = await client
        .from('teacher_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toTeacherApplication);
    },

    async update(id, changes) {
      const { error } = await client
        .from('teacher_applications')
        .update({
          status: changes.status,
          ...(changes.teacherId !== undefined ? { teacher_id: changes.teacherId } : {}),
          ...(changes.adminNote !== undefined ? { admin_note: changes.adminNote } : {}),
        })
        .eq('id', id);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}
