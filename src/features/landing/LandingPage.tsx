import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_META } from '@/domain/teacherBilling';
import { contactLine } from '@/features/teacher/subscription/subscriptionText';
import { formatSom } from '@/shared/format';
import { useOfferedTariffs, usePlatformSettings } from '@/shared/services/queries';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import styles from './Landing.module.css';
import { ApplicationForm } from './ApplicationForm';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Flesh-anzan mashqlari',
    text: "109 mavzu: formulasizdan miksgacha. Vaqt, qator va xona sonini o'zingiz belgilaysiz.",
  },
  {
    icon: '🧮',
    title: 'Interaktiv abakus',
    text: "Soroban ekranda: formulalarni qadam-baqadam ko'rsatadi, bola o'zi ham mashq qiladi.",
  },
  {
    icon: '📝',
    title: 'Uy vazifasi',
    text: "Har bir o'quvchiga o'z darajasiga mos vazifa. Natija va xatolar sizga darhol ko'rinadi.",
  },
  {
    icon: '🏫',
    title: 'Sinf musobaqasi',
    text: "Proyektor yoki doskada 2–4 o'quvchi bir vaqtda bellashadi. Dars qiziqarli o'tadi.",
  },
  {
    icon: '🏆',
    title: "Reyting va yulduzcha do'koni",
    text: "Xatosiz uy vazifasi — yulduzcha. Yulduzchalarga siz qo'ygan sovg'alar olinadi.",
  },
  {
    icon: '🖨️',
    title: 'Yozma vazifa varaqlari',
    text: "Mavzu bo'yicha A4 misollar varag'i bir bosishda tayyor, javoblari bilan.",
  },
  {
    icon: '💳',
    title: "To'lovlar nazorati",
    text: "Kim qachongacha to'lagani ko'rinib turadi. Muddati o'tgan o'quvchi profili o'zi yopiladi.",
  },
  {
    icon: '📱',
    title: 'Telegram bot',
    text: "Vazifa, natija va sovg'alar haqida ota-ona va ustozga bildirishnoma boradi.",
  },
];

const STEPS = [
  { title: 'Ariza qoldirasiz', text: 'Ism va telefon raqamingiz kifoya.' },
  { title: "Biz bog'lanamiz", text: 'Tarifni tanlab, akkauntingizni ochib beramiz.' },
  { title: "O'quvchilarni qo'shasiz", text: 'Har biriga login beriladi — mashq shu kuniyoq boshlanadi.' },
];

/** The platform's front door for teachers: what it does, what it costs, and the application form. */
export function LandingPage() {
  const tariffs = useOfferedTariffs();
  const settings = usePlatformSettings();
  const contact = contactLine(settings);
  const [chosenTariff, setChosenTariff] = useState<string | null>(null);

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
              O'quvchilaringiz har kuni mashq qiladi — siz natijani ko'rib turasiz
            </h1>
            <p className={styles.heroText}>
              Flesh-anzan mashqlari, abakus, uy vazifalari, sinf musobaqasi va to'lovlar nazorati — bitta
              ilovada. Telefon, planshet, kompyuter va Telegram'da ishlaydi.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.ctaSecondary} onClick={() => apply(chosenTariff)}>
                Ariza qoldirish
              </button>
              <Link to="/login" className={styles.ctaGhost}>
                Akkauntim bor — kirish
              </Link>
            </div>
            <ul className={styles.heroFacts}>
              <li>
                <strong>109</strong> mavzu
              </li>
              <li>
                <strong>3</strong> xil mashq
              </li>
              <li>
                <strong>Telegram</strong> bildirishnomalari
              </li>
            </ul>
          </div>
        </section>

        <section id="imkoniyatlar" className={styles.section}>
          <h2 className={styles.sectionTitle}>Darsdan tashqarida ham sinf bilan</h2>
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
            {STEPS.map((step, index) => (
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
                <article key={tariff.id} className={styles.tariff}>
                  <h3 className={styles.tariffName}>{tariff.name}</h3>
                  <p className={styles.tariffPrice}>
                    {formatSom(tariff.monthlyPrice)}
                    <span> / oy</span>
                  </p>
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
                  <button type="button" className={styles.tariffButton} onClick={() => apply(tariff.id)}>
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
        </section>

        <section id="ariza" className={styles.section}>
          <div className={styles.applyCard}>
            <h2 className={styles.sectionTitle}>Ariza qoldiring</h2>
            <p className={styles.muted}>
              Ma'lumotlaringizni qoldiring — biz bog'lanib, akkauntingizni ochib beramiz.
            </p>
            <ApplicationForm tariffs={tariffs ?? []} chosenTariffId={chosenTariff} />
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
