---
name: platforma-kop-ustoz
description: "2026-10-10: ilova bitta ustozdan barcha mental arifmetika ustozlari uchun platformaga o'tkazilmoqda — tenant=ustoz, superadmin, tariflar, ustoz balansi, 4 bosqich"
metadata:
  type: project
---

# Ko'p ustozli platforma

2026-10-10 da qaror qilindi: Chaqqon-chaqqon endi faqat Mohira ustoz uchun emas, **barcha mental
arifmetika ustozlari va ularning o'quvchilari** uchun. To'liq reja:
`~/.claude/plans/ilovada-katta-yangilanish-qilamiz-frolicking-parrot.md`.

## Foydalanuvchi qarorlari

| Mavzu | Qaror |
|---|---|
| Tenant | **Ustoz.** Har ustoz faqat o'z o'quvchilari, xonalari, natijalari, to'lovlari, do'koni, yulduzlarini ko'radi |
| Ustoz qo'shilishi | Landing → **ariza** (majburiy: ism, telefon; ixtiyoriy: o'quvchi soni, tg username, shahar, markaz, qayerdan eshitdi, tarif, izoh) → **superadmin** akkaunt yaratadi. Self-signup yo'q |
| Ustoz profili | ism, telefon, **markaz ixtiyoriy oddiy matn** (kalit emas — markazsiz ustozlar bor). Ustoz tg username saqlanmaydi |
| Tariflar | o'quvchi soni limiti + funksiyalar. Funksiyalar **ustozda ham, o'quvchida ham** bo'limlarni ochadi. Admin boshqaradi, landing'da ko'rinadi |
| Ustoz to'lovi | **Balans** (so'm). Har oy hisob sanasida tarif narxi yechiladi; oldindan bir necha oy to'lash mumkin. Admin to'lovni qo'lda yozadi. Manfiy → ogohlantirish, ishlayveradi; **7 kun** kechiksa boshqaruv bloklanadi |
| Bloklangan ustozning o'quvchilari | **Ta'sirlanmaydi** — o'z `paid_until` i tugaguncha ishlaydi |
| O'quvchi obunasi tugasa | faqat **lokal mashq** (natija saqlanmaydi) + **abakus** (oldin butun ilova yopilardi) |
| Telegram eslatma | balans manfiy, blokka 3 va 1 kun qolganda, bloklanganda, to'lov qabul qilinganda — tarifdan qat'i nazar |
| To'lov kontakti | admin paneldagi Sozlamalar (telefon + tg username) |
| Admin statistikasi | to'liq: ustoz/o'quvchi/faollik + moliya (tushum, hisoblangan, qarz, MRR, tarif kesimi, jurnal). O'quvchi shaxsiy ma'lumoti adminga ko'rsatilmaydi |
| Login | butun platformada yagona (o'zgarmaydi) |
| Reyting | faqat o'z ustozining o'quvchilari |
| Mohira | 1-ustoz, hamma mavjud data unga; boshqalar kabi to'laydi (admin tarif/bonus beradi) |
| Chiqarish | bosqichma-bosqich, har biri alohida push |

## Bosqichlar

1. **Tenant izolyatsiyasi** — `profiles.teacher_id`, `rooms.teacher_id`, `market_items.teacher_id`
   (qolganlari `student_id` orqali); barcha policy'lar `private.my_student_ids()` /
   `visible_student_ids()` kabi definer helperlarga. Mohira uchun ko'rinadigan o'zgarish yo'q.
2. **Superadmin, tariflar, balans** — `tariffs`, `teachers`, `teacher_ledger` (append-only,
   `charge` lar `pg_cron` + lazy generator bilan), FIFO `overdue_since`, `i_can_manage()`,
   funksiya gate'lari, o'quvchi limiti trigger'i, Telegram eslatmalari, admin statistikasi,
   `platform_settings`.
3. **Landing + arizalar** — `teacher_applications`, anon faqat definer RPC orqali, adminga Telegram.
4. **Brending + o'quvchi cheklangan rejimi** — "Mohira ustoz" matnlari, logo, share card,
   worksheet defaultlari ustoz profilidan.

## Muhim tuzoqlar (dizayndan)

- **RLS subquery tuzog'i:** policy ichidagi `profiles` subquery chaqiruvchining RLS'i ostida
  ishlaydi → begona qatorni ko'rmaydi → "begona ishtirokchi yo'q" tekshiruvi aldamchi o'tadi.
  Qatorlararo tekshiruv **faqat** SECURITY DEFINER helper orqali.
- `rooms`/`market_items` da `default auth.uid()` — eski frontend upsert'lari `teacher_id`
  yubormaydi, default ularni buzmaydi. Superuser/test insertlarda `teacher_id` ni aniq berish kerak.
- Upsert INSERT policy'dan o'tadi — teacher-blok tekshiruvi xonani yakunlashni ham to'xtatadi
  (qabul qilingan); o'quvchi billing'ini teacher upsert yo'liga hech qachon qo'ymang.
- Superadmin bootstrap'i **endpoint'siz**: foydalanuvchi Dashboard'da auth user yaratadi,
  `role='admin'` profil qatori SQL bilan qo'shiladi ("birinchi kelgan admin" xavfi yo'q).

---

Related: [[yozma-vazifa-chop-etish]] · [[vault-konvensiyasi]] · [MEMORY.md](../MEMORY.md)

## Holat (2026-10-10, 4 bosqich ham jonli)

| Bosqich | Commit | Migratsiya |
|---|---|---|
| 1. Tenant izolyatsiyasi | `0015369` | `20261009230937_teacher_tenancy` |
| 2. Superadmin, tariflar, balans | `e10d4a7` | `20261010000550_platform_billing` (+ `pg_cron` `teacher-billing-daily`) |
| 3. Landing + arizalar | `91bf3a9` | `20261010002100_teacher_applications` |
| 4. Brending + cheklangan rejim | `b16beaa` | `20261010002957_teacher_card` |

Edge function'lar: `manage-students` (egalik + limit + blok), yangi `manage-teachers` (faqat admin), `register-teacher` — 410 qaytaradigan stub (Dashboard'dan o'chirsa bo'ladi).

**Deploy tartibi (har bosqichda ishladi):** MCP `apply_migration` → faylni qo'llangan versiya nomiga `git mv` → MCP `deploy_edge_function` (fayl nomlari `functions/<nom>/index.ts` + `functions/_shared/*.ts`) → push. Toshkent tungi soatida.

**Foydalanuvchidan kutilmoqda:**

1. ~~Superadmin akkaunti~~ — **bajarildi (2026-10-10)**: foydalanuvchi yaratdi, bazada 1 ta admin, `teacher_id` bo'sh. Yangi admin kerak bo'lsa: Dashboard → Add user (`<login>@chaqqon.example.com`, parol `chaqqon:<parol>`) + `profiles` ga `role='admin'` (README'da SQL).
2. `/admin` → Sozlamalar: to'lov kontakti; Tariflar: public tariflar (landing'da ko'rinadi).
3. Mohira ustoz (login `ravshanovna`, ismi bo'sh) — yashirin "Legacy" tarifda, hisob yuritilmaydi; admin unga tarif, hisob sanasi va ism beradi.
4. Ixtiyoriy: yangi logo (eski `logo.webp` o'chirildi — unda "Mohira ustoz bilan" bor edi).

**Topilgan tuzoqlar:** `useAsyncAction.run` void action uchun ham `undefined` qaytaradi — forma muvaffaqiyatni ko'rishi kerak bo'lsa, action `true` qaytarsin; `prettier` ni butun papkaga ishlatish begona fayllarni qayta formatlaydi.
