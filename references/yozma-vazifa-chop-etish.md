---
name: yozma-vazifa-chop-etish
description: "Ustoz uchun yozma uy vazifasi varaqlari: ikki shablon, A4 ga sig'dirish hisobi, bosib chiqarish <body> portali orqali"
metadata:
  type: project
---

# Yozma vazifa (chop etish)

2026-10-06 da qo'shildi. Ustoz mavzu va shaklni tanlaydi — ilova A4 varaqlarini chizadi, brauzerning
o'z chop etish oynasi esa ularni qog'ozga yoki PDF ga chiqaradi. **Faqat ustoz tomonida**:
`/teacher/worksheet`.

Shablon foydalanuvchi yuborgan "LIDER KIDS" mashq kitobchasi rasmlaridan olingan.

## Fayllar

| Nima | Qayerda |
|---|---|
| Domen (varaq tuzilishi, generatsiya) | `src/domain/practice/worksheet.ts` |
| Varaqning o'zi (A4 markup) | `src/features/teacher/worksheet/WorksheetSheetView.tsx` |
| Sahifa + forma | `WorksheetPage.tsx`, `WorksheetForm.tsx` |
| Sig'dirish hisobi | `sheetLayout.ts` |
| Mavzu tanlagich (mashq formasi bilan umumiy) | `src/features/practice/TopicField.tsx` |

`TopicField` shu ish uchun `PracticeConfigFields.tsx` dan ajratib olindi — endi ikkala forma ham
bitta mavzu ro'yxatidan foydalanadi (109 mavzu, anzan.iama.kz dan ko'chirilgan katalog).

## Ikki shablon

- **`letters`** — ustunlar A…J, eng pastki qatori javob uchun bo'sh, jadval ostida `VAQTI________`.
- **`numbers`** — ustunlar 1…10, chapda jadvalni nomlovchi rim raqami (`rowSpan` bilan butun
  jadvalni qamrab turadi), eng pastki qatorning chap katagi `Javoblar`.

## Misollar o'ylab topilmaydi

Varaq `generateProblem` ni chaqiradi — mashqlar bilan **bir xil generator**. Shuning uchun
qog'ozda ham o'sha kafolatlar ishlaydi: oraliq yig'indi hech qachon manfiy bo'lmaydi (bola uni
abakusda yecha oladi), birinchi son musbat, tanlangan mavzuning formulasi haqiqatan ham mashq
qilinadi.

Chop etishda son **qo'shuv ishorasisiz** yoziladi (`7`, `−6`), kitobchadagidek — ilovaning
`formatSigned` i esa `+` qo'yadi, shuning uchun alohida `printedNumber` bor.

## ⚠️ Bosib chiqarish arxitekturasi

Varaqlar `createPortal` bilan **`<body>` ga**, `[data-print-root]` atributli div ichiga
chiqariladi. `src/styles/global.css` dagi qoida:

```css
@media print {
  body:has([data-print-root]) > #root { display: none !important; }
}
```

**Nega portal:** sahifa `DashboardLayout` ning yon paneli va scroll konteyneri ichida yashaydi.
Varaqni joyida bosib chiqarish uchun `:has()` bilan barcha ota-elementlarni "yechish" kerak bo'lardi —
mo'rt va brauzerga bog'liq. Portal esa shunchaki qobiqdan tashqarida.

Ekrandagi ko'rinish uchun **o'sha komponent sahifa ichida ikkinchi marta** render qilinadi.
Nusxalanish ataylab: portal nusxasi ekranda `display: none`, shuning uchun hech narsa chizilmaydi.

**`@page { size: A4; margin: 10mm }` endi butun ilova uchun global.** Boshqa ekran bosib
chiqarilsa ham shu amal qiladi (ular `#root` ichida qolgani uchun oddiygina bosiladi).

**Yangi chop etiladigan ekran kerak bo'lsa — shu naqshni takrorlang.**

## A4 ga sig'dirish

Varaq tokenlar bilan emas, **millimetrda** chizilgan va ikkala mavzuda ham oq qog'oz / qora siyoh
bo'lib qoladi (Warm Focus token qoidalari bu yerda qo'llanmaydi — bu qog'oz, ekran emas).

`rowHeightMm()` katakcha balandligini shunday tanlaydiki, varaqning jadvallari bir betni to'ldirsin,
lekin keyingisiga oshib tushmasin: 4 ta sakkiz qatorli jadval 1 ta besh qatorlidan ko'ra zichroq
to'r talab qiladi. Chegaralar 4.2–8.4 mm.

> **Tuzoq:** `sheetLayout.ts` dagi `TABLE_EXTRA_SLOTS` (`letters` 1.45, `numbers` 0.65) —
> jadval ostidagi `VAQTI` yo'li va oraliq nechta qatorga teng ekani. `WorksheetSheet.module.css`
> da bu elementlarning o'lchami ham `--row-h` dan hisoblanadi. **Biri o'zgarsa, ikkinchisi ham
> o'zgarishi shart**, aks holda varaq yoki bo'sh qoladi, yoki ikkinchi betga oshadi.

Brauzerda o'lchab tekshirilgan: ikkala shablon ham 260.2 mm joyning 253–255 mm ini egallaydi.

Sig'maydigan sozlama (`sheetOverflows`) formada **oldindan** ogohlantiriladi — ustoz buni
printerda emas, ekranda biladi.

Ekrandagi ko'rinish `useFitScale` (ResizeObserver + CSS `zoom`) bilan ustun kengligiga moslanadi.
Ref emas, **callback ref** ishlatilgan: o'lchanadigan element varaq yaratilgandan keyingina
paydo bo'ladi, oddiy `useRef` effekt ishlaganda hali bo'sh bo'lardi.

## Chegaralar va qarorlar

- **Varaqlar soni 10 tagacha.** Portal nusxasi tufayli DOM ikki barobar; 10 varaq ≈ 5 ming katakcha,
  bu yetarli va xavfsiz.
- **Generatsiya tugma ortida**, jonli emas: eng og'ir holat (10 varaq × 6 jadval, `o100` mavzusi)
  ≈ 400–500 ms. Har chip bosilganda qayta hisoblansa, forma sekin bo'lib qolardi.
  Sozlama o'zgarsa, ko'rinish yonida "sozlama o'zgardi" belgisi chiqadi.
- **Sozlamalar `localStorage` da** (`chaqqon.worksheet`, `try/catch` ichida) — keyingi hafta ustoz
  o'sha joydan davom etadi. Supabase'ga tegmaydi, migratsiya yo'q.
- Javoblar kaliti oxirgi varaq sifatida qo'shiladi (ustozning o'z nusxasi uchun).

---

Related: [[vault-konvensiyasi]] · [MEMORY.md](../MEMORY.md)
