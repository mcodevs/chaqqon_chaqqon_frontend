import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { accessOf } from '@/domain/billing';
import { HOMEWORK_STATUS_META } from '@/domain/homework';
import { accuracyPercent } from '@/domain/results';
import { LEVEL_META } from '@/domain/users';
import { formatDate } from '@/shared/format';
import {
  usePayments,
  useResults,
  useSchoolToday,
  useStudentStars,
  useWrittenHomework,
} from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { useSession } from '@/shared/session/SessionContext';
import { AvatarPickerModal } from '@/shared/ui/AvatarPickerModal';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { useCurrentStudent } from './CurrentStudentContext';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import styles from './StudentProfilePage.module.css';

export function StudentProfilePage() {
  const student = useCurrentStudent();
  const { signOut } = useSession();
  const { students: studentService } = useServices();
  const stars = useStudentStars(student.id);
  const payments = usePayments();
  const results = useResults();
  const today = useSchoolToday();
  const homeworkList = useWrittenHomework();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const studentHomework = useMemo(() => {
    return homeworkList?.find((h) => h.studentId === student.id);
  }, [homeworkList, student.id]);

  const access = useMemo(() => {
    if (!payments) return null;
    return accessOf(payments, student.id, today);
  }, [payments, student.id, today]);

  const studentResults = useMemo(() => {
    if (!results) return [];
    return results.filter((r) => r.studentId === student.id);
  }, [results, student.id]);

  const stats = useMemo(() => {
    const totalRuns = studentResults.length;
    if (totalRuns === 0) return { totalRuns: 0, overallAccuracy: 0 };
    const totalCorrect = studentResults.reduce((acc, r) => acc + r.correct, 0);
    const totalProblems = studentResults.reduce((acc, r) => acc + r.total, 0);
    const overallAccuracy = accuracyPercent(totalCorrect, totalProblems);
    return { totalRuns, overallAccuracy };
  }, [studentResults]);

  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');

  const handleAvatarSelect = async (newUrl: string) => {
    await studentService.updateProfile(student.id, { avatarUrl: newUrl });
  };

  return (
    <div className={styles.container}>
      {/* 1. Profil asosiy kartochkasi */}
      <section className={styles.profileCard}>
        <div
          className={styles.avatarWrapper}
          onClick={() => setIsAvatarModalOpen(true)}
          title="Rasmni o'zgartirish"
        >
          <NameAvatar name={student.firstName} avatarUrl={student.avatarUrl} size={68} />
          <span className={styles.avatarEditBtn}>📷</span>
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.fullName}>{fullName}</h2>
          <div className={styles.roleBadgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRole}`}>
              {student.birthYear ? `${student.birthYear}-yil` : "O'quvchi"}
            </span>
            {student.levelGroup && (
              <span className={`${styles.badge} ${styles.badgeLevel}`}>
                {LEVEL_META[student.levelGroup]?.label ?? `${student.levelGroup} toifa`} (
                {LEVEL_META[student.levelGroup]?.formula})
              </span>
            )}
            {access && (
              <span className={`${styles.badge} ${access.open ? styles.badgeActive : styles.badgeInactive}`}>
                {access.open ? '✓ Faol hisob' : '✕ Toʻlov muddati oʻtgan'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 1.5. Yozma uy vazifasi holati */}
      <section className={styles.homeworkCard}>
        <div className={styles.homeworkHeader}>
          <div className={styles.homeworkTitle}>
            <span>📝 Yozma uy vazifasi</span>
          </div>
          {studentHomework ? (
            <span
              className={`${styles.badge} ${
                studentHomework.status === 'bajardi'
                  ? styles.statusBajardi
                  : studentHomework.status === 'chala'
                    ? styles.statusChala
                    : styles.statusBajarmadi
              }`}
            >
              {HOMEWORK_STATUS_META[studentHomework.status]?.icon}{' '}
              {HOMEWORK_STATUS_META[studentHomework.status]?.label}
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.statusChala}`}>Hali tekshirilmagan</span>
          )}
        </div>
        <p className={styles.homeworkDesc}>
          Ustoz bergan qog'ozdagi misollar holati. (Yozma uy vazifasi intizom uchun, yulduzcha berilmaydi).
        </p>
      </section>

      {/* 2. Yulduzchalar balansi kartasi */}
      <section className={styles.starsCard}>
        <div className={styles.starsContent}>
          <span className={styles.starsIcon}>⭐</span>
          <div className={styles.starsDetails}>
            <span className={styles.starsLabel}>Yulduzchalar balansi</span>
            <span className={styles.starsCount}>{stars?.balance ?? 0}</span>
          </div>
        </div>
        <Link to="/student/market" className={styles.starsActionBtn}>
          🎁 Sovgʻa tanlash
        </Link>
      </section>

      {/* 3. Tezkor yutuqlar / statistika qisqacha */}
      <section className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>Mashqlar soni</span>
          <span className={styles.statItemValue}>{stats.totalRuns} ta</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>Oʻrtacha aniqlik</span>
          <span className={styles.statItemValue}>{stats.overallAccuracy}%</span>
        </div>
      </section>

      {/* 4. Ichki bo'limlar menyusi (Mobile App Menyu) */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionTitle}>Boʻlimlar va tahlil</div>
        <div className={styles.menuCard}>
          <Link to="/student/results" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconInfo}`}>📈</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Natijalarim tarixi</span>
                <span className={styles.menuItemDesc}>Kunlik tahlil, foizlar va oʻsish grafigi</span>
              </div>
            </div>
            <div className={styles.menuItemRight}>
              <span className={styles.arrowIcon}>›</span>
            </div>
          </Link>

          <Link to="/student/market" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconWarning}`}>🎁</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Sovgʻalar doʻkoni</span>
                <span className={styles.menuItemDesc}>Yulduzchalarni ajoyib sovgʻalarga almashtiring</span>
              </div>
            </div>
            <div className={styles.menuItemRight}>
              <span className={styles.arrowIcon}>›</span>
            </div>
          </Link>

          <Link to="/student/leaderboard" className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <div className={`${styles.menuIconWrap} ${styles.menuIconBrand}`}>🏆</div>
              <div className={styles.menuItemText}>
                <span className={styles.menuItemTitle}>Peshqadamlar reytingi</span>
                <span className={styles.menuItemDesc}>Guruhdagi oʻquvchilar orasidagi oʻrningiz</span>
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

      {/* 5. To'lov va hisob ma'lumotlari */}
      {access && (
        <section className={styles.sectionBlock}>
          <div className={styles.sectionTitle}>Toʻlov holati</div>
          <div className={styles.menuCard}>
            <div className={styles.menuItem}>
              <div className={styles.menuItemLeft}>
                <div className={`${styles.menuIconWrap} ${styles.menuIconSuccess}`}>💳</div>
                <div className={styles.menuItemText}>
                  <span className={styles.menuItemTitle}>
                    {access.paidUntil ? `Toʻlangan: ${formatDate(access.paidUntil)} gacha` : 'Muddatsiz'}
                  </span>
                  <span className={styles.menuItemDesc}>
                    {access.open ? 'Hozirda barcha darslar va mashqlar ochiq' : 'Toʻlov muddati tugagan'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Chiqish bo'limi */}
      <section className={styles.logoutSection}>
        <button type="button" onClick={signOut} className={styles.logoutBtn}>
          🚪 Tizimdan chiqish
        </button>
      </section>

      {isAvatarModalOpen && (
        <AvatarPickerModal
          studentId={student.id}
          currentAvatarUrl={student.avatarUrl}
          onSelect={handleAvatarSelect}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}
    </div>
  );
}
