// Captures the platform screens the Reels uses, from the browser-only dev backend
// (`npm run dev:local` on :5174) seeded with demo data. Nothing touches Supabase.
//
//   node capture/capture.mjs
//
// Output: public/screens/*.png at 1080 px wide (390 css px × DPR ≈2.77).
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const ORIGIN = 'http://reels.localhost:5174';
const OUT = new URL('../public/screens/', import.meta.url).pathname;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 390;
const H = 844;
const DPR = 1080 / W;

// Demo-only accounts that live in this headless browser's throwaway profile.
const ADMIN = { username: 'admin', password: 'reklama2026' };
const TEACHER = { username: 'ustoz', password: 'reklama2026' };
const STUDENT_PIN = '1234';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });

const shot = async (name, opts = {}) => {
  await sleep(opts.wait ?? 700);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: opts.fullPage ?? false });
  console.log('✓', name);
};
const go = async (path) => {
  await page.goto(ORIGIN + path, { waitUntil: 'networkidle0' });
  await sleep(500);
};
const clickText = (text) => page.locator(`::-p-text(${text})`).click();

// ---------- seed ----------
await go('/login');
await page.evaluate(
  async (ADMIN, TEACHER, PIN) => {
    const { createLocalPorts } = await import('/src/infrastructure/local/index.ts');
    const { DEFAULT_PRACTICE_CONFIG } = await import('/src/domain/practice/config.ts');
    const p = createLocalPorts(window, { now: () => new Date() });
    await p.auth.setUpAdmin(ADMIN);
    const tariff = (await p.tariffs.listAll())[0];
    await p.admin.createTeacher({
      ...TEACHER,
      firstName: 'Dilnoza',
      lastName: 'Karimova',
      phone: '+998993041155',
      centerName: 'Chaqqon akademiyasi',
      tariffId: tariff.id,
      billingStartsOn: null,
      bonus: 0,
    });
    await p.auth.signOut();
    await p.auth.signIn('teacher', TEACHER);

    const kids = [
      ['Aziza', 'Rahimova', 2016, 'B', 0.97, 7],
      ['Bekzod', 'Toshmatov', 2015, 'C', 0.94, 6],
      ['Madina', 'Yusupova', 2017, 'A', 0.91, 6],
      ['Jasur', 'Aliyev', 2015, 'C', 0.88, 6],
      ['Sevara', 'Nazarova', 2016, 'B', 0.86, 5],
      ['Malika', 'Ergasheva', 2014, 'D', 0.84, 5],
      ['Diyorbek', 'Qodirov', 2018, 'A', 0.8, 5],
      ['Sardor', 'Ismoilov', 2016, 'B', 0.8, 4],
      ['Zarina', 'Xolmatova', 2017, 'A', 0.75, 4],
      ['Asadbek', 'Mirzayev', 2015, 'C', 0.72, 3],
    ];
    const ids = [];
    for (const [firstName, lastName, birthYear, levelGroup] of kids) {
      const a = await p.students.create(
        { firstName, lastName, birthYear, levelGroup, avatarUrl: null, lastActiveAt: new Date().toISOString(), username: firstName.toLowerCase() },
        PIN,
      );
      ids.push(a);
    }
    // Paid for the month, so the list shows no "closed" badges.
    const until = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    for (const a of ids) await p.payments.record(a.id, until);

    for (const [i, a] of ids.entries()) {
      const [, , , , skill, sessions] = kids[i];
      await p.auth.signOut();
      await p.auth.signIn('student', { username: a.username, password: PIN });
      const results = [];
      for (let s = 0; s < sessions; s++) {
        const correct = Math.min(10, Math.round(10 * (skill - 0.04 + Math.random() * 0.08)));
        const at = new Date(Date.now() - (s * 26 + Math.random() * 20) * 36e5).toISOString();
        results.push({ id: crypto.randomUUID(), studentId: a.id, completedAt: at, config: DEFAULT_PRACTICE_CONFIG, correct, total: 10, mode: 'practice', roomId: null });
      }
      await p.results.add(results);
    }
    await p.auth.signOut();
  },
  ADMIN,
  TEACHER,
  STUDENT_PIN,
);
console.log('seeded');

const signIn = (role, creds) =>
  page.evaluate(
    async (role, creds) => {
      const { createLocalPorts } = await import('/src/infrastructure/local/index.ts');
      const p = createLocalPorts(window, { now: () => new Date() });
      await p.auth.signOut();
      await p.auth.signIn(role, creds);
    },
    role,
    creds,
  );

// ---------- teacher ----------
await signIn('teacher', TEACHER);
await go('/teacher');
await clickText('Yashirish').catch(() => {});
await shot('teacher-students');
await shot('teacher-students-full', { fullPage: true });

await go('/teacher/leaderboard');
await shot('leaderboard');

await go('/teacher/stats');
await shot('stats');
await shot('stats-full', { fullPage: true });

await go('/teacher/competition');
await clickText('A toifa');
await sleep(300);
for (const n of ['Madina', 'Diyorbek', 'Zarina']) await page.locator(`[aria-label="Ishtirokchilar"] ::-p-text(${n})`).click().catch(() => {});
await shot('homework');

await go('/teacher/abacus');
await shot('abacus-free');
await clickText('Sonni ter');
await shot('abacus-type');

await go('/teacher/worksheet');
await clickText('Varaqlarni yaratish');
await sleep(800);
await shot('worksheet-preview');
// The A4 sheet itself, from the preview on a desktop-wide page.
await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await sleep(800);
const sheet = (await page.$$('article')).at(0);
console.log('articles:', (await page.$$('article')).length);
if (sheet) {
  await sheet.screenshot({ path: `${OUT}worksheet-sheet.png` });
  console.log('✓ worksheet-sheet');
}
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });

// ---------- student ----------
await signIn('student', { username: 'aziza', password: STUDENT_PIN });
await go('/student');
await shot('student-setup');
// DOM clicks: the fixed bottom nav covers buttons low on the page, and a pointer click would hit it.
const domClick = (pred) =>
  page.evaluate((src) => {
    const match = new Function('b', `return ${src}`);
    const b = [...document.querySelectorAll('button')].find((el) => match(el));
    b?.click();
    return !!b;
  }, pred);
const start = () => domClick("b.textContent.trim() === 'Boshlash!'");
for (let i = 0; i < 45; i++) await domClick("(b.getAttribute('aria-label') || '').endsWith('kamaytirish')");
await start();
for (let i = 0; i < 10; i++) await shot(`anzan-${i}`, { wait: 500 });

await go('/student');
await clickText('Chaqnovchi');
await sleep(300);
await start();
for (let i = 0; i < 4; i++) await shot(`flash-${i}`, { wait: 600 });

await go('/student/abacus');
await shot('student-abacus');

await go('/student/leaderboard');
await shot('student-leaderboard');

await browser.close();
