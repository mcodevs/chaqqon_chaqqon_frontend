---
name: bio-havola-sahifasi
description: '2026-10-14: Mohira ustoz uchun /link bio-havola sahifasi (Taplink muqobili); A bosqich yozildi, 2 havola (ota-onaga Telegram, ustozga platforma), animatsiya — soroban toshlari, ~700 ms'
metadata:
  type: project
---

# Bio-havola sahifasi (/link)

Mohira ustoz Instagram/Telegram profiliga qo'yish uchun taplink.cc kabi sahifa so'radi:
bir nechta havola + rasmlar. `chaqqon-chaqqon.uz/link`.

## Taklif qilingan tuzilish

Shapka (rasm, ism, "Mental arifmetika ustozi", tajriba/o'quvchi soni) -> bitta primary CTA
("Darsga yoziling") -> havolalar (Telegram kanal, Instagram, YouTube, telefon/WhatsApp, Yandex
xarita, va platformaga qaytaruvchi "Bepul sinab ko'ring") -> rasm galereyasi (6-9 ta, lightbox)
-> isbot (sharh yoki platformadan real raqam) -> pastda "Chaqqon-Chaqqon'da yaratilgan".

Warm Focus tokenlari, hardcoded rang yo'q, bitta primary ([[dizayn-tizimi]]). Navigatsiyasiz
sahifa, ya'ni DashboardLayout'siz.

## Asosiy qaror: A hozir, B keyin

|         | A                                   | B                        |
| ------- | ----------------------------------- | ------------------------ |
| URL     | `/link` (faqat Mohira)              | `/u/<login>` har ustozga |
| Kontent | koddagi bitta `linkPage.ts` obyekti | DB jadval + ustoz paneli |
| Baho    | ~yarim kun                          | 2-3 kun                  |

Tavsiya: A, lekin kontent bitta obyektda saqlanadi, keyin DB'dan o'qishga o'tkazish oson bo'ladi -
tashlab yuboriladigan kod bo'lmaydi. B muqarrar, chunki platforma ko'p ustozli
([[platforma-kop-ustoz]]); bio-sahifa tarif xususiyati ham bo'lishi mumkin.

Taplink'da yo'q ustunlik: o'z domenimizda bepul ([[maxsus-domen]]), CTA to'g'ridan-to'g'ri
ro'yxatdan o'tishga olib boradi, real platforma statistikasini ko'rsatish mumkin
([[osish-vositalari]] dagi chegara qoidasi bilan).

## Holat

2026-10-14: **A bosqich yozildi**, hali to'ldirilmagan.

- `src/features/linkPage/content/linkProfile.ts` — `PROFILE` konstantasi (tiplar + `visibleLinks`,
  `isExternal`, `isFilled`). Kontent faqat shu yerda: B bosqichda konstanta o'rniga so'rov qo'yiladi,
  sahifa o'zgarmaydi.
- `LinkPage.tsx` + `LinkPage.module.css` — tor bitta ustun, telefonga mo'ljallangan. Navigatsiyasiz,
  DashboardLayout'siz. Faqat CTA brend rangida; havola qatorlari jim kartalar (bitta primary qoidasi).
  `platform` turidagi qator — ilovaga qaytaruvchi yagona tinglangan qator.
- Rasm galereyasi 3 ustun, bosilsa shared `ImageLightbox`. Rasmlar `public/link/` ga tashlanadi.
- Isbot qatori landing'ning `visibleFacts` ini qayta ishlatadi — **o'sha chegaralar** bilan
  ([[osish-vositalari]]), shuning uchun ko'pincha faqat "to'g'ri javob" chiqadi.
- Marshrut `/link`, landing kabi alohida chunk (lazy); `AppRouter.tsx`.
- `linkProfile.test.ts` (6 ta test). To'liq: 595 test o'tdi, typecheck va build toza.

**To'ldirilmagan maydon ko'rinmaydi**: `href` bo'sh qator tushib qoladi, galereya/sharh bo'sh bo'lsa
bo'lim chiqmaydi, hech narsa bo'lmasa sahifa "hali to'ldirilmagan" deb yozadi. Hozir faqat ism,
kasb va platformaga qaytaruvchi qator bor.

**Egasidan kutilmoqda:** Mohira ustozning rasmi, 6-9 galereya rasmi (`public/link/`),
Telegram/Instagram/YouTube havolalari, telefon raqami, manzil, va CTA qayerga ketishi.
Shular kelgach faqat `linkProfile.ts` tahrirlanadi.

## Kontent (egasi bergan, 2026-10-14)

Ikki qator — **ikki xil auditoriya**, bu sahifaning asosiy o'ziga xosligi:

| Qator                            | Kimga          | Qayerga                                                                |
| -------------------------------- | -------------- | ---------------------------------------------------------------------- |
| "Sinov darsiga yozilish"         | ota-onaga      | `https://t.me/Mohira_Ravshan_qizi` (Mohira ustozning Telegram profili) |
| "Mental arifmetika ustozimisiz?" | boshqa ustozga | `/` (chaqqon-chaqqon platformasi)                                      |

Qaror: ota-onaning qatori — sahifaning **yagona primary** amali (CTA tugmasi), ustozga qaratilgan
qator pastda jim turadi. Shunday qilib bitta primary qoidasi ([[dizayn-tizimi]]) buzilmaydi.

Egasining talabi: "qiziqarli va animatsiyali, e'tiborni tortadigan, **ammo bachkana emas**".
Shu sababli animatsiya yo'nalishi uchta mustaqil taklif + uchta hakam (did, qurilish/ishlash,
e'tibor/konversiya) orqali tanlanmoqda; uy qoidalari: faqat transform/opacity, hech narsa abadiy
aylanmaydi, hammasi `prefers-reduced-motion` ichida, ranglar faqat tokenlardan
(`src/features/landing/motion/motion.module.css` namunasi).

## Animatsiya: "One Reckoning" (2026-10-14)

Yo'nalish uchta mustaqil taklif uchta hakam tomonidan baholandi (did 8, qurilish 9, e'tibor 9 =
26/30 — qolgan ikkisi 19 va 16). Tanlangan g'oya: **sahifa abakusning o'zi**, yuklanish esa bitta
harakat — sterjen chiziladi, avatar tayoqqa tushadi, so'ng har qatorning toshi o'z sterjeni bo'ylab
yuqoriga, birinchi qator bitta tosh qadami, ikkinchisi ikkita.

Qoidalar (shu fayl boshida ham yozilgan):

- faqat `transform`/`opacity`; har keyframe `from`-only, shuning uchun **~700 ms dan keyingi sahifa
  `prefers-reduced-motion: reduce` sahifasiga piksel-aniq teng** (tekshirildi: animatsiyalarni
  o'chirib solishtirildi);
- **so'zlar kutmaydi** — ism, kasb va ikkala qator matni birinchi kadrdayoq to'liq o'qiladi; faqat
  asbob (sterjen, tayoq, toshlar) ushlab turiladi;
- **tosh hech qachon fade bilan paydo bo'lmaydi** — u sterjen bo'ylab to'q holda keladi (grafik
  emas, mexanizm);
- overshoot yo'q (`--lp-overshoot` bu faylda uchramasligi kerak) — har kelish tekis tugaydi;
- emoji ikonkalar olib tashlandi (`LINK_META` dan `icon` o'chdi) — har qator soroban toshi bilan
  belgilanadi; emoji har telefonda boshqacha chiziladi va shablon ko'rinish beradi;
- bosilganda karta siqilmaydi: tosh 2px pastga, strelka 3px o'ngga (faqat transform).

Vaqt jadvali (brauzerda `getAnimations()` bilan tasdiqlangan): avatar 0–320, tayoq 100–420,
1-qator 340–660 (tosh 420–740), 2-qator 410–730 (tosh 490–810), har tosh to'xtagan kadrda 120 ms lik
1px yorug'lik; 900 ms dan keyin (oxirgi tosh tushgach) primary qator atrofida uy effekti
`motion.ringPulse` uch marta nafas oladi va butunlay to'xtaydi. Boshqa hech narsa abadiy aylanmaydi.

**Egasi olib tashlatgan (2026-10-14):** avatar ustidagi sterjen va pastdagi platforma statistikasi
("5 195 to'g'ri javob") — sahifada ortiqcha edi. Shu bilan `Proof` komponenti va `usePublicStats`
chaqiruvi ham ketdi: endi sahifa hech qanday ma'lumot yuklamaydi, sof statik.

Tuzilish o'zgarishi: alohida CTA tugmasi **olib tashlandi** (u bilan "Sinov darsiga yozilish" ikki
marta chiqardi) — endi `ProfileLink.primary` bayrog'i qaysi qator brend rangida bo'lishini
belgilaydi, `ProfileLink.eyebrow` esa qator ustidagi "USTOZLAR UCHUN" yozuvini beradi. Shu bilan
bitta primary qoidasi ikki auditoriya uchun ham saqlanadi.
