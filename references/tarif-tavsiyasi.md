---
name: tarif-tavsiyasi
description: "2026-10-11: 3 tarif taklifi — Start 99k/15, Standart⭐ 199k/40, Markaz 349k/100; asosiy oqim hamma tarifda, gate = o'lcham + motivatsiya; egasining tasdig'i kutilmoqda"
metadata:
  type: project
---

# Tarif tavsiyasi (taklif, tasdiqlanmagan)

Egasi 2026-10-11 da "marketing va sotuv tomonlama 3 ta tarif" so'radi. Prodda hozir faqat yashirin `Legacy` (0 so'm, Mohira) bor; sinov 14 kun, kafolat 30 kun yoqilgan.

| Tarif | Narx/oy | Limit | Funksiyalar |
|---|---|---|---|
| Start | 99 000 | 15 | homework_rooms, leaderboard, telegram |
| Standart ⭐ (is_featured) | 199 000 | 40 | + stats, market, classroom, worksheet, written_homework |
| Markaz | 349 000 | 100 (ko'prog'i kelishuv) | + extra_drills, shaxsiy o'rnatish/yordam |

Tamoyillar:
- Qiymat o'lchovi = o'quvchilar soni (limit allaqachon `STUDENT_LIMIT` bilan ishlaydi → tabiiy upsell).
- Asosiy oqim (uy vazifasi + yulduz + ota-onaga Telegram) hech qachon yopilmaydi — retention.
- O'rta tarif "decoy" bilan eng foydali ko'rinadi.
- Narx ustoz daromadining ~2–3% (taxmin: bir o'quvchi ~300k so'm/oy — **tekshirilmagan**, bozor narxi internetda topilmadi).
- Oldindan to'lov: 6 oy → +1 oy, 12 oy → +2 oy (admin bonus orqali).
- "Asoschi narxi" faqat haqiqiy va'da bo'lsa.

Ochiq savollar: Mohira Legacy'da qoladimi; 5–8 ustoz bilan narxni sinash.
Bog'liq: [[osish-vositalari]], [[platforma-kop-ustoz]], [[landing-redizayn]].

Shu kuni yana: Telegram'dagi yozma vazifa PDF'i prodda tekshirildi — egasi "PDF botga keldi, ishlayapti" dedi ([[yozma-vazifa-chop-etish]]).

## Egasi yaratgan tariflar (prod, 2026-10-11) va tahlil

Egasi o'zi yaratgan tariflar:
- Bronza: bepul, 5 o'quvchi; classroom, written_homework, extra_drills.
- Kumush ⭐: 50 000 so'm, 10 o'quvchi; + homework_rooms, telegram.
- Oltin: 70 000 so'm, cheksiz, hamma funksiya.
- Legacy: yashirin, Mohira'da. Bitta yangi ustoz Bronza'da (1 o'quvchi, hisob 2026-10-25 dan).

Tahlil natijasi:
1. Kumush Oltin oldida yutqazadi: +20k evaziga cheksiz limit va 4 funksiya qo'shiladi, lekin "Tavsiya" Kumush'da turibdi.
2. Oltin juda arzon va daromadga shift qo'yadi: markaz o'quvchi boshiga ~1k so'm to'laydi.
3. Bepul tarifda asosiy qiymat (uy vazifasi, yulduz, Telegram) yo'q, shuning uchun konversiya sababi ham yo'q.
4. 10 dan cheksizga to'g'ridan-to'g'ri sakrash.

Taklif (narx darajasi saqlanadi):
- Bronza: bepul, 5 o'quvchi; homework_rooms + leaderboard + telegram.
- Kumush ⭐: 59k, 20 o'quvchi; + stats, worksheet, written_homework, classroom.
- Oltin: 99k, cheksiz, hamma funksiya.

Muqobil: hozirgi tariflar qolsa, "Tavsiya" belgisi Oltin'ga o'tkazilsin.

Egasining tanlovi kutilmoqda. Bazaga faqat ruxsat bilan yoziladi.
## Sinov (trial) qanday ishlaydi — 2026-10-14

Alohida "sinov tarifi" yo'q.
- Admin `NewTeacherForm`da tarifni tanlaydi. `billing_starts_on` = bugun + `trial_days`.
- Sinov davomida ustoz shu tarifning funksiyalari va limiti bilan ishlaydi (`my_features()` faqat `teachers.tariff_id`ga qaraydi). Faqat yechim kechikadi.
- Sinovdan keyin balans 0 bo'lsa, balans manfiyga o'tadi, keyin 7 kun muhlat va blok. Ya'ni to'lamagan ustoz amalda ~21 kun ishlaydi.

Muammo: Bronza'da sinov ma'nosiz. Kumush'dagi ustoz Oltin funksiyalarini ko'rmaydi, demak upsell bo'lmaydi.

Taklif ("teskari sinov"): sinovda Oltin, tugagach tanlangan tarif yoki Bronza.
1. Qo'lda: admin Oltin beradi, keyin tarifni o'zi almashtiradi.
2. Avtomatik: `trial_tariff` + keyingi tarif. Cron sinov tugaganda tarifni almashtiradi va Telegram'ga "tarif tanlang" yuboradi. Migratsiya kerak.

Egasining javobi kutilmoqda.