import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@/application/ports';
import { PAYMENT_QUICK_MONTHS } from '@/domain/billing';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { TOPICS } from '@/domain/practice/topics';
import { FEATURES, GRACE_DAYS } from '@/domain/teacherBilling';
import {
  FEATURE_GROUPS,
  NAV_LINKS,
  applyLead,
  assuranceItems,
  ctaLabel,
  faqItems,
  offerNoteParts,
  referralHint,
  steps,
} from './landingCopy';

const settings = (overrides: Partial<PlatformSettings> = {}): PlatformSettings => ({
  contactPhone: '',
  contactTelegram: '',
  trialDays: 14,
  moneyBackDays: 7,
  referralEnabled: true,
  ...overrides,
});

const nothingOffered = settings({ trialDays: 0, moneyBackDays: 0, referralEnabled: false });

describe('ctaLabel', () => {
  it('offers the trial only once the settings say there is one', () => {
    expect(ctaLabel(undefined)).toBe('Ariza qoldirish');
    expect(ctaLabel(settings({ trialDays: 0 }))).toBe('Ariza qoldirish');
    expect(ctaLabel(settings({ trialDays: 14 }))).toBe("14 kun bepul sinab ko'rish");
  });
});

describe('offerNoteParts', () => {
  it('lists the trial, the card and the money-back promise', () => {
    expect(offerNoteParts(settings())).toEqual([
      '14 kun bepul',
      'karta talab qilinmaydi',
      '7 kun ichida pulni qaytarish kafolati',
    ]);
  });

  it('drops each offer at 0, and shows nothing while the settings load', () => {
    expect(offerNoteParts(settings({ trialDays: 0 }))).toEqual([
      'karta talab qilinmaydi',
      '7 kun ichida pulni qaytarish kafolati',
    ]);
    expect(offerNoteParts(settings({ moneyBackDays: 0 }))).toEqual([
      '14 kun bepul',
      'karta talab qilinmaydi',
    ]);
    expect(offerNoteParts(nothingOffered)).toEqual(['karta talab qilinmaydi']);
    expect(offerNoteParts(undefined)).toEqual([]);
  });
});

describe('steps', () => {
  it('makes the third step the free trial while there is one', () => {
    const withTrial = steps(14);
    expect(withTrial.map((step) => step.title)).toEqual([
      'Ariza qoldirasiz',
      'Akkauntni ochib beramiz',
      '14 kun bepul ishlaysiz',
    ]);
    expect(withTrial.map((step) => step.trial)).toEqual([false, false, true]);
  });

  it('talks about adding students instead when there is no trial', () => {
    const noTrial = steps(0);
    expect(noTrial[2].title).toBe("O'quvchilarni qo'shasiz");
    expect(noTrial.some((step) => step.trial)).toBe(false);
    expect(noTrial.map((step) => step.text).join(' ')).not.toMatch(/bepul|sinov/);
  });
});

describe('applyLead', () => {
  it('promises the trial only while there is one', () => {
    expect(applyLead(14)).toBe(
      "Ma'lumotlaringizni qoldiring — biz bog'lanib, akkauntingizni ochib beramiz. Birinchi 14 kun bepul.",
    );
    expect(applyLead(0)).toBe("Ma'lumotlaringizni qoldiring — biz bog'lanib, akkauntingizni ochib beramiz.");
  });
});

describe('referralHint', () => {
  it('names the inviting teacher reward only while referrals are on', () => {
    expect(referralHint(true)).toBe(
      'Ixtiyoriy. Akkauntingiz ochilsa, sizni taklif qilgan ustoz 1 oy bepul oladi.',
    );
    expect(referralHint(false)).toBe('Ixtiyoriy.');
    expect(referralHint(false)).not.toMatch(/1 oy|bepul/);
  });
});

describe('assuranceItems', () => {
  it('shows whichever offers the admin has turned on', () => {
    expect(assuranceItems(settings()).map((item) => item.id)).toEqual(['trial', 'moneyBack', 'referral']);
    expect(assuranceItems(settings({ trialDays: 0 })).map((item) => item.id)).toEqual([
      'moneyBack',
      'referral',
    ]);
    expect(assuranceItems(settings({ moneyBackDays: 0 })).map((item) => item.id)).toEqual([
      'trial',
      'referral',
    ]);
    expect(assuranceItems(settings({ referralEnabled: false })).map((item) => item.id)).toEqual([
      'trial',
      'moneyBack',
    ]);
    expect(assuranceItems(nothingOffered)).toEqual([]);
    expect(assuranceItems(undefined)).toEqual([]);
  });

  it('gives the referral reward to the inviting teacher only', () => {
    const referral = assuranceItems(settings()).find((item) => item.id === 'referral');
    expect(referral?.text).toBe(
      'Akkaunt ochgan har bir hamkasbingiz uchun sizga 1 oy bepul — soni cheklanmagan.',
    );
  });
});

describe('faqItems', () => {
  const ids = (s: PlatformSettings | undefined) => faqItems(s).map((item) => item.id);
  const answer = (s: PlatformSettings | undefined, id: string) =>
    faqItems(s).find((item) => item.id === id)?.answer ?? '';

  it('keeps the order and ends with the late-payment rule', () => {
    expect(ids(settings())).toEqual([
      'card',
      'login',
      'solo',
      'privacy',
      'payments',
      'devices',
      'moneyBack',
      'referral',
      'grace',
    ]);
  });

  it('asks about money back and referrals only while they are offered', () => {
    expect(ids(settings({ moneyBackDays: 0 }))).not.toContain('moneyBack');
    expect(ids(settings({ referralEnabled: false }))).not.toContain('referral');
    expect(ids(undefined)).toEqual(['card', 'login', 'solo', 'privacy', 'payments', 'devices', 'grace']);
    expect(answer(settings({ moneyBackDays: 10 }), 'moneyBack')).toBe(
      "10 kun ichida to'lagan pulingizni to'liq qaytaramiz.",
    );
  });

  it('never promises the invited colleague a reward', () => {
    for (const trialDays of [0, 14]) {
      const text = answer(settings({ trialDays }), 'referral');
      expect(text.startsWith('Akkaunt ochgan har bir hamkasbingiz uchun sizga 1 oy bepul')).toBe(true);
      const colleague = text.split('Hamkasbingiz esa')[1];
      expect(colleague).toContain('odatdagi');
      expect(colleague).not.toMatch(/1 oy|bonus|sovg'a/);
    }
    expect(answer(settings({ trialDays: 14 }), 'referral')).toContain(
      'odatdagi 14 kunlik bepul sinovdan foydalanadi',
    );
    expect(answer(settings({ trialDays: 0 }), 'referral')).toContain('odatdagi shartlarda boshlaydi');
  });

  it('mentions a trial nowhere when there is none', () => {
    const all = faqItems(settings({ trialDays: 0 }))
      .map((item) => item.answer)
      .join(' ');
    expect(all).not.toMatch(/kun bepul|kunlik bepul|sinov/);
    expect(answer(settings({ trialDays: 14 }), 'card')).toContain('birinchi 14 kun bepul ishlaysiz');
  });

  it('states the grace days from the billing rule', () => {
    expect(answer(settings(), 'grace')).toContain(`yana ${GRACE_DAYS} kun odatdagidek ishlayverasiz`);
  });

  it("quotes the payment form's month shortcuts, not a typed range", () => {
    const first = PAYMENT_QUICK_MONTHS[0];
    const last = PAYMENT_QUICK_MONTHS[PAYMENT_QUICK_MONTHS.length - 1];
    expect(answer(settings(), 'payments')).toContain(`${first}–${last} oy yoki aniq sana`);
  });
});

describe('FEATURE_GROUPS', () => {
  const cards = FEATURE_GROUPS.flatMap((group) => group.cards);

  it('counts from the code, never from a typed number', () => {
    expect(cards.find((card) => card.id === 'levels')?.text).toContain(`${TOPICS.length} mavzu`);
    expect(cards.find((card) => card.id === 'classroom')?.text).toContain(
      `${CLASSROOM_PARTICIPANTS.min}–${CLASSROOM_PARTICIPANTS.max} o'quvchi`,
    );
  });

  it('has unique cards, real tariff sections and one of each visual', () => {
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    for (const card of cards) for (const feature of card.features) expect(FEATURES).toContain(feature);
    expect(cards.flatMap((card) => (card.visual ? [card.visual] : [])).toSorted()).toEqual([
      'payments',
      'race',
      'share',
      'stars',
    ]);
  });

  it('links only to sections the page has', () => {
    const sectionIds: readonly string[] = NAV_LINKS.map((link) => link.id);
    for (const card of cards) if (card.link) expect(sectionIds).toContain(card.link.targetId);
  });
});
