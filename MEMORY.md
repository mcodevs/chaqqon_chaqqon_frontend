# Chaqqon-chaqqon — loyiha xotirasi

Bu fayl — **indeks**. Batafsil ma'lumot `references/` papkasida. Ishni boshlashdan oldin shu
yerdan kerakli faylni oching.

> `README.md` — omma uchun (GitHub'da ko'rinadi). Bu fayl va `references/` — ichki ish xotirasi:
> qarorlar, sabablar, holat va tuzoqlar. Nota formati: [[vault-konvensiyasi]].

## Indeks

- [Yozma vazifa (chop etish)](references/yozma-vazifa-chop-etish.md) — `/teacher/worksheet`; bosib chiqarish **`<body>` portali + `[data-print-root]`** orqali, `@page` global; A4 ga sig'dirish hisobi CSS bilan juftlashgan; Telegram ichida bot PDF yuboradi (`telegram-send-document`, 2026-10-11)
- [Ko'p ustozli platforma](references/platforma-kop-ustoz.md) — 2026-10-10: tenant=ustoz, superadmin + ariza, tariflar (limit + funksiyalar), ustoz balansi (7 kun muhlat), 4 bosqichli chiqarish; admin Tariflar sahifasi redizayni (auditoriya bo'yicha guruhlangan bo'limlar, solishtiriladigan kartalar); admin ro'yxatlari naqshi (`SearchField`, o'ngga tekis `rowEnd`, bo'linmaydigan `FilterPills`)
- [O'sish vositalari](references/osish-vositalari.md) — 2026-10-10: tavsiya etilgan tarif, kunlik narx, real raqamlar (chegara bilan), bepul sinov, kafolat, referal (`?taklif=`, bonus faqat taklif qilganga), boshlash ro'yxati, ariza eslatmasi
- [Landing redizayni](references/landing-redizayn.md) — 2026-10-10/11: "Jonli raund" demo-first + review (49 tuzatish) + responsive (breakpointlar 768/1024/1440, --lp-max, Imkoniyatlar qatorlari, tarif karuseli); 2026-10-11 push qilindi
- [Yulduz qoidasi (90%)](references/yulduz-qoidasi.md) — 2026-10-11: uy vazifasida ≥90% to'g'ri → 1 yulduz, DB trigger, retroaktiv emas; prodda 2026-10-11 dan
- [Tarif tavsiyasi](references/tarif-tavsiyasi.md) — 2026-10-11: egasi yaratdi Bronza 0/5, Kumush⭐ 50k/10, Oltin 70k/cheksiz; tahlil: Kumush Oltin oldida yutqazadi, Oltin arzon, bepulda asosiy qiymat yo'q; taklif Bronza 0/5 + uy vazifasi, Kumush 59k/20, Oltin 99k
- [useAsyncAction void tuzog'i](references/useasyncaction-void-tuzogi.md) — `run()` void amalda ham `undefined` qaytaradi → shoxlanadigan joyda `return true` bilan o'rang; local sinov uchun `verify.localhost:5174` toza origin
- [Maxsus domen](references/maxsus-domen.md) — 2026-10-11: **chaqqon-chaqqon.uz jonli** (DNS Ahost'da, www → apex 308, `www` uchun CNAME hali kerak); telegram-webhook `APP_URL` yangi domenda (v5, MCP deploy); qolgan ishlar: BotFather menu URL, `6ef0d61` push
- [Bio-havola sahifasi](references/bio-havola-sahifasi.md) — /link: ustoz uchun taplink muqobili; 2026-10-14 dan jonli (chaqqon-chaqqon.uz/link); 2 havola (ota-onaga Telegram CTA, ustozga platforma), animatsiya: soroban toshlari ~810 ms, reduced-motion bilan teng; sahifa sof statik (ma'lumot yuklamaydi)
- [Brend ranglari](references/brend-ranglari.md) — 2026-10-15: butun platforma logo palitrasida (yashil #1a7a34/#5ec97a, to'q sariq urg'u); faqat tokens.css o'zgardi, success tilrangga surildi, ikonkalar logodagi bolaning rasmidan (favicon.svg o'chirildi; 32/48px — yuz kesimi, 180px — butun figura)
- [Trenerlar uchun Reels](references/reels-trener-video.md) — 2026-10-15: 84 s 9:16 video, Remotion `marketing/reels-trener` (capture → music → render → mix); ekranlar dev:local + puppeteer seed, musiqa o'zimiz sintez qilgan, oxirgi kadr faqat logo + telefon; tuzoqlar: `isMobile` reload, pastki nav click

## Eslatma

`references/` 2026-10-06 da qayta boshlandi. Loyihaning qolgan xotirasi hozircha
`~/.claude/projects/-Users-mcodevs-my-projects-chaqqon-chaqqon/memory/` da — vaultdan alohida,
avtomatik ko'chmaydi. Yangi nota yozilganda o'sha yerdan mos keluvchisini shu papkaga ko'chirib
qo'yish ma'qul.
