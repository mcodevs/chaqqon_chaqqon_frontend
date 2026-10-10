import type { PlatformSettings } from '@/application/ports';
import { PAYMENT_QUICK_MONTHS } from '@/domain/billing';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { TOPICS } from '@/domain/practice/topics';
import { type Feature, GRACE_DAYS } from '@/domain/teacherBilling';
import type { FeatureMatch } from './landingFacts';

/*
 * The landing's words, kept out of the components so tests can hold them to the honesty rules:
 * every count is computed from the code it describes, and a trial, money-back or referral sentence
 * exists only while the admin offers it (settings still loading count as "not offered").
 */

/**
 * The apply button's label. It says "Ariza qoldirish" until the settings arrive, so a trial
 * offer never flickers in and out while they load.
 */
export function ctaLabel(settings: PlatformSettings | undefined): string {
  const trialDays = settings?.trialDays ?? 0;
  return trialDays > 0 ? `${trialDays} kun bepul sinab ko'rish` : 'Ariza qoldirish';
}

/**
 * The quiet line under the call to action that takes the risk out of trying, joined with " · ".
 * Empty until the settings arrive: the line appears once, whole, instead of growing.
 */
export function offerNoteParts(settings: PlatformSettings | undefined): string[] {
  if (!settings) return [];
  return [
    settings.trialDays > 0 ? `${settings.trialDays} kun bepul` : null,
    'karta talab qilinmaydi',
    settings.moneyBackDays > 0 ? `${settings.moneyBackDays} kun ichida pulni qaytarish kafolati` : null,
  ].filter((part): part is string => part !== null);
}

export interface Step {
  title: string;
  text: string;
  /** The free-trial step, which the page tints and marks with 🎁. */
  trial: boolean;
}

/** "Qanday boshlanadi": the three steps from the application to working with students. */
export function steps(trialDays: number): Step[] {
  return [
    { title: 'Ariza qoldirasiz', text: 'Ism va telefon raqamingiz kifoya.', trial: false },
    {
      title: 'Akkauntni ochib beramiz',
      text: "Bog'lanamiz va tarif tanlashga yordam beramiz.",
      trial: false,
    },
    trialDays > 0
      ? {
          title: `${trialDays} kun bepul ishlaysiz`,
          text: "O'quvchilarni qo'shib, hammasini darsda sinab ko'rasiz. Birinchi to'lov sinovdan keyin.",
          trial: true,
        }
      : {
          title: "O'quvchilarni qo'shasiz",
          text: 'Har biriga login beriladi — mashq shu kuniyoq boshlanadi.',
          trial: false,
        },
  ];
}

/** The application card's lead, with the trial sentence only while a trial is offered. */
export function applyLead(trialDays: number): string {
  return `Ma'lumotlaringizni qoldiring — biz bog'lanib, akkauntingizni ochib beramiz${
    trialDays > 0 ? `. Birinchi ${trialDays} kun bepul.` : '.'
  }`;
}

/**
 * The hint under the form's "who invited you" field. An invite link shared before the admin turned
 * referrals off still opens the field, so the reward is named only while it is offered.
 */
export function referralHint(referralEnabled: boolean): string {
  return referralEnabled
    ? 'Ixtiyoriy. Akkauntingiz ochilsa, sizni taklif qilgan ustoz 1 oy bepul oladi.'
    : 'Ixtiyoriy.';
}

export interface Assurance {
  id: 'trial' | 'moneyBack' | 'referral';
  icon: string;
  title: string;
  text: string;
}

/**
 * Trial, money back and the referral reward, under the prices: whichever the admin offers. The
 * referral reward is the inviting teacher's alone.
 */
export function assuranceItems(settings: PlatformSettings | undefined): Assurance[] {
  if (!settings) return [];
  const items: (Assurance | null)[] = [
    settings.trialDays > 0
      ? {
          id: 'trial',
          icon: '🎁',
          title: `${settings.trialDays} kun bepul`,
          text: "Birinchi oylik to'lov sinov tugagach yechiladi.",
        }
      : null,
    settings.moneyBackDays > 0
      ? {
          id: 'moneyBack',
          icon: '🛡️',
          title: `${settings.moneyBackDays} kunlik kafolat`,
          text: "Shu muddatda yoqmasa, to'lagan pulingizni to'liq qaytaramiz.",
        }
      : null,
    settings.referralEnabled
      ? {
          id: 'referral',
          icon: '🤝',
          title: 'Hamkasbingizni olib keling',
          text: 'Akkaunt ochgan har bir hamkasbingiz uchun sizga 1 oy bepul — soni cheklanmagan.',
        }
      : null,
  ];
  return items.filter((item): item is Assurance => item !== null);
}

/** "1–4": the teacher's "To'ladi" shortcuts as the payment form offers them. */
const QUICK_MONTHS_RANGE = `${PAYMENT_QUICK_MONTHS[0]}–${PAYMENT_QUICK_MONTHS[PAYMENT_QUICK_MONTHS.length - 1]}`;

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * "Ko'p so'raladigan savollar", in the order a teacher wonders about them. Every answer says only
 * what the code does; the late-payment one is the rule in the teacherBilling.ts header, and sits
 * last, in a neutral tone.
 */
export function faqItems(settings: PlatformSettings | undefined): FaqItem[] {
  const trialDays = settings?.trialDays ?? 0;
  const moneyBackDays = settings?.moneyBackDays ?? 0;
  const referralEnabled = settings?.referralEnabled ?? false;

  const items: (FaqItem | null)[] = [
    {
      id: 'card',
      question: "Karta yoki oldindan to'lov kerakmi?",
      answer:
        trialDays > 0
          ? `Yo'q. Akkauntni ochib beramiz va birinchi ${trialDays} kun bepul ishlaysiz. Birinchi oylik to'lov sinov tugagach yechiladi.`
          : "Karta talab qilinmaydi. Ariza qoldirsangiz, bog'lanib tarif va to'lov tartibini aytib beramiz.",
    },
    {
      id: 'login',
      question: "O'quvchilar qanday kiradi?",
      answer:
        "Har bir o'quvchiga login va parol berasiz. Bola shu bilan telefon, planshet, kompyuter yoki Telegram orqali kiradi.",
    },
    {
      id: 'solo',
      question: "Markazim yo'q, yakka dars beraman. Bo'ladimi?",
      answer: "Albatta. Arizadagi «Markaz nomi» ixtiyoriy — bo'sh qoldirishingiz mumkin.",
    },
    {
      id: 'privacy',
      question: "Boshqa ustozlar mening o'quvchilarimni ko'radimi?",
      answer:
        "Yo'q. Har bir ustoz faqat o'z o'quvchilarini ko'radi; reyting ham faqat sizning sinfingiz ichida.",
    },
    {
      id: 'payments',
      question: "O'quvchi to'lovini qanday kuzataman?",
      answer: `O'quvchi to'laganda «To'ladi» tugmasini bosib, qachongacha ochiqligini belgilaysiz: ${QUICK_MONTHS_RANGE} oy yoki aniq sana. Muddat o'tsa, uning profili o'zi yopiladi.`,
    },
    {
      id: 'devices',
      question: 'Qaysi qurilmalarda ishlaydi?',
      answer:
        "Telefon, planshet va kompyuter brauzerida, hamda Telegram ichida. Hech narsa o'rnatish shart emas.",
    },
    moneyBackDays > 0
      ? {
          id: 'moneyBack',
          question: 'Yoqmasa-chi?',
          answer: `${moneyBackDays} kun ichida to'lagan pulingizni to'liq qaytaramiz.`,
        }
      : null,
    referralEnabled
      ? {
          id: 'referral',
          question: 'Hamkasbimni taklif qilsam-chi?',
          // The reward is the inviter's; the colleague starts on the ordinary terms.
          answer: `Akkaunt ochgan har bir hamkasbingiz uchun sizga 1 oy bepul — soni cheklanmagan. Hamkasbingiz esa ${
            trialDays > 0
              ? `odatdagi ${trialDays} kunlik bepul sinovdan foydalanadi`
              : 'odatdagi shartlarda boshlaydi'
          }.`,
        }
      : null,
    {
      id: 'grace',
      question: "To'lovni kechiktirsam nima bo'ladi?",
      answer: `Ilova sizni ogohlantiradi va yana ${GRACE_DAYS} kun odatdagidek ishlayverasiz. Shundan keyin ham to'lanmasa, to'lov qilinguncha sinfni boshqarish vaqtincha yopiladi.`,
    },
  ];
  return items.filter((item): item is FaqItem => item !== null);
}

/** The header's section links, by the ids the sections carry. */
export const NAV_LINKS = [
  { id: 'imkoniyatlar', label: 'Imkoniyatlar' },
  { id: 'abakus', label: 'Abakus' },
  { id: 'tariflar', label: 'Tariflar' },
  { id: 'savollar', label: 'Savollar' },
  { id: 'ariza', label: 'Ariza' },
] as const;

/** The small live picture a card carries: a vignette, or the static share preview. */
export type FeatureVisual = 'stars' | 'race' | 'payments' | 'share';

export interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  text: string;
  /**
   * Tariff sections the card is about; it counts as offered when a tariff has any of them (all of
   * them with `match: 'all'`). Empty for what every teacher gets (practice, abacus, student
   * payments), which is never tagged or hidden.
   */
  features: readonly Feature[];
  match?: FeatureMatch;
  visual?: FeatureVisual;
  /** An in-page link under the text, to the section with this id. */
  link?: { label: string; targetId: string };
}

export interface FeatureGroup {
  id: 'child' | 'teacher' | 'parent';
  /** The DigitCharacter digit that hosts the group. */
  mascot: number;
  title: string;
  cards: readonly FeatureCard[];
}

/** "Imkoniyatlar", told as what the child, the teacher and the parent each get out of it. */
export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: 'child',
    mascot: 2,
    title: "Bola uchun — mashq o'yinga aylanadi",
    cards: [
      {
        id: 'levels',
        icon: '⚡',
        title: "Har kuni o'z darajasida",
        text: `Flesh-anzanda ${TOPICS.length} mavzu: formulasizdan 100 dan o'tishgacha. Tezlik va qiyinlik bolaga moslab sozlanadi — bola zerikmaydi ham, qiynalmaydi ham.`,
        features: [],
      },
      {
        id: 'abacus',
        icon: '🧮',
        title: "Formulani ko'z bilan tushunadi",
        text: "Ekrandagi soroban har bir qadamni ko'rsatadi: uyda ham bola darsdagi usulda ishlaydi.",
        features: [],
        link: { label: "Abakusni ko'rish ↓", targetId: 'abakus' },
      },
      {
        id: 'motivation',
        icon: '🏆',
        title: "O'zi mashq qilgisi keladi",
        text: "90% to'g'ri vazifa — yulduzcha, yulduzchaga — siz qo'ygan sovg'a. Sinf reytingi raqobat ruhini beradi.",
        features: ['homework_rooms', 'market', 'leaderboard'],
        // The text promises stars, gifts and the leaderboard, so a tariff needs all three.
        match: 'all',
        visual: 'stars',
      },
    ],
  },
  {
    id: 'teacher',
    mascot: 5,
    title: 'Siz uchun — vaqtingiz darsga qoladi',
    cards: [
      {
        id: 'homework',
        icon: '📝',
        title: 'Uy vazifasini tekshirishga vaqt ketmaydi',
        text: "Har bir o'quvchiga o'z vazifasi. Kim bajardi, qayerda adashdi — darhol ko'rasiz.",
        features: ['homework_rooms'],
      },
      {
        id: 'classroom',
        icon: '🏫',
        title: "Dars o'yinga aylanadi",
        text: `Proyektorda ${CLASSROOM_PARTICIPANTS.min}–${CLASSROOM_PARTICIPANTS.max} o'quvchi bellashadi: har biriga o'z misoli, bir xil tezlikda. Bolalar keyingi darsni kutib qoladi.`,
        features: ['classroom'],
        visual: 'race',
      },
      {
        id: 'worksheet',
        icon: '🖨️',
        title: 'Varaq tayyorlash bir daqiqa',
        text: "Mavzu bo'yicha A4 misollar varag'i javoblari bilan bir bosishda tayyor.",
        features: ['worksheet'],
      },
      {
        id: 'payments',
        icon: '💳',
        title: "Kim to'lamagani esdan chiqmaydi",
        text: "Har bir o'quvchi qachongacha to'lagani ko'rinib turadi; muddati o'tsa, profil o'zi yopiladi.",
        features: [],
        visual: 'payments',
      },
    ],
  },
  {
    id: 'parent',
    mascot: 8,
    title: 'Ota-ona uchun — hammasidan xabardor',
    cards: [
      {
        id: 'telegram',
        icon: '📱',
        title: "Telegram'da xabar",
        text: "Vazifa, natija va sovg'alar haqida ota-onaga ham, sizga ham Telegram'da xabar boradi.",
        features: ['telegram'],
      },
      {
        id: 'share',
        icon: '🖼️',
        title: 'Natija — chiroyli rasm',
        text: 'Uy vazifasi tugagach, bola natijasini rasm qilib ota-onasiga yuboradi.',
        features: ['homework_rooms'],
        visual: 'share',
      },
    ],
  },
];
