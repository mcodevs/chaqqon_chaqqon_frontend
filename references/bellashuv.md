# Bellashuv — o'quvchilar o'zlari o'tkazadigan musobaqa

2026-10-16. Egasining topshirig'i: o'quvchi o'z qurilmasidan musobaqa yaratsin, sinfdoshlarini
chaqirsin, raundlarni o'zi boshqarsin. Yulduzcha berilmaydi, reyting hisoblanmaydi.

## Nega eski xona emas

`rooms` jadvali ustozniki: RLS'da "Teacher manages rooms", o'quvchi faqat o'qiydi; misollarni esa
har kim o'z tezligida yechadi — raundni birov boshqarmaydi. Shuning uchun alohida `duels` +
`duel_participants` jadvali. Qayta ishlatilgani: misol generatori, sessiya reducer'i, `FlashView` /
`AnswerView`, `StudentPicker`, `PracticeConfigFields`.

Kodda `duel` deb atadik (`classroom.ts` izohlarida "match" so'zi band), foydalanuvchida — "Bellashuv".

## Egasi tasdiqlagan qarorlar

| Savol                      | Qaror                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Nomi va joyi               | "Bellashuv"; o'quvchida `/student/duel`, ustozda `/teacher/duels`                      |
| Tarif                      | yangi funksiya `duels` (Legacy tarifga ham qo'shildi)                                  |
| Obunasi tugagan o'quvchi   | na yarata oladi, na chaqiriladi                                                        |
| Sozlama                    | mashq turi va misollar soni hammaga umumiy, qolgani har kimga alohida mumkin           |
| Bir xil sozlama            | misollar ham bir xil (toza poyga); alohida bo'lsa har kimga o'z draw'i                 |
| 3-2-1                      | faqat eng boshida; har raundda odatdagi 0,9 s "Tayyor turing…"                         |
| Ulgurmagan javob           | raund o'tkazib yuborilgan — noto'g'ri sanaladi, ekranda "Ulgurmadingiz"                |
| O'rinlar                   | to'g'ri javob soni, tenglikda javob vaqti (0 ochko hech qachon vaqt bilan bo'linmaydi) |
| Qo'shilish                 | faqat chaqirilganlar; boshlangandan keyin kech qo'shilib bo'lmaydi; 2–8 kishi          |
| Tashlab ketilgan bellashuv | 15 daqiqadan keyin tugagan hisoblanadi, o'ynalgan raundlar saqlanadi                   |
| Natija                     | o'quvchida "Natijalarim" ⚔️ belgisi bilan, ustozda alohida sahifa                      |
| Yulduz/reyting             | yo'q: `mode = 'duel'`, `computeLeaderboard` uni tashlab ketadi                         |
| Cheklovlar                 | kunlik chek ham, ustozda o'chirish tugmasi ham yo'q — yagona nazorat tarif             |
| Local rejim                | ishlaydi: bitta brauzerning tablari orasida (sessionStorage har tabda o'zi)            |

## Qanday ishlaydi

- `duels` qatori: `host_id`, `invited_ids` (host ham ichida), `configs` va `problems` (har ishtirokchi
  uchun), `round_count`, `round`, `status` (`lobby` → `running` → `finished`).
- Misollar bellashuv ochilganda bir marta chiziladi va qatorda saqlanadi — shuning uchun hamma bir xil
  sonni ko'radi va qurilma orasida kelishib o'tirish shart emas.
- Har bir qurilma **o'z lane'ini** yuritadi (`useFlashSession`), raund esa faqat `duels.round`
  o'zgarganda siljiydi. Reducer'ga shuning uchun `roundSkipped` qo'shildi: javob bermagan lane
  raundni "o'tkazib yuborilgan" qilib yozadi va hamma bilan birga keyingisiga o'tadi.
- O'rtada sahifa yangilansa, sessiya `startRound` bilan boshlanadi: o'tgan raundlar o'tkazib
  yuborilgan deb ochiladi, to'g'ri javoblar esa bazadagi qatordan boshlab sanaladi (`recorded`).
- Javob vaqti qurilmada o'lchanadi: javob maydoni chiqqandan yuborilgunicha.

## Tuzoqlar

- **O'quvchi sinfdoshining to'lovini ko'rmaydi** (RLS: "students their own"). Shuning uchun tanlash
  ro'yxatida hech kim "yopiq" deb belgilanmaydi — xonani ochganda baza rad etadi va `42501` xatosi
  `DUEL_GUEST_UNAVAILABLE` xabariga aylanadi.
- `updated_at` ni trigger yozadi, shuning uchun testda qatorni "eskirtirish" uchun `duels_stamp`
  triggerini vaqtincha o'chirish kerak.
- Bellashuv natijasini **ilova emas, trigger yozadi**: `practice_results` ga `duel` qatorini klientdan
  yozib bo'lmaydi (policy faqat `practice` va `online` ga ruxsat beradi).
- 15 daqiqa uch joyda bir xil bo'lishi shart: `DUEL_IDLE_MS`, `expire_stale_duels()` va "timed-out"
  policy'si. Schema testi uchalasini solishtiradi.
- `useFlashSession` dagi `skip`/`next` endi `useCallback` bilan — raund sinxronizatsiyasi effekt
  ichida, har render'da qayta ishga tushmasligi uchun.

## Sinov

- `src/domain/duel.test.ts`, `src/domain/practice/session.test.ts` (o'tkazib yuborilgan raund),
  `src/application/duelService.test.ts` (to'liq oqim, ruxsatlar, timeout), `schema.test.ts` dagi
  "bellashuv" bloki (RLS, trigger, cron funksiyasi).
- Qo'lda: `npm run dev:local`, bitta brauzerda ikki tab (har tabda o'z o'quvchisi).
