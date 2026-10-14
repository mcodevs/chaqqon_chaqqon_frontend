---
name: brend-ranglari
description: "2026-10-15: butun platforma logo palitrasiga o'tdi — yashil brend (#1a7a34 / #5ec97a), to'q sariq urg'u, neytrallar binafsha tusdan iliq tusga"
metadata:
  type: project
---

# Brend ranglari (logo palitrasi)

Egasi "Mohira ustoz bilan Chaqqon-Chaqqon" logosini berdi (yashil + to'q sariq, iliq oq fon) va
**butun platformaga** shu palitrani so'radi. O'zgarish faqat `src/styles/tokens.css` da: hech bir
komponentda qattiq rang yo'q edi (grep bilan tekshirildi), shuning uchun bitta fayl butun ilovani
qayta bo'yadi.

## Nima o'zgardi

| Token                   | Eski (binafsha)       | Yangi (logo)          |
| ----------------------- | --------------------- | --------------------- |
| `--brand-primary`       | `#6d46d6` / `#a78bfa` | `#1a7a34` / `#5ec97a` |
| `--brand-primary-hover` | `#5c37bd` / `#b9a2fc` | `#14622a` / `#7ad694` |
| `--brand-primary-soft`  | `#f0ebfd` / `#2e2740` | `#e6f4e9` / `#1d3325` |
| `--brand-on-primary`    | `#ffffff` / `#1a1520` | `#ffffff` / `#0d2113` |
| `--brand-accent`        | `#ff6b5c` / `#ff8b7e` | `#f58a1f` / `#f3a44f` |

- **Neytrallar binafsha tusdan iliq tusga o'tdi** (`--content-*`, qorong'i `--surface-*`,
  `--border-*`, soyalar). Yashil brend binafsha tusli kulrang ustida iflos ko'rinardi.
- **`--success` endi smaragd/tilrang** (`#0f8a63` / `#4fd3a4`). Sababi: brend yashil bo'lgach,
  avvalgi yashil `success` bilan qo'shilib ketardi. `--data-3` ham shu sababdan tilrang.
- `--data-1` va `--chart-income` brend yashil.
- `index.html` dagi qorong'i `theme-color` va `public/favicon.svg` (binafsha chaqmoq) ham
  yashilga bo'yaldi. **Favicon hali logo emas** — shakli eski chaqmoq, faqat rangi mos.
- Abakus yog'och/amber ranglari (`--abacus-*`) tegilmadi — logoda ham yog'och abakus bor, mos.

## Kontrast

Barcha asosiy juftliklar WCAG AA (≥4.5) dan o'tdi, skript bilan tekshirildi: eng past juftliklar —
yashil matn och yashil fonda 4.77, oq matn yashil tugmada 5.42. Qorong'i rejimda hammasi ≥5.15.

Brauzerda ko'rildi: /link, landing (`dev:local`), ustoz paneli — yorug' va qorong'i rejimda.
Bog'liq: [[bio-havola-sahifasi]], [[landing-redizayn]].
