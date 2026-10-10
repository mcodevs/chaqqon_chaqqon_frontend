---
name: osish-vositalari
description: "2026-10-10: marketing usullaridan 8 tasi qo'llandi — tavsiya etilgan tarif, kunlik narx, real raqamlar, natija matni, bepul sinov, kafolat, referal, boshlash ro'yxati, ariza eslatmasi"
metadata:
  type: project
---

# O'sish vositalari (marketing usullari)

Foydalanuvchi "TOP 20 marketing hiylasi" suhbatini berdi; Chaqqon-chaqqon'ga mos 8 tasini tanladi
(2026-10-10). **Qo'llanmagani ataylab:** soxta tanqislik, aldamchi (decoy) tarif, "har oy yo'qotyapsiz"
qo'rquvi — bolalar va ota-onalar bilan ishlaydigan platformada ishonchni buzadi. Ustoz fikrlari ham
tanlanmadi.

## Nima qilindi

| Usul | Qayerda |
|---|---|
| Yakor + "Tavsiya etiladi" | `tariffs.is_featured` (trigger + unique indeks: faqat bitta). Admin tarif formasida "⭐ Tavsiya etiladi"; landing'da kartaga osilgan belgi va to'la tugma. Tartib raqami hinti: qimmat tarifni birinchi qo'ysa, keyingilari arzonroq ko'rinadi |
| Narxni bo'lish | `dailyPrice()` — oy/30, 100 so'mga yuqoriga: "kuniga taxminan 5 000 so'm" (faqat landing) |
| Ijtimoiy isbot | `public.platform_public_stats()` (anon, faqat sonlar). **Chegara**: ustoz ≥10, o'quvchi ≥50, to'g'ri javob ≥1000 bo'lmaguncha ko'rsatilmaydi — "1 ustoz" teskari ta'sir qiladi. Prodda hozir faqat "4 012 to'g'ri javob" chiqadi |
| Natija matni | Landing hero va 8 ta karta "bola va ustoz nima yutadi" tilida qayta yozildi |
| Bepul sinov | `platform_settings.trial_days` (standart 14). Yangi ustoz formasida hisob sanasi = bugun + N; landing CTA "14 kun bepul sinab ko'rish" |
| Kafolat | `platform_settings.money_back_days` (standart 30, 0 = yashirin). Faqat va'da matni — qaytarishni admin qo'lda qiladi |
| Referal (**bir tomonlama**) | `teacher_applications.referrer_username` (anon login borligini bilmasligi uchun matn holida, admin moslaydi). Havola: `/?taklif=<login>#ariza` → forma to'ldiriladi. Arizadan ustoz yaratilganda **faqat tavsiyachiga** o'z tarifining 1 oyi — `admin.rewardReferral` ("Taklif uchun bonus: @login"). Yangi ustoz hech narsa olmaydi: bonusni o'zi boshqani taklif qilib oladi (uning sababi — bepul sinov). Har bir taklif alohida, cheklanmagan. `platform_settings.referral_enabled` |
| Progress | `OnboardingCard` (ustoz bosh sahifasi): profil, birinchi o'quvchi, to'lov, uy vazifasi*, do'kon* (*tarifda bo'lsa). Hammasi bajarilsa yoki "Yashirish" — `localStorage['chaqqon.onboarding:<id>']`, keyin ma'lumot yuklamaydi |
| Tashlab ketilgan savat | `private.send_application_reminders()` — 24 soatdan beri "new" arizalar haqida adminlarga bitta xabar, kuniga bir marta (`private.application_reminders`). Cron `application-reminders` `0 5 * * *` UTC = 10:00 Toshkent |

Admin "Sozlamalar" → "Yangi ustozlarga taklif" kartasi (sinov, kafolat, referal). Ikkala forma o'z
maydonlarini **eng so'nggi** sozlamalar ustiga saqlaydi — biri ikkinchisini qaytarib yozmaydi.

Ustoz "Profil"ida `InviteCard`: havola, "Ulashish" (Web Share) va "Havolani nusxalash".

## Tuzoqlar

- Landing'da `#ariza` ga sakrash tariflar **yuklangandan keyin** bo'lishi kerak — aks holda tariflar formani
  pastga surib yuboradi. `.section` da `scroll-margin-top` sticky header uchun.
- Ustoz yaratilib, tavsiyachi bonusi yiqilsa — forma xato ko'rsatib qolmaydi (akkaunt allaqachon bor):
  `onCreated(..., referralMissed)` va arizalar sahifasida ogohlantirish.
- Eski localStorage tariflari/sozlamalari/arizalarida yangi maydonlar yo'q — o'qishda standart qiymat beriladi.

Migratsiya: `supabase/migrations/20261010114050_platform_growth.sql`. Bog'liq: [[platforma-kop-ustoz]].

## Holat

2026-10-10: **jonli.** Migratsiya prodga `20261010114050_platform_growth` sifatida qo'llandi (sozlamalar standartda:
14 kun sinov, 30 kun kafolat, referal yoqiq; cron `application-reminders` ro'yxatda), frontend push bilan chiqdi.
Advisorlarda faqat ataylab qilingan WARN: `platform_public_stats` va `submit_teacher_application` anon uchun ochiq.

Commit `14fdd2b`. Push'dan keyin: Mohira'da "Boshlash · 4/5" — profilida ism va telefon bo'sh (to'g'ri ishlash). **Egasi qilishi kerak:** bitta tarifni "⭐ Tavsiya etiladi" qilish (hozir yo'q), kafolat/sinov qiymatlarini Sozlamalarda tasdiqlash yoki 0 qilish.
