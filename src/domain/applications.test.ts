import { describe, expect, it } from 'vitest';
import {
  type ApplicationInput,
  type TeacherApplication,
  applicationFunnel,
  applicationProblem,
  normalizeReferrer,
  referralLink,
  telegramLink,
} from './applications';

const input: ApplicationInput = {
  fullName: 'Dilnoza Karimova',
  phone: '+998 90 111 22 33',
  studentsCount: 25,
  telegramUsername: '@dilnoza',
  city: 'Toshkent',
  centerName: '',
  heardFrom: 'Instagram',
  tariffId: null,
  note: '',
  referrerUsername: '',
};

describe('applications', () => {
  it('needs a name and a phone number, and nothing else', () => {
    expect(applicationProblem(input)).toBeNull();
    expect(
      applicationProblem({ ...input, studentsCount: null, telegramUsername: '', city: '', heardFrom: '' }),
    ).toBeNull();
    expect(applicationProblem({ ...input, fullName: ' D ' })).toBe('name');
    expect(applicationProblem({ ...input, phone: "qo'ng'iroq" })).toBe('phone');
    expect(applicationProblem({ ...input, studentsCount: -1 })).toBe('count');
    expect(applicationProblem({ ...input, note: 'x'.repeat(1001) })).toBe('length');
  });

  it("reads the referrer's login the way it was typed, and builds the link that fills it in", () => {
    expect(normalizeReferrer(' @Mohira ')).toBe('mohira');
    expect(normalizeReferrer('')).toBe('');
    expect(applicationProblem({ ...input, referrerUsername: 'x'.repeat(41) })).toBe('length');
    expect(referralLink('https://chaqqon.uz', 'mohira')).toBe('https://chaqqon.uz/?taklif=mohira#ariza');
  });

  it('turns a Telegram username into a chat link', () => {
    expect(telegramLink('@dilnoza_ustoz')).toBe('https://t.me/dilnoza_ustoz');
    expect(telegramLink('https://t.me/dilnoza')).toBe('https://t.me/dilnoza');
    expect(telegramLink('salom dunyo')).toBeNull();
  });

  it('counts the period by status and by where the teachers heard of us', () => {
    const at = (
      createdAt: string,
      status: TeacherApplication['status'],
      heardFrom: string,
    ): TeacherApplication => ({
      ...input,
      id: createdAt,
      createdAt,
      status,
      heardFrom,
      teacherId: null,
      adminNote: '',
    });
    const funnel = applicationFunnel(
      [
        at('2026-10-01T05:00:00Z', 'approved', 'Instagram'),
        at('2026-10-02T05:00:00Z', 'contacted', 'Instagram'),
        at('2026-10-03T05:00:00Z', 'new', ''),
        at('2026-09-20T05:00:00Z', 'rejected', 'Telegram'),
      ],
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(funnel).toEqual({
      total: 3,
      byStatus: { new: 1, contacted: 1, approved: 1, rejected: 0 },
      conversion: 33,
      bySource: [
        { source: 'Instagram', count: 2 },
        { source: "Ko'rsatilmagan", count: 1 },
      ],
    });
  });
});
