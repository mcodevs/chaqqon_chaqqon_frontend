---
name: yulduz-qoidasi
description: "2026-10-11: interaktiv uy vazifasida ≥90% to'g'ri javob → 1 yulduz (oldin faqat 100%); faqat yangi natijalarga"
metadata:
  type: project
---

# Yulduz qoidasi (90%)

Egasining qarori (2026-10-11): yulduz faqat xatosiz emas, **90% va undan yuqori** to'g'ri bajarilgan interaktiv uy vazifasiga ham beriladi.

- Yulduzni faqat DB triggeri `private.award_homework_star` yozadi; shart `correct*10 >= total*9` (masalan 9/10 — ha, 17/19 — yo'q).
- Migratsiya `20261011120000_homework_star_ninety.sql`. U retroaktiv emas: eski natijalar qayta hisoblanmaydi, daftar o'zgarmaydi.
- Lokal backend (`localPracticeRepositories`) ham shu qoida bo'yicha ishlaydi; `schema.test.ts` da 90% testi bor.
- Matnlar yangilandi: o'quvchi Do'koni, Reyting sahifasi, landing ("90% to'g'ri vazifa — yulduzcha", namunada "Barakalla! +1 ⭐").
- Holat: 2026-10-11 prodga qo'llandi (versiya 20261010215855) va push qilindi.

Shu sessiyada yana: sinf musobaqasi o'quvchi tanlagichiga toifa (A–D) filtri qo'shildi; do'kon narx maydoni endi bo'shatib yoziladi.
Bog'liq: [[landing-redizayn]], [[platforma-kop-ustoz]].
