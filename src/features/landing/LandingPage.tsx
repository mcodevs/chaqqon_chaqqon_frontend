import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PlatformSettings, PublicStats } from '@/application/ports';
import { REFERRAL_PARAM, normalizeReferrer } from '@/domain/applications';
import { FEATURE_META, dailyPrice } from '@/domain/teacherBilling';
import { contactLine } from '@/features/teacher/subscription/subscriptionText';
import { formatCount, formatSom } from '@/shared/format';
import { useOfferedTariffs, usePlatformSettings, usePublicStats } from '@/shared/services/queries';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import styles from './Landing.module.css';
import { ApplicationForm } from './ApplicationForm';

/** Each section told as what the teacher and the child get out of it, not as a feature list. */
const FEATURES = [
  {
    icon: '⚡',
    title: "Bola har kuni o'z darajasida mashq qiladi",
    text: 'Flesh-anzanda 109 mavzu: formulasizdan miksgacha. Tezlik va qiyinlikni siz belgilaysiz — bola zerikmaydi ham, qiynalmaydi ham.',
  },
  {
    icon: '🧮',
    title: 'Formulani ko‘z bilan tushunadi',
    text: "Ekrandagi soroban har bir qadamni ko'rsatadi: uyda ham bola darsdagi usulda ishlaydi.",
  },
  {
    icon: '📝',
    title: 'Uy vazifasini tekshirishga vaqt ketmaydi',
    text: "Har bir o'quvchiga o'z vazifasi. Kim bajardi, qayerda adashdi — darhol ko'rasiz.",
  },
  {
    icon: '🏫',
    title: "Dars o'yinga aylanadi",
    text: "Proyektorda 2–4 o'quvchi bellashadi. Bolalar keyingi darsni kutib qoladi.",
  },
  {
    icon: '🏆',
    title: 'Bola o‘zi mashq qilgisi keladi',
    text: "Xatosiz vazifa — yulduzcha, yulduzchaga — siz qo'ygan sovg'a. Sinf reytingi esa raqobat ruhini beradi.",
  },
  {
    icon: '🖨️',
    title: 'Varaq tayyorlash bir daqiqa',
    text: "Mavzu bo'yicha A4 misollar varag'i javoblari bilan bir bosishda tayyor.",
  },
  {
    icon: '💳',
    title: "Kim to'lamagani esdan chiqmaydi",
    text: "Har bir o'quvchi qachongacha to'lagani ko'rinib turadi; muddati o'tsa, profil o'zi yopiladi.",
  },
  {
    icon: '📱',
    title: 'Ota-ona ham xabardor',
    text: "Vazifa, natija va sovg'alar haqida ota-onaga ham, sizga ham Telegram'da xabar boradi.",
  },
];

function steps(trialDays: number) {
  return [
    { title: 'Ariza qoldirasiz', text: 'Ism va telefon raqamingiz kifoya.' },
    { title: 'Akkauntni ochib beramiz', text: "Bog'lanamiz va tarif tanlashga yordam beramiz." },
    trialDays > 0
      ? {
          title: `${trialDays} kun bepul ishlaysiz`,
          text: "O'quvchilarni qo'shib, hammasini darsda sinab ko'rasiz. Birinchi to'lov sinovdan keyin.",
        }
      : {
          title: "O'quvchilarni qo'shasiz",
          text: 'Har biriga login beriladi — mashq shu kuniyoq boshlanadi.',
        },
  ];
}

/** The platform's front door for teachers: what it changes, what it costs, and the application form. */
export function LandingPage() {
  const tariffs = useOfferedTariffs();
  const settings = usePlatformSettings();
  const stats = usePublicStats();
  const contact = contactLine(settings);
  const [chosenTariff, setChosenTariff] = useState<string | null>(null);
  // A colleague's invite link names them; the form keeps it for the admin.
  const [searchParams] = useSearchParams();
  const referrer = normalizeReferrer(searchParams.get(REFERRAL_PARAM) ?? '');

  const trialDays = settings?.trialDays ?? 0;
  const moneyBackDays = settings?.moneyBackDays ?? 0;
  const referralEnabled = settings?.referralEnabled ?? false;

  // An invite link ends in #ariza, but the tariffs above the form load later and push it down, so
  // the jump waits for them, and happens once.
  const loaded = tariffs !== undefined && settings !== undefined;
  const jumped = useRef(false);
  useEffect(() => {
    if (!loaded || jumped.current || window.location.hash !== '#ariza') return;
    jumped.current = true;
    document.getElementById('ariza')?.scrollIntoView();
  }, [loaded]);

  const apply = (tariffId: string | null) => {
    setChosenTariff(tariffId);
    document.getElementById('ariza')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            <span className={styles.brandLogo} aria-hidden="true">
              ⚡
            </span>
            Chaqqon-chaqqon
          </span>
          <nav className={styles.nav} aria-label="Bo'limlar">
            <a href="#imkoniyatlar">Imkoniyatlar</a>
            <a href="#tariflar">Tariflar</a>
            <a href="#ariza">Ariza</a>
          </nav>
          <Link to="/login" className={styles.loginLink}>
            Kirish
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Mental arifmetika ustozlari uchun</p>
            <h1 className={styles.heroTitle}>
              O'quvchilaringiz uyda ham mashq qiladi — siz har birining o'sishini ko'rib turasiz
            </h1>
            <p className={styles.heroText}>
              Uy vazifasini tekshirish, to'lovlarni eslab yurish va darsni qiziqarli o'tkazish — endi bitta
              ilovada. Siz dars berasiz, qolganini Chaqqon-chaqqon qiladi. Telefon, planshet, kompyuter va
              Telegram'da ishlaydi.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.ctaSecondary} onClick={() => apply(chosenTariff)}>
                {trialDays > 0 ? `${trialDays} kun bepul sinab ko'rish` : 'Ariza qoldirish'}
              </button>
              <Link to="/login" className={styles.ctaGhost}>
                Akkauntim bor — kirish
              </Link>
            </div>
            <OfferNote trialDays={trialDays} moneyBackDays={moneyBackDays} />
            <HeroFacts stats={stats} />
          </div>
        </section>

        <section id="imkoniyatlar" className={styles.section}>
          <h2 className={styles.sectionTitle}>Ustoz va bola nimaga ega bo'ladi</h2>
          <div className={styles.features}>
            {FEATURES.map((feature) => (
              <article key={feature.title} className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Qanday boshlanadi</h2>
          <ol className={styles.steps}>
            {steps(trialDays).map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="tariflar" className={styles.section}>
          <h2 className={styles.sectionTitle}>Tariflar</h2>
          {tariffs && tariffs.length > 0 ? (
            <div className={styles.tariffs}>
              {tariffs.map((tariff) => (
                <article
                  key={tariff.id}
                  className={`${styles.tariff} ${tariff.isFeatured ? styles.tariffFeatured : ''}`}
                >
                  {tariff.isFeatured && (
                    <span className={styles.tariffBadge}>
                      <span aria-hidden="true">⭐</span> Tavsiya etamiz
                    </span>
                  )}
                  <h3 className={styles.tariffName}>{tariff.name}</h3>
                  <p className={styles.tariffPrice}>
                    {formatSom(tariff.monthlyPrice)}
                    <span> / oy</span>
                  </p>
                  {tariff.monthlyPrice > 0 && (
                    <p className={styles.tariffDaily}>
                      kuniga taxminan {formatSom(dailyPrice(tariff.monthlyPrice))}
                    </p>
                  )}
                  <p className={styles.tariffLimit}>
                    {tariff.maxStudents
                      ? `${tariff.maxStudents} tagacha o'quvchi`
                      : "O'quvchilar soni cheklanmagan"}
                  </p>
                  {tariff.description && <p className={styles.tariffDescription}>{tariff.description}</p>}
                  <ul className={styles.tariffFeatures}>
                    <li>✓ Mashqlar, abakus va natijalar</li>
                    <li>✓ O'quvchilar to'lovini nazorat qilish</li>
                    {tariff.features.map((feature) => (
                      <li key={feature}>
                        ✓ {FEATURE_META[feature].label}
                        {FEATURE_META[feature].student && (
                          <span className={styles.forStudents}>
                            {' '}
                            · o'quvchiga: {FEATURE_META[feature].student}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`${styles.tariffButton} ${tariff.isFeatured ? styles.tariffButtonFeatured : ''}`}
                    onClick={() => apply(tariff.id)}
                  >
                    Shu tarifga ariza
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>
              Tariflar haqida ariza qoldirganingizdan keyin batafsil aytib beramiz.
            </p>
          )}
          <Assurances settings={settings} />
        </section>

        <section id="ariza" className={styles.section}>
          <div className={styles.applyCard}>
            <h2 className={styles.sectionTitle}>Ariza qoldiring</h2>
            <p className={styles.muted}>
              Ma'lumotlaringizni qoldiring — biz bog'lanib, akkauntingizni ochib beramiz
              {trialDays > 0 ? `. Birinchi ${trialDays} kun bepul.` : '.'}
            </p>
            <ApplicationForm
              tariffs={tariffs ?? []}
              chosenTariffId={chosenTariff}
              referralEnabled={referralEnabled}
              referrer={referrer}
            />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© Chaqqon-chaqqon · Mental arifmetika platformasi</span>
          {contact && <span>Aloqa: {contact}</span>}
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}

/** One quiet line under the call to action that takes the risk out of trying. */
function OfferNote({ trialDays, moneyBackDays }: { trialDays: number; moneyBackDays: number }) {
  const parts = [
    trialDays > 0 && `${trialDays} kun bepul`,
    'karta talab qilinmaydi',
    moneyBackDays > 0 && `${moneyBackDays} kun ichida pulni qaytarish kafolati`,
  ].filter(Boolean);
  return <p className={styles.heroNote}>{parts.join(' · ')}</p>;
}

/**
 * The platform in real numbers. A count shows only once it is big enough to reassure: "1 ustoz"
 * would say the opposite of what social proof is for. Each one appears by itself as the platform grows.
 */
const SHOW_FROM = { teachers: 10, students: 50, correctAnswers: 1000 } as const;

function HeroFacts({ stats }: { stats: PublicStats | undefined }) {
  const facts = stats
    ? [
        { value: stats.teachers, min: SHOW_FROM.teachers, label: 'ustoz' },
        { value: stats.students, min: SHOW_FROM.students, label: "o'quvchi" },
        { value: stats.correctAnswers, min: SHOW_FROM.correctAnswers, label: "to'g'ri javob" },
      ].filter((fact) => fact.value >= fact.min)
    : [];

  return (
    <ul className={styles.heroFacts}>
      {facts.map((fact) => (
        <li key={fact.label}>
          <strong>{formatCount(fact.value)}</strong> {fact.label}
        </li>
      ))}
      <li>
        <strong>109</strong> mavzu
      </li>
      <li>
        <strong>3</strong> xil mashq
      </li>
    </ul>
  );
}

/** Trial, money back and the referral reward: whichever the admin offers. */
function Assurances({ settings }: { settings: PlatformSettings | undefined }) {
  if (!settings) return null;
  const items = [
    settings.trialDays > 0 && {
      icon: '🎁',
      title: `${settings.trialDays} kun bepul`,
      text: 'Birinchi oylik to‘lov sinov tugagach yechiladi.',
    },
    settings.moneyBackDays > 0 && {
      icon: '🛡️',
      title: `${settings.moneyBackDays} kunlik kafolat`,
      text: "Shu muddatda yoqmasa, to'lagan pulingizni to'liq qaytaramiz.",
    },
    settings.referralEnabled && {
      icon: '🤝',
      title: 'Hamkasbingizni olib keling',
      text: 'Akkaunt ochgan har bir hamkasbingiz uchun sizga 1 oy bepul — soni cheklanmagan.',
    },
  ].filter((item) => item !== false);

  if (items.length === 0) return null;
  return (
    <ul className={styles.assurances}>
      {items.map((item) => (
        <li key={item.title} className={styles.assurance}>
          <span className={styles.assuranceIcon} aria-hidden="true">
            {item.icon}
          </span>
          <span>
            <strong className={styles.assuranceTitle}>{item.title}</strong>
            <span className={styles.assuranceText}>{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
