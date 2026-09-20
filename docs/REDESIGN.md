# Chaqqon-chaqqon — Redesign

**Sana:** 2026-09-20 · **Yo'nalish:** Warm Focus · **Qamrov:** butun ilova (ustoz + o'quvchi + sinf ekrani)

---

## Xulosa

Ilovada ikkita palitra va uchta ritm bir vaqtda yashab kelgan edi: iliq pastel (asosiy ekranlar),
Tailwind-slate (Do'kon/Profil) va tasodifiy o'lchamlar (48 xil font-size). Redizayn ularni **bitta
token qatlamiga** keltirdi: bitta neytral ramp, bitta brend rangi, 7 pog'onali tipografika, 4pt
grid — va shu qatlam ustida ierarxiya tiklandi: har ekranda bitta asosiy harakat, xavfli amallar
ko'zdan yiroq, ma'lumot ranglari faqat ma'no uchun. Dark mode noldan qo'shildi.

Funksionallik o'zgarmadi: state logikasi, so'rovlar, routing va domen kodiga tegilmagan —
faqat presentation qatlami.

---

## Audit topilmalari

| #   | Prioritet | Joy                  | Muammo                                                                          | Yechim                                                                                     | Holat |
| --- | --------- | -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| 1   | **P1**    | Butun ilova          | 48 xil font-size (px va rem aralash) — ierarxiya o'qilmaydi                     | 7 pog'onali type scale, 171 ta e'lon tokenga o'tkazildi                                    | ✅    |
| 2   | **P1**    | Do'kon, Profil       | Ikkinchi palitra (`#0f172a`, `#64748b`, `#3b82f6`) — ilova ikki xil mahsulotdek | 165 ta hardcoded rang semantik tokenga almashtirildi                                       | ✅    |
| 3   | **P1**    | Sahifa sarlavhasi    | Har doim "Ustoz paneli" — qayerdaligingiz bilinmaydi                            | Sarlavha faol nav elementidan olinadi; shaxs ma'lumoti sidebar pastiga ko'chdi             | ✅    |
| 4   | **P1**    | Layout               | `.contentArea` markazlashmagan — keng ekranda o'ng tomon bo'sh                  | `margin-inline: auto` + `max-width: 1120px`                                                | ✅    |
| 5   | **P1**    | O'quvchi qatori      | 4 ta bir xil vaznli tugma, "O'chirish" ham shunday; touch target ~30px          | "To'ladi" + "Tahrirlash" qoldi, "Yangi parol"/"O'chirish" ⋯ menyusiga; barcha target ≥44px | ✅    |
| 6   | **P1**    | O'quvchilar sahifasi | Qo'shish formasi ekran boshini egallagan, ro'yxat pastda                        | Forma yig'iladigan bo'ldi, ro'yxat birinchi; "+ O'quvchi qo'shish" — yagona primary        | ✅    |
| 7   | **P1**    | Kontrast             | `content-tertiary` 3.65:1 — 12px meta matn o'qilmaydi                           | Rang quyuqlashtirildi → 5.36:1 (card), 5.04:1 (page)                                       | ✅    |
| 8   | **P2**    | Spacing              | 6/10/14/18/22px — 4pt gridga tushmaydi                                          | 212 ta qiymat `--space-*` tokeniga snap qilindi                                            | ✅    |
| 9   | **P2**    | Dark mode            | Yo'q edi                                                                        | To'liq token to'plami: `prefers-color-scheme` + `data-theme` override                      | ✅    |
| 10  | **P2**    | Holatlar             | Loading = butun sahifa spinner; empty state quruq jumla                         | Ro'yxatli sahifalarga skeleton; empty state ikonka + sarlavha + keyingi qadam              | ✅    |
| 11  | **P2**    | Tugmalar             | Rang orqali ierarxiya (yashil submit, ko'k yordamchi, coral bekor)              | `primary/secondary/outline/ghost` variantlari; rang faqat ma'no uchun                      | ✅    |
| 12  | **P2**    | Statistika           | 4 ta KPI 4 xil rangda — nima muhimligi bilinmaydi                               | Faqat asosiy ko'rsatkich brend rangida, qolgani neytral                                    | ✅    |
| 13  | **P2**    | Sinf musobaqasi      | Ishtirokchi chiplari tanlanadiganga o'xshamaydi                                 | Haqiqiy checkbox belgisi + brend tinti                                                     | ✅    |
| 14  | **P2**    | Sinf ekrani          | Sarlavha/ism proyektor uchun kichik                                             | `clamp()` bilan viewportga bog'landi                                                       | ✅    |
| 15  | **P2**    | Mobil                | Ro'yxat qatori 900px da siqiladi (sidebar 248px yeydi)                          | Container query: qator o'z kengligiga qarab stack bo'ladi                                  | ✅    |
| 16  | **P3**    | Inline style         | 30+ joyda `style={{ background: '#fef3c7' }}`                                   | Semantik klasslarga ko'chirildi; faqat data-driven o'lchamlar qoldi                        | ✅    |
| 17  | **P3**    | Radius               | 4/6/8/10/12/16/18/20px aralash                                                  | 31 ta qiymat 4 ta radius tokeniga                                                          | ✅    |
| 18  | **P3**    | Soya                 | 12 xil `rgba()` soya                                                            | 3 pog'onali `--elevation-*`                                                                | ✅    |
| 19  | **P3**    | Mobil brauzer        | `theme-color` yo'q                                                              | Light/dark uchun `theme-color` + `viewport-fit=cover`                                      | ✅    |
| 20  | P3        | Emoji ikonkalar      | Nav label ichida string sifatida parse qilinardi                                | Layout ularni ajratib, alohida `aria-hidden` element qiladi                                | ✅    |
| 21  | **P1**    | Mashq (mobil)        | Flash raqami 375px ekranda 67px — bola uzoqdan o'qiy olmaydi                    | `clamp(72px, min(26vw, 18vh), 160px)` → mobilda 97px                                       | ✅    |
| 22  | **P2**    | Javob ekrani         | `type=number` ning native ▲▼ tugmalari maydonni yeydi, bola ularga tegib ketadi | Spinner o'chirildi, fokus halqasi brend rangiga keltirildi                                 | ✅    |
| 23  | **P2**    | Xato javob kartasi   | To'g'ri javob ko'k, o'z javobi kulrang 12px — taqqoslash qiyin                  | To'g'ri javob yashil, o'z javobi qizil 14px                                                | ✅    |
| 24  | **P2**    | Bo'limlar rangi      | Ikki bo'lim bir xil rangda (semantik tondan kelib chiqib)                       | Bo'limlar `--data-1…5` ramp'iga o'tkazildi — har biri alohida                              | ✅    |
| 25  | **P2**    | O'quvchi Do'koni     | To'liq sahifa spinner; "buyurtma yo'q" quruq kursiv qator                       | Skeleton (banner + grid), to'liq empty state                                               | ✅    |
| 26  | **P2**    | Interaktiv vazifa    | Uchala holat ham bir xil kulrang jumla                                          | Har biriga ikonka + sarlavha (📭 / ⏳ / 🎉)                                                | ✅    |
| 27  | P3        | Profil kartasi       | Burchakdagi blur dog'ga o'xshaydi                                               | Yumshoqroq va kengroq wash                                                                 | ✅    |
| 28  | P3        | Do'kon sarlavhalari  | "Mavjud Sovg'alar" — Title Case                                                 | Sentence case                                                                              | ✅    |

---

## Dizayn yo'nalishi — "Warm Focus"

Auditoriya ikki xil: **bolalar** (7–14 yosh, flash mashq, do'kon, reyting) va **ustoz**
(ro'yxat, statistika, to'lov — zich ma'lumot). Uchta muqobildan shu tanlandi:

- **Warm Focus** ✅ — iliq krem fon va yumaloq shakllar saqlanadi (bolalarga issiq), lekin tizimli:
  bitta neytral ramp, bitta brend rangi (violet) harakatlar uchun, qolgan ranglar faqat ma'no
  uchun. Bola ekranida katta tipografika, ustoz ekranida ixcham zichlik.
- Clean Utility — oq/kulrang, ko'k primary. Ustozga zo'r, bolaga sovuq. ✕
- Bold Play — to'yingan gradient va animatsiya. Ma'lumot ekranlarini buzadi, kontrast yo'qoladi. ✕

Qoidalar:

1. Har ekranda **bitta** primary harakat. Qolgani secondary/outline/ghost.
2. Brend rangi kam ishlatiladi — u "bu yerni bos" degani.
3. Semantik rang (yashil/sariq/qizil) hech qachon yolg'iz ma'no tashimaydi: yonida belgi yoki son bo'ladi.
4. Mascot raqamlar (`DigitCharacter`, avatarlar) — **illyustratsiya palitrasi**, UI palitrasi emas;
   ular to'yingan bo'lib qoladi, chunki brendning o'zagi shu.

---

## Token tizimi

Manba: [`src/styles/tokens.css`](../src/styles/tokens.css). Nomlar semantik — sahifa qaysi hex
olayotganini bilmaydi.

### Rang (light → dark)

| Token                                                | Light                             | Dark                  | Qayerda                                     |
| ---------------------------------------------------- | --------------------------------- | --------------------- | ------------------------------------------- |
| `--brand-primary`                                    | `#6d46d6`                         | `#a78bfa`             | Primary tugma, faol nav, fokus halqasi      |
| `--brand-primary-soft`                               | `#f0ebfd`                         | `#2e2740`             | Faol nav foni, toifa chipi                  |
| `--brand-accent`                                     | `#ff6b5c`                         | `#ff8b7e`             | Bolalar ekranidagi urg'u, bo'sh holat rasmi |
| `--surface-page`                                     | `#fdf7ee`                         | `#151219`             | Sahifa foni                                 |
| `--surface-card`                                     | `#ffffff`                         | `#1e1a25`             | Kartochka                                   |
| `--surface-soft` / `--surface-sunken`                | `#f8f5f0` / `#f2eee7`             | `#251f2e` / `#121016` | Ichki blok, segment fon                     |
| `--content-primary`                                  | `#241f2b`                         | `#f4f1f8`             | Asosiy matn — 16:1                          |
| `--content-secondary`                                | `#5d5768`                         | `#bcb4c7`             | Yordamchi matn — 6.9:1                      |
| `--content-tertiary`                                 | `#6e6878`                         | `#8f879c`             | Meta, label — 5.4:1                         |
| `--border-subtle` / `--border-strong`                | `#ece6dd` / `#ddd4c8`             | `#322b3d` / `#463d55` | Chegara, input                              |
| `--success` / `--success-soft` / `--success-content` | `#2f8f4e` / `#e6f6ea` / `#1f6b39` | ...                   | To'lov ochiq, "Bajardi", yuqori aniqlik     |
| `--warning` / `--warning-soft` / `--warning-content` | `#c8761a` / `#fdf0dd` / `#8c5310` | ...                   | "Chala", o'rtacha natija, yulduzlar         |
| `--danger` / `--danger-soft` / `--danger-content`    | `#cf4436` / `#fdeae8` / `#9c2f24` | ...                   | "Bajarmadi", yopiq hisob, o'chirish         |
| `--info` / `--info-soft` / `--info-content`          | `#2d77c9` / `#e7f1fc` / `#1f5795` | ...                   | Neytral ma'lumot                            |
| `--data-1…5`                                         | violet/ko'k/yashil/amber/pushti   | yoritilgan variantlar | Diagramma, bo'lim ranglari                  |
| `--medal-gold/silver/bronze`                         | `#e0a32b` / `#9aa0ab` / `#b9743c` | yoritilgan            | Reyting medallari                           |
| `--abacus-*`                                         | yog'och, suyak, amber             | quyuq yog'och         | Vizual soroban (illyustratsiya palitrasi)   |

**Kontrast (o'lchangan, WCAG AA = 4.5):**

| Juftlik                               | Light     | Dark      |
| ------------------------------------- | --------- | --------- |
| content-primary / card                | 16.08     | 15.28     |
| content-secondary / card              | 6.93      | 8.53      |
| content-tertiary / card               | 5.36      | 4.97      |
| brand-primary / card                  | 6.00      | 6.28      |
| on-primary / brand                    | 6.00      | 6.58      |
| success/warning/danger-content / soft | 5.56–6.44 | 7.59–8.51 |

### Tipografika

| Token                               | Qiymat             | Ishlatilishi                          |
| ----------------------------------- | ------------------ | ------------------------------------- |
| `--text-display` / `--size-display` | 800 40px/1.1 Baloo | Natija soni, yakuniy ball             |
| `--text-h1` / `--size-h1`           | 800 28px/1.2       | Sahifa sarlavhasi                     |
| `--text-h2` / `--size-h2`           | 800 22px/1.25      | Mobil app bar, katta bo'lim           |
| `--text-h3` / `--size-h3`           | 700 18px/1.35      | Kartochka sarlavhasi, o'quvchi ismi   |
| `--text-body-lg` / `--size-body-lg` | 600 16px/1.5       | Asosiy o'qish o'lchami, input         |
| `--text-body` / `--size-body`       | 600 14px/1.5       | Zich UI matni                         |
| `--text-caption` / `--size-caption` | 700 12px/1.35      | Label, meta, chip                     |
| `--size-hero` / `--size-countdown`  | 56px / 80px        | Emoji illyustratsiya, "3-2-1" sanog'i |

Flash raqamlari alohida: `--flash-size: clamp(64px, 18vw, 140px)` (mashq), sinf ekranida
`clamp(48px, 42cqmin, 320px)` — panel o'lchamiga qarab.

### Tema tanlovi

`data-theme` atributi `<html>` da: `light` / `dark` / yo'q (= tizim sozlamasi).
Tanlov `localStorage['chaqqon.theme']` da saqlanadi va `index.html` dagi kichik skript uni
birinchi renderdan oldin qo'llaydi — shuning uchun sahifa noto'g'ri rangda "chaqnab" ketmaydi.
Standart qiymat — **light**: ilova doim shunday ko'ringan va proyektorda yaxshi o'qiladi.

| Fayl                               | Vazifasi                                       |
| ---------------------------------- | ---------------------------------------------- |
| `src/shared/theme/theme.ts`        | Tanlovni o'qish/yozish va `<html>` ga qo'llash |
| `src/shared/theme/useTheme.ts`     | React hook (holat + saqlash)                   |
| `src/shared/theme/ThemeToggle.tsx` | Uch holatli segment tanlagich                  |

### Spacing, radius, elevation, motion

| Guruh     | Tokenlar                                                                                    |
| --------- | ------------------------------------------------------------------------------------------- |
| Spacing   | `--space-1…8` = 4, 8, 12, 16, 24, 32, 48, 64                                                |
| Radius    | `--radius-sm` 8 · `md` 12 · `lg` 18 · `xl` 28 · `full` 999                                  |
| Elevation | `--elevation-0…3` (dark rejimda quyuqroq soyalar)                                           |
| Motion    | `--motion-fast` 120ms · `base` 200ms · `slow` 320ms; `--ease-standard`, `--ease-decelerate` |
| Layout    | `--sidebar-width` 248 · `--content-max-width` 1120 · `--touch-target` 44                    |

---

## Komponentlar

| Komponent                           | Variantlar                                                                                                                     | Holatlar                                                     | A11y                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Button**                          | `primary` (bitta/ekran), `secondary` (tint), `outline`, `ghost`; `sm/md/lg`; `tone`: brand/success/warning/danger/info/neutral | hover, active (1px pastga), disabled (0.45), focus-visible   | Barcha o'lcham ≥44px (`pointer: coarse` da `sm` ham)         |
| **Card**                            | sarlavha + amallar ixtiyoriy                                                                                                   | —                                                            | Sarlavha `h3`                                                |
| **TextField**                       | —                                                                                                                              | hover, focus (chegara + 3px halqa), disabled, `aria-invalid` | Label har doim bog'langan                                    |
| **SegmentedControl**                | `boxed`, `pill`                                                                                                                | checked, hover                                               | `role=radiogroup`, `aria-checked`                            |
| **TabNav**                          | pill tablar                                                                                                                    | active, hover                                                | `NavLink` + `aria-current`                                   |
| **MenuButton** (yangi)              | ⋯ tugma + popover                                                                                                              | open, hover, danger element                                  | `aria-haspopup/expanded`, Escape va tashqariga bosish yopadi |
| **EmptyState** (kengaytirildi)      | oddiy jumla yoki ikonka + sarlavha + amal                                                                                      | —                                                            | —                                                            |
| **Skeleton / SkeletonList** (yangi) | qator/avatar shakli                                                                                                            | shimmer (reduced-motion da o'chadi)                          | `role=status`                                                |
| **DashboardLayout**                 | sidebar (≥900px) / app bar + bottom nav (<900px)                                                                               | faol element, sub-sahifada "Orqaga"                          | `aria-label` li nav, ikonkalar `aria-hidden`                 |

---

## O'zgartirilgan fayllar

| Fayl                                                                                  | Nima                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/styles/tokens.css`                                                               | To'liq qayta yozildi: semantik tokenlar, light + dark, type scale                   |
| `src/styles/global.css`                                                               | Base tipografika, fon washi, fokus halqasi, reduced-motion                          |
| `src/shared/ui/tone.ts`                                                               | Semantik tonlar (`brand/success/...`) + eski nomlar moslamasi                       |
| `src/shared/ui/Button.{tsx,module.css}`                                               | Yangi variantlar, o'lchamlar, touch target                                          |
| `src/shared/ui/MenuButton.{tsx,module.css}`                                           | **Yangi** — overflow menyu                                                          |
| `src/shared/ui/LoadingScreen.{tsx,module.css}`                                        | `Skeleton`, `SkeletonList` qo'shildi                                                |
| `src/shared/ui/Notice.{tsx,module.css}`                                               | Boy empty state                                                                     |
| `src/shared/ui/DashboardLayout.{tsx,module.css}`                                      | Sahifa sarlavhasi, markazlangan kontent, yangi nav                                  |
| `src/shared/ui/{Card,TextField,SegmentedControl,TabNav,AvatarPickerModal}.module.css` | Token qatlamiga o'tkazildi                                                          |
| `src/features/teacher/*`                                                              | Ro'yxat qatori qayta qurildi, forma yig'iladigan, KPI ierarxiyasi, menyu ikonkalari |
| `src/features/student/*`                                                              | Do'kon/Profil/Natijalar palitrasi, yulduz chipi, diagramma ranglari                 |
| `src/features/competition/*`                                                          | Ishtirokchi chiplari, proyektor o'lchamlari, tugma ierarxiyasi                      |
| `src/features/practice/*`                                                             | Sahna (stage) tinchlantirildi, flash raqamlar kattalashdi, bitta primary            |
| `src/features/auth/*`                                                                 | Login kartasi, brend rangi                                                          |
| `index.html`                                                                          | `color-scheme`, `theme-color`, `viewport-fit`                                       |

Jami: 70 ga yaqin fayl, funksional kodga tegilmagan (`src/domain`, `src/application`,
`src/infrastructure` — o'zgarishsiz).

---

## Tekshirildi

- `npm run build` ✅ · `tsc -b` ✅ · 286 ta test ✅ · oxlint — faqat eski ogohlantirish
- **Ustoz ekranlari** brauzerda ko'rildi: O'quvchilar (1440/1280/900/375px), Statistika, Reyting,
  Do'kon, Interaktiv vazifalar, Sinf musobaqasi (sozlash + jonli match), Profil
- **O'quvchi ekranlari** brauzerda ko'rildi (o'quvchi hisobi bilan kirilib): Mashq sozlash,
  flash, javob, xato tahlili, Natijalarim, Do'kon, Reyting, Profil, Interaktiv vazifa —
  desktop (1280) va mobil (375), light va dark
- Local (brauzer xotirasi) rejimi qo'shildi: `npm run dev:local` — Supabase'ga tegmasdan
  butun ilovani sinash uchun (`.claude/launch.json` da `web-local`)
- Dark mode: desktop va mobil
- Kontrast: yuqoridagi jadval (JS bilan o'lchangan)
- Hardcoded rang: UI kodida **0** ta (qolgani faqat mascot/avatar illyustratsiyasi va tokens.css)

---

## Qolgan ishlar

1. **Mashq ekranini to'liq ekranga olish** — hozir flash paytida ham sidebar/bottom nav ko'rinadi;
   sinf rejimidagidek diqqatni jamlaydigan rejim foydali bo'lishi mumkin.
2. **Emoji → ikonka to'plami** — emojilar platformaga qarab har xil ko'rinadi; SVG to'plamiga o'tish.
3. **Do'kon sahifasi tuzilishi** — forma va ro'yxat hali ham yonma-yon; ustoz uchun "ro'yxat avval"
   tartibi mantiqiyroq bo'lishi mumkin.
4. **Matn/microcopy audit** — sarlavhalarda Title Case va sentence case aralash.
