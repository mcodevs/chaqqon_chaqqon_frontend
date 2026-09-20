import { Link } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionContext';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import styles from './TeacherProfilePage.module.css';

export function TeacherProfilePage() {
  const { signOut } = useSession();

  return (
    <div className={styles.container}>
      {/* 1. Ustoz kartochkasi */}
      <section className={styles.profileCard}>
        <div className={styles.avatar}>
          <span>👩‍🏫</span>
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.fullName}>Mohira ustoz</h2>
          <span className={styles.badge}>Boshqaruvchi ustoz</span>
        </div>
      </section>

      {/* 2. Ichki bo'limlar menyusi */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionTitle}>Qoʻshimcha boshqaruv boʻlimlari</div>
        <div className={styles.menuCard}>
          <Link to="/teacher/classroom" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconWarning}`}>🏫</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Sinf musobaqasi (Katta ekran)</span>
                <span className={styles.menuItemDesc}>Dars paytida proyektor yoki monitorda koʻrsatish</span>
              </div>
            </div>
            <div className={styles.menuItemRight}>
              <span className={styles.arrowIcon}>›</span>
            </div>
          </Link>

          <Link to="/teacher/market" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconBrand}`}>🎁</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Sovgʻalar doʻkoni boshqaruvi</span>
                <span className={styles.menuItemDesc}>
                  Sovgʻalar roʻyxatini toʻldirish va narxlarini belgilash
                </span>
              </div>
            </div>
            <div className={styles.menuItemRight}>
              <span className={styles.arrowIcon}>›</span>
            </div>
          </Link>

          <Link to="/teacher/leaderboard" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconBrand}`}>🏆</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Peshqadamlar reytingi</span>
                <span className={styles.menuItemDesc}>Barcha oʻquvchilarning reyting va medallari</span>
              </div>
            </div>
            <div className={styles.menuItemRight}>
              <span className={styles.arrowIcon}>›</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Ko'rinish sozlamasi — mobilda sidebar ko'rinmagani uchun shu yerda ham turadi */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionTitle}>Koʻrinish</div>
        <div className={styles.menuCard}>
          <div className={styles.themeRow}>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* 3. Chiqish */}
      <section className={styles.logoutSection}>
        <button type="button" onClick={signOut} className={styles.logoutBtn}>
          🚪 Tizimdan chiqish
        </button>
      </section>
    </div>
  );
}
