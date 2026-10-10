import { describe, expect, it } from 'vitest';
import { createAdminService } from '@/application/adminService';
import { createApplicationService } from '@/application/applicationService';
import { DEFAULT_PLATFORM_SETTINGS } from '@/application/platformService';
import type { TariffInput } from '@/application/ports';
import { TEST_TEACHER_ID, createTestDependencies } from '@/testing/fakes';

const tariff = (name: string, isFeatured: boolean): TariffInput => ({
  name,
  monthlyPrice: 100_000,
  maxStudents: null,
  features: [],
  description: '',
  isPublic: true,
  isFeatured,
  sortOrder: 0,
  archived: false,
});

async function asAdmin() {
  const deps = await createTestDependencies();
  deps.signInAs({ role: 'admin', adminId: 'boss' });
  const admin = createAdminService({
    admin: deps.admin,
    tariffs: deps.tariffs,
    settings: deps.settings,
    random: deps.random,
  });
  return { deps, admin };
}

describe('what helps a teacher join, in the browser-only backend', () => {
  it('keeps a single recommended tariff, like the database', async () => {
    const { deps, admin } = await asAdmin();
    await admin.saveTariff(null, tariff('A', true));
    await admin.saveTariff(null, tariff('B', true));

    const featured = (await deps.tariffs.listAll()).filter((t) => t.isFeatured).map((t) => t.name);
    expect(featured).toEqual(['B']);
  });

  it('starts with the default offer and refuses days out of range', async () => {
    const { deps, admin } = await asAdmin();
    expect(await deps.settings.get()).toEqual(DEFAULT_PLATFORM_SETTINGS);

    await admin.saveSettings({ ...DEFAULT_PLATFORM_SETTINGS, trialDays: 7, referralEnabled: false });
    expect(await deps.settings.get()).toMatchObject({
      trialDays: 7,
      moneyBackDays: 30,
      referralEnabled: false,
    });

    await expect(
      admin.saveSettings({ ...DEFAULT_PLATFORM_SETTINGS, moneyBackDays: 120 }),
    ).rejects.toMatchObject({ code: 'OFFER_DAYS_INVALID' });
    await expect(
      admin.saveSettings({ ...DEFAULT_PLATFORM_SETTINGS, trialDays: Number.NaN }),
    ).rejects.toMatchObject({ code: 'OFFER_DAYS_INVALID' });
  });

  it("keeps the referrer's login as a login, and rewards the referrer with a month", async () => {
    const { deps, admin } = await asAdmin();
    await createApplicationService({ applications: deps.applications }).submit({
      fullName: 'Sevara Aliyeva',
      phone: '+998 93 555 44 33',
      studentsCount: null,
      telegramUsername: '',
      city: '',
      centerName: '',
      heardFrom: '',
      tariffId: null,
      note: '',
      referrerUsername: ' @Mohira ',
    });
    expect((await deps.applications.list())[0].referrerUsername).toBe('mohira');

    await admin.rewardReferral(TEST_TEACHER_ID, 150_000, 'sevara');
    const [bonus] = (await deps.admin.listLedger()).filter((entry) => entry.kind === 'bonus');
    expect(bonus).toMatchObject({
      teacherId: TEST_TEACHER_ID,
      amount: 150_000,
      note: 'Taklif uchun bonus: @sevara',
    });
    await expect(admin.rewardReferral(TEST_TEACHER_ID, 0, 'sevara')).rejects.toMatchObject({
      code: 'INVALID_AMOUNT',
    });
  });

  it('counts the platform for guests', async () => {
    const deps = await createTestDependencies();
    await deps.students.create({ firstName: 'Ali', lastName: '', username: 'ali10' }, '1234');
    deps.signInAs(null);
    expect(await deps.settings.publicStats()).toEqual({ teachers: 1, students: 1, correctAnswers: 0 });
  });
});
