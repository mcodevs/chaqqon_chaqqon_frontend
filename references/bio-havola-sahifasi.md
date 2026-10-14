---
name: bio-havola-sahifasi
description: '2026-10-14 rejasi: Mohira ustoz uchun /link bio-havola sahifasi (Taplink muqobili); A bosqich yozildi (/link, linkProfile.ts), B bosqich (/u/<login>, DB) keyin'
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
