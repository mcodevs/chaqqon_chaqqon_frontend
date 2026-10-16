---
name: natija-rasmi
description: "2026-10-16: interaktiv uy vazifasi natijasining ulashiladigan rasmi (drawResultCard) — tipografik apostrof qoidasi va brend nomi faqat bir marta"
metadata:
  type: project
---

# Natija rasmi (ulashiladigan karta)

Interaktiv uy vazifasi tugagach chiziladigan 1080×1350 PNG: `src/features/share/drawResultCard.ts`
(matnlar `resultCard.ts`, ulashish `shareImage.ts`, UI `ShareResult.tsx`). Chaqiriladigan joylar —
`CompetitionRun.tsx` va `StudentCompetitionPage.tsx`.

2026-10-16 da kelishilgan ikki qoida:

- **Apostrof tipografik** (`’`/`‘`, ya'ni `o‘`, `g‘`, `do‘st`), chunki bitta rasmda `Zo'r natija!`
  va `to‘g‘ri` yonma-yon turib xunuk ko'rinardi. Tuzatilganlar: `praiseFor` matnlari,
  `shareText`, `SECTION_META` yorliqlari (`Kichik do‘st`, `Katta do‘st`).
  Diqqat: ilovaning qolgan joylarida hali oddiy `'` ko'p (`topics.ts`, `users.ts`, `StudentList`) —
  rasmga tushadigan matnlargina birxillashtirildi.
- **"Chaqqon-chaqqon" rasmda faqat bir marta** — yuqoridagi brend nishonida. Pastki qismdagi
  takror olib tashlandi; oyoq qismida endi faqat ustoz qatori va sana bor.

Rasm mavzu (theme) tokenlarini **o'qimaydi** — o'zining iliq palitrasi bor, chunki u boshqa
odamning telefonida ochiladi. Ustoz ismi bolaning o'z ustozidan olinadi (`useMyTeacherCard`).

Tez ko'rish usuli: `drawResultCard.ts` ni `esbuild` bilan `.js` ga o'girib, kichik HTML'dan
namunaviy ma'lumot bilan chizdirib brauzerda qarash — butun ilovani ishga tushirish shart emas.

Bog'liq: [[yulduz-qoidasi]], [[brend-ranglari]], [[platforma-kop-ustoz]].
