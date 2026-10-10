---
name: landing-redizayn
description: "2026-10-10/11: landing qayta loyihalandi — 'Jonli raund'
  (demo-first), review/polish (49 tuzatish), responsive (telefon <768 / planshet
  768–1023 / desktop ≥1024 / keng ≥1440, --lp-max); egasi 2026-10-11 push qilishga ruxsat berdi"
metadata:
  type: project
---

# Landing redizayni ("Jonli raund")

Foydalanuvchi so'rovi (2026-10-10): landing "bir qarashda tortadigan, zamonaviy, interaktiv va animatsiyali" bo'lsin.

## Qanday tanlandi

Uchta mustaqil konsepsiya (demo-first, emotsional brend, konversiya-first) uch nuqtai nazardan baholandi
(ustoz, muhandis, o'sish): demo-first 8.5 / 8 / 7, konversiya 7.5 / 7 / 8, brend 6 / 5.5 / 5.5.
**Asos — demo-first**, konversiyadan bo'sh prod holati, FAQ, skelet kartalar, form `<details>`;
brenddan auditoriya bo'yicha imkoniyatlar, soroban o'quv yo'li, bead BrandMark olindi.

## Asosiy qarorlar

- Birinchi ekranda **haqiqiy** flesh-anzan raundi (`useFlashSession` + `FlashDigits`, `generateProblem`):
  mehmon sonlarni ko'radi, yig'indini yozadi; ostida "Ustoz panelida shunday ko'rinadi" (faqat o'z natijasi,
  hech qayerga yuborilmaydi). Tezliklar 1,5 / 1 / 0,7 s (0,3 s yo'q — WCAG 2.3.1).
- Soroban bo'limi: 6 bosqichli o'quv yo'li (`planMove` misollari testda qulflangan) + "O'zingiz suring" o'yini
  (`--soroban-rod-w` bilan ≥44px toshlar). `FormulaTutor` dagi `buildFrames` → `domain/practice/abacus.ts`
  dagi `problemFrames` ga ko'chirildi.
- Halollik: soxta raqam/fikr/logotip/taymer yo'q; doimiy faktlar koddan (`TOPICS.length` va h.k.); real
  statistika chegaradan keyin; referal faqat taklif qilganga.
- Harakat: cheksiz loop yo'q; reveal, count-up, vinyetkalar bir marta; `prefers-reduced-motion` da hammasi
  statik. Lead qo'shimchasi: hero kirish xoreografiyasi, idle "teaser" (bir marta, <2,5 s), Boshlash pulsi (3 marta).
- **Yozuvlar ikki qatorga bo'linmaydi** (foydalanuvchi ikki marta shikoyat qilgan) — `FilterPills` naqshi.
- `tokens.css` / `global.css` / `index.html` o'zgarmaydi; yangi bog'liqlik yo'q.

Spetsifikatsiya va qo'shimcha sessiya scratchpad'ida edi; qurish uch to'lqinda: poydevor → 8 bo'lim parallel →
shell. Bog'liq: [[osish-vositalari]], [[platforma-kop-ustoz]].

## Holat

2026-10-10: qurilmoqda (workflow). Brauzerda tekshiruv va mustaqil review hali oldinda.

Birinchi qurish urinishida tarmoq uzilib (ENOTFOUND) poydevordan keyingi 9 agent yiqildi; poydevor (motion, art, content, demoConfig, `pricePerStudent`, `problemFrames`) tayyor qoldi. Workflow `resumeFromRunId` bilan qayta ishga tushirildi — poydevor keshdan, qisman yozilgan fayllar (Apply/ApplicationForm, Tariffs, curriculum) agentlar tomonidan o'qilib yakunlanadi.

Qurish tugadi (shell'ni lead yakunladi: `motionOn` effekt o'rniga `useState` initializer — lint `set-state-in-effect`). Typecheck/lint/build toza, testlar 578/578. Brauzerda (local, 360/913/1280): 360×640 birinchi ekran byudjeti bajarildi (Boshlash 497px, pill 574px), overflow 0; demo, TeacherPeek, soroban yo'li, tarif tanlagich + forma prefill ishlaydi.
Lead topgan kamchiliklar → review/polish workflow'ga berildi: demo javobi 0 bo'lishi mumkin (≥2 talab), desktop hero'da natija o'sganda chap ustun siljiydi, 768–1023px da stage chapga yopishgan, 2 tarif kartasi chapda, PaymentsDemo bo'sh joy, desktop hero "wow" yetishmaydi.
Tuzoq: brauzer tabida qolgan eski scroll/focus holati sahifani "sakratgandek" ko'rsatdi — toza yuklashda yo'q; tekshiruvni har doim yangi URL bilan boshlash.

**Review/polish (2026-10-11):** 5 lens (spec+copy, a11y+motion, bugs, layout+theme, wow+perf) → har topilma skeptik tomonidan tekshirildi → 49 ta tasdiqlangan tuzatish fayl egasi bo'yicha qo'llandi; 585/585 test, build toza. Arxitektura o'zgarishlari:
- `AppRouter` landing'ni **lazy** yuklaydi (`loadLanding()`, `/` da va Telegram'dan tashqarida oldindan preload, `<Suspense fallback={null}>`): asosiy JS 184 → 133 KB gz, landing alohida chunk (24 KB JS + 15 KB CSS gz).
- Sticky header/bar ostida fokus yo'qolmasligi uchun `html:has(.page)` da `scroll-padding-top/bottom` (sektsiya `scroll-margin` o'rniga).
- `DigitCharacter` raqam rangi `--ink` (`#fff`, komponent ichida) — dark mode'da kontrast.
- `PAYMENT_QUICK_MONTHS` (`domain/billing.ts`) — PaymentForm va landing PaymentsDemo bitta manbadan.
- Demo javobi ≥ `MIN_DEMO_ANSWER`; desktop hero ikki trekli (chap ustun siljimaydi); tarif kartalari markazda; "{n} o'quvchiga yetmaydi"; referal hinti o'chiq bo'lsa "Ixtiyoriy."
- Hero subline halollik uchun "Siz esa kim mashq qilganini ko'rasiz." ga o'zgardi (natijalar faqat `stats` tarifida) — **egasi tasdiqlashi kutilmoqda**.
Qolgan: DemoStage desktop o'lchami + glowIn, Tariffs/TeacherPeek "Natijalar" matni, brauzerda yakuniy tekshiruv, keyin push ruxsati.

**Responsive (2026-10-11, egasi so'radi: "Desktop/Tablet/Phone formatlariga mosla"):** o'lchov (320–1920) gorizontal overflow yo'qligini ko'rsatdi; muammo — formatlar "loyihalanmagan" ko'rinardi: planshetda stage chapga yopishgan, nav faqat ≥900 da, tariflarda yolg'iz 3-karta, kafolat sarlavhalari tekislanmagan; desktopda Imkoniyatlar uch notekis ustun (o'rtasi ~600px uzun), 1024 da siqiq; telefonda tariflar ~2950px, ClassroomRace runner chetdan chiqadi.
Qarorlar:
- Breakpointlar: telefon <768, planshet 768–1023.98, desktop ≥1024, keng ≥1440.
- `.page` da `--lp-max` (1120 → ≥1440 da 1200px). Barcha bo'lim qutilari `var(--content-max-width)` o'rniga `var(--lp-max)` dan foydalanadi.
- Imkoniyatlar guruhlari qatorma-qator joylashadi: planshetda sarlavha ustida, desktopda chapda (sticky), kartalar ikki muvozanatli ustunda.
- Planshet hero markazlashtiriladi.
- Nav va 3 qadamli qator 768 dan ko'rinadi.
- Tariflar: planshetda yolg'iz karta qolmaydi; telefonda scroll-snap qator tavsiya etildi.

Bajarildi: workflow'da 6 fixer ishladi, keyin telefon/planshet/desktop reviewerlari 18 ta topilma berdi va refix ularni yopdi. 320–1920 audit toza (overflow, wrapped label, kichik target yo'q). 585/585 test, typecheck/lint/build toza; landing chunk 25,6 KB JS + 17,4 KB CSS gz.
Natijada:
- Tariflar: telefonda scroll-snap qator (featured markazda, balandlik ko'rinayotgan kartaga moslashadi). Planshetda va desktopda 1, 2 yoki 4+ tarif bo'lsa, keng gorizontal kartalar. Desktopda aynan 3 tarif bo'lsa, subgrid qator va tugma narx ostida.
- Ariza: desktopda 2 ustun (chapda "Qanday boshlanadi" qadamlari). Telefonda chip qatorlari scroll qiladi. "Hali bilmayman" chipi endi birinchi.
- Footer: planshetda 2 ustun, desktopda 1 qator.
- Landscape telefon: header scroll bilan ketadi, hero ikki ustun bo'ladi.
- `#hero-cta` endi qator emas, tarif pill tugmasining o'zi.
- Abakus: qisqa desktop ekranlarda (<900px balandlik) player `svh` formulasi bilan kichrayadi.
Egasiga aytiladigan trade-off'lar: "qayerdan eshitdingiz" chiplari telefonda scroll qiladi (oldin wrap edi); desktopda ariza yonida qadamlar takrorlanadi.
Tuzoq: headless Chrome `--window-size` 500px'dan tor layout bermaydi, telefon skrinshotlari yolg'on chiqadi. CDP `Emulation.setDeviceMetricsOverride` (mobile:true) kerak. Toza profilda local backend bo'sh bo'ladi, shuning uchun tariflar localStorage'ga seed qilinadi.
Bog'liq: [[osish-vositalari]].