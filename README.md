# Chaqqon-chaqqon

Bolalar uchun mental arifmetika (flash-anzan) mashq ilovasi. Ustoz o'quvchilarni boshqaradi,
o'quvchilar abakus formulalari bo'yicha mashq qiladi. Ilovada sinf reytingi, jonli onlayn musobaqa xonasi
va sinfda bitta ekranda o'tkaziladigan split-screen musobaqa bor.

**Ilova manzili:** https://chaqqon-chaqqon.vercel.app

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit testlar (Vitest), jumladan PGlite'dagi RLS testlari
npm run typecheck  # tsc
npm run lint       # oxlint
npm run build      # production build
```

`.env.local` bo'lmasa, ilova to'liq brauzerda (localStorage) ishlaydi. Supabase'ga ulash quyida.

## Deploy (Vercel)

Frontend Vercel'da joylashgan: `chaqqon-chaqqon` loyihasi. U GitHub'dagi
[`mcodevs/chaqqon_chaqqon_frontend`](https://github.com/mcodevs/chaqqon_chaqqon_frontend) repozitoriyiga ulangan:

- `main` branchiga push qilinsa, Vercel production'ni o'zi yangilaydi;
- boshqa branchlar uchun alohida preview manzil yaratiladi.

Supabase manzili va publishable kalit Vercel'ning Environment Variables bo'limida saqlanadi. `vercel.json` sahifa
yangilanganda ichki yo'nalishlar ochilishini ta'minlaydi.

Commit qilmasdan ham deploy qilish mumkin. Bunda `.vercelignore` lokal maxfiy fayllarni (`.env.local`,
`supabase/.temp`) yuklamaydi:

```bash
npx vercel deploy --prod
```

Sxema o'zgargan bo'lsa, avval migratsiyani Supabase'ga qo'llang, keyin push qiling.

## Backend

| Rejim    | Qachon                                                          | Hisoblar                  | Ma'lumotlar                        |
| -------- | --------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| Local    | `.env.local` yo'q                                               | PBKDF2 xesh, localStorage | localStorage, tablar orasida jonli |
| Supabase | `VITE_SUPABASE_URL` va `VITE_SUPABASE_PUBLISHABLE_KEY` berilgan | Supabase Auth             | Postgres + RLS, Realtime           |

### Supabase'ni ulash

1. [supabase.com](https://supabase.com) da loyiha yarating.
2. Sxema va Edge Function'larni joylang (Docker shart emas):

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase functions deploy register-teacher
   npx supabase functions deploy manage-students
   ```

3. `.env.example` ni `.env.local` ga nusxalang. Dashboard → Project Settings → API keys bo'limidan
   Project URL va publishable key'ni yozing. Service-role (secret) kalit hech qachon frontendga qo'yilmaydi.
4. `npm run dev` ni ishga tushiring. Birinchi ochilishda ustoz hisobi yaratiladi.

### Qanday ishlaydi

- **Hisoblar** Supabase Auth'da saqlanadi. `ali10` logini `ali10@chaqqon.example.com` manziliga aylanadi,
  bu manzilga xat yuborilmaydi. 4 xonali PIN esa Auth'ning 6 belgili talabiga prefiks bilan moslanadi.
  Bu qoidalar klient va funksiyalar uchun yagona kontraktda: `supabase/functions/_shared/identity.ts`.
- **Hisoblarni boshqarish** Auth admin API'ni talab qiladi. Ustoz hisobini yaratish, o'quvchi yaratish,
  yangi parol berish va o'chirish shu sabab `register-teacher` va `manage-students` Edge Function'larida
  bajariladi. `manage-students` chaqiruvchi ustoz ekanini o'zi tekshiradi.
- **RLS** qoidalari:
  - mehmon faqat "ustoz bormi?" deb so'ray oladi;
  - sinfdoshlar bir-birining ismini ko'radi, loginlarni esa faqat ustoz ko'radi (`student_accounts()` orqali);
  - o'quvchi faqat o'z natijasini yozadi (mashq yoki onlayn musobaqa);
  - sinf musobaqasi natijasini faqat ustoz yozadi va faqat o'quvchilar uchun;
  - musobaqa progressini faqat xona ishtirokchisi yozadi, faqat xona boshlanganda;
  - xonani faqat ustoz boshqaradi, bir vaqtda bitta faol xona bo'ladi;
  - to'lovni faqat ustoz yozadi. Sana ertangi kundan 24 oygacha bo'lishi kerak va baza soati bo'yicha tekshiriladi;
  - to'lovi tugagan o'quvchi faqat o'z profili va to'lovlarini ko'radi, hech narsa yoza olmaydi. To'lov ustozni
    cheklamaydi.

  Barcha qoidalar `src/infrastructure/supabase/schema.test.ts` da haqiqiy migratsiya ustida sinaladi.

- **Realtime** `rooms`, `room_progress`, `practice_results` va `student_payments` o'zgarishlarini uzatadi:
  musobaqa monitori va reyting jonli yangilanadi, yopiq o'quvchining sahifasi esa to'lov belgilanishi bilan
  ochiladi. `profiles` Realtime'ga qo'shilmagan, aks holda loginlar payload'da ko'rinib qolardi.
- Sxema o'zgarsa, tiplarni qayta yarating:
  `npx supabase gen types typescript --linked > src/infrastructure/supabase/database.types.ts`.

## Arxitektura

Qatlamlar faqat ichkariga bog'lanadi: `presentation → application → domain`.
`infrastructure` application portlarini amalga oshiradi va faqat composition root'da ulanadi.

```
src/
├── domain/            Toza biznes qoidalar — React, storage, brauzerdan mustaqil
│   ├── practice/      soroban (harakat tasnifi), problem (generator), session (reducer + vaqt qoidalari)
│   ├── classroom.ts competition.ts leaderboard.ts results.ts users.ts random.ts
├── application/       Use-case servislar, portlar (AuthGateway, repozitoriylar), AppError kodlari
├── infrastructure/
│   ├── local/         Brauzer backend'i: localStorage, PBKDF2, sessionStorage
│   ├── supabase/      Supabase backend'i: Auth, Postgres (RLS), Realtime, Edge Function chaqiruvlari
│   └── storage/ security/ shared/
├── app/               Composition root (backend tanlovi), provider'lar, router, guard'lar
├── features/          Sahifalar: auth, teacher, student, practice, competition (onlayn xona va
│                      classroom/ — sinf musobaqasi), leaderboard
├── shared/            Qayta ishlatiladigan UI, hook'lar, i18n (xato matnlari), servis konteksti
├── styles/            Dizayn tokenlari va global stil
└── testing/           Test uchun in-memory bog'liqliklar
supabase/
├── migrations/        Sxema, ruxsatlar, RLS siyosatlari, Realtime publikatsiyasi
└── functions/         register-teacher, manage-students, _shared (identity kontrakti, validatsiya)
```

### Asosiy qarorlar

- **Misol generatori** (`domain/practice/`) soroban ustunlarini simulyatsiya qiladi. Har qatorda ±1…9,
  jami hech qachon manfiy bo'lmaydi. Har bir harakat birlar ustunidan boshlab, o'tkazmasi bilan tasniflanadi:

  | Bo'lim       | Harakat qoidasi                                         | Talab                                   |
  | ------------ | ------------------------------------------------------- | --------------------------------------- |
  | Formulasiz   | Faqat birlar ustuni, toshlar yetadi                     | Har bir harakat                         |
  | Kichik do'st | Faqat birlar ustuni, 5 ga to'ldirish                    | Har bir harakat (1–8 dan boshlanadi)    |
  | Katta do'st  | 10 ga to'ldirish, o'nliklarga ±1 to'g'ridan-to'g'ri     | Harakatlarning kamida 60%               |
  | Miks (oila)  | O'tkazilgan ±1 keyingi ustunda ham formula talab qiladi | Birinchi harakat (41–99 dan boshlanadi) |

  Talab bajarilmasa, misol qayta yaratiladi (80 martagacha). Ustun qoidalarining mos yozuvlar artifakti
  (`ChaqqonChaqqon.jsx`) bilan barcha holatlarda ekvivalentligi testda tekshiriladi.
  Tasodifiylik `Random` orqali uzatiladi, shuning uchun testlar deterministik.

- **Mashq sessiyasi** toza reducer'da (`domain/practice/session.ts`) boshqariladi. Sessiyada bir yoki bir
  nechta "lane" bo'ladi: oddiy mashqda bitta, sinf musobaqasida har bir o'quvchiga bittadan. Barcha lane'lar
  bir vaqtda o'tadi. Tartib: "Tayyor turing…" (0,9 s), keyin sonlar, so'ng javob. Oddiy mashqda to'g'ri
  javobdan keyin 1,3 s o'tib avtomatik davom etadi, xato javobda ustun tahlili uchun to'xtaydi.
  Barcha vaqtlar `SESSION_TIMING` da.
- **Sonlar almashish vaqti** (`secondsPerNumber`) 0,3 s dan 7 s gacha, 0,1 s qadam bilan tanlanadi.
  Bu bir son chiqqandan keyingisi chiqquncha o'tadigan to'liq vaqt. Ketma-ket ikkita bir xil son ham sezilishi
  uchun, uning oxirida qisqa bo'sh ekran bor. Bo'sh ekran 0,2 s, lekin shu vaqtning to'rtdan biridan oshmaydi.
  Masalan, 0,3 s tezlikda son 225 ms ko'rinadi, keyin 75 ms bo'sh ekran chiqadi (`numberTiming`).
  Oldin saqlangan 7 s dan uzun sozlamalar o'qilganda 7 s ga tushiriladi.
- **Sinf musobaqasi** (`features/competition/classroom/`) — ustoz bitta ekranni 2–4 panelga bo'ladi.
  Sozlama hammaga bir xil, lekin har bir panelda o'z sonlari chiqadi. O'quvchilar javobni aytadi, ustoz uni
  panelga kiritadi (Enter keyingi panelga o'tkazadi). Keyingi misolni ham ustoz boshlaydi. Natijalar bitta
  so'rovda saqlanadi. O'rinlar to'g'ri javoblar soni bo'yicha belgilanadi, teng natijaga bir xil o'rin beriladi.
- **Natija turi** — har bir natijada `mode` bor: `practice`, `online` yoki `classroom`. "Natijalarim"da onlayn
  musobaqa 🏆, sinf musobaqasi 🏫 belgisi bilan ko'rsatiladi.
- **To'lov** (`domain/billing.ts`). Ustoz "To'ladi" tugmasini bosib, o'quvchi qaysi sanagacha ochiq bo'lishini
  kiritadi: sanani o'zi tanlaydi yoki "1–4 oy" tugmalaridan birini bosadi (o'quvchilar oldindan bir necha oyga
  to'lashi mumkin). Oylar joriy muddat oxiridan sanaladi, shuning uchun oldindan to'langanda kun yo'qolmaydi.
  Kiritilgan sanada profil yopiladi. Sana ertangi kundan 24 oygacha bo'lishi kerak, buni baza soati tekshiradi.
  Oxirgi yozilgan to'lov amal qiladi: xato sana to'g'risini yozib tuzatiladi, "bekor qilish" esa oldingi to'lovni
  qaytaradi. Kunlar Toshkent vaqti (UTC+5) bo'yicha sanaladi. Yopiq o'quvchi "Profilingiz yopiq" sahifasini
  ko'radi, bu sahifa to'lov belgilanishi bilan o'zi ochiladi. To'lov tizimi ishga tushganda bor bo'lgan
  o'quvchilar shu oy oxirigacha ochiq qoldi.
- **Parollarni** hech kim o'qiy olmaydi: local rejimda ular PBKDF2-SHA256 bilan xeshlanadi, Supabase'da
  Auth'da saqlanadi. O'quvchi paroli faqat yaratilganda yoki "Yangi parol" bosilganda bir marta ko'rsatiladi.
- **Musobaqa progressi** har bir o'quvchi uchun alohida yozuvda saqlanadi (local kalit yoki `room_progress`
  qatori). Shuning uchun bir vaqtda yozilganda natijalar bir-birini o'chirmaydi.
- **Backend almashtiriladigan.** Ilova faqat `application/ports.ts` dagi portlarni biladi.
  `app/composition.ts` konfiguratsiyaga qarab local yoki Supabase adapterlarini ulaydi.