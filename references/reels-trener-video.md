---
name: reels-trener-video
description: '2026-10-15: trenerlarga qaratilgan 84 s Reels (9:16) — Remotion loyihasi marketing/reels-trener; ekranlar dev:local + puppeteer, musiqa o''zimiz sintez qilgan, ovoz RNNoise; natija marketing/posts/chaqqon-trener-reels.mp4'
metadata:
  type: project
---

# Trenerlar uchun Reels videosi

Egasi o'z ovozli videosini berdi (`video.MOV`, 82 s, matn `marketing/posts/video_script.txt`) —
undan faqat ovoz olindi, tasvir esa qaytadan yasaldi. Natija: `marketing/posts/chaqqon-trener-reels.mp4`
(1080×1920, 84 s, −14 LUFS). Hali commit qilinmagan.

## Egasining talablari

- vertikal, Reels uchun;
- real kadr yo'q — faqat grafika va platforma skrinshotlari;
- oxirgi kadrda **faqat logo + `+998 99 304 11 55`**, boshqa hech narsa;
- bepul musiqa, lekin ovozni to'smasin;
- skrinshotlarda reklamabop namunaviy ma'lumot.

## Quvur (`marketing/reels-trener/`, README bor)

1. **Ovoz** — ffmpeg `arnndn` (RNNoise, `sh.rnnn` modeli, richardpl/arnndn-models) egasiga oddiy
   `afftdn` dan ko'ra yoqdi. Model scratchpad'da edi — keyingi safar qayta yuklash kerak.
2. **Ekranlar** — `capture/capture.mjs`: puppeteer-core + tizimdagi Chrome, `npm run dev:local`
   (5174) ga `reels.localhost` origin orqali kiradi. Sahifa ichida
   `import('/src/infrastructure/local/index.ts')` → `createLocalPorts` bilan seed qiladi (admin,
   ustoz "Dilnoza Karimova / Chaqqon akademiyasi", 10 o'quvchi, natijalar, to'lovlar). Supabase'ga
   tegmaydi. DPR = 1080/390 → 1080 px kenglik.
3. **Musiqa** — `music/make_music.py` (numpy/scipy, `~/.venvs/mlx-whisper` ichida): 100 BPM,
   C–G–Am–F, pad + bas + pluck + yengil baraban. O'zimiz sintez qilganimiz uchun Content ID
   da'vosi bo'lmaydi.
4. **Video** — Remotion 4 (`src/Reels.tsx`, `src/ui.tsx`), 17 sahna. Vaqtlar `src/timeline.ts`
   da, Whisper so'z vaqtlaridan (`--word-timestamps True`). Ranglar Warm Focus tokenlaridan
   ([[brend-ranglari]]), shrift Baloo 2 + Nunito.
5. **Mix** — `scripts/mix.sh`: musiqa 350 Hz va 2.5 kHz da kesilgan, ovoz sidechain bilan
   duck qiladi; nutq paytida musiqa ovozdan ~15.5 dB past (birinchi urinish 23 dB — eshitilmas edi).

## Tuzoqlar

- **Puppeteer `setViewport` da `isMobile` o'zgarsa sahifa qayta yuklanadi** — React holati
  (yaratilgan yozma varaq) yo'qoladi. Kenglikni o'zgartirganda `isMobile: true` ni saqlang.
- **Pastki navigatsiya tugmalarni yopadi**: pointer click "Uy vazifasi" tabiga tushib, boshqa
  sahifa ochilardi. `element.click()` (DOM click) bilan bosing.
- Whisper `--language uz` bilan ham ozarbayjoncha harf aralash yozadi — vaqt uchun yaroqli,
  matn uchun emas.
- Yozma varaq sarlavhasini butun varaqni zoom qilib ko'rsatish chetlarini (ism chapda, telefon
  o'ngda) kesib yuboradi — varaqning kerakli joylari alohida "lupa" kartalarida kattalashtirildi
  ([[yozma-vazifa-chop-etish]]).

- **Kadrma-kadr tekshiruv (2026-10-15, 2-versiya):** `WarmBackground` ga sahna boshlanish vaqti (kasr son)
  seed sifatida berilgani uchun plitka raqami `3.6000000009` bo'lib chiqib, har sahnaning pastida xira
  matn bo'lib yotardi — seed butun son bo'lishi shart. Shu o'tishda: logo kursori yozuvdan oldin
  yolg'iz chiqmaydi, flesh-karta "karta → chaqnash → savol" sikli, abakus/mavzular ro'yxati ustma-ust
  tushmaydi, "tayyormisiz?" so'z aytilayotganda chiqadi (sahna 69.65 gacha cho'zildi).
- `npm run render:silent -- --flag` ishlamaydi — Remotion flagni npm orqali olmaydi va **render umuman
  bajarilmaydi**, eski fayl qoladi. Flagni to'g'ridan-to'g'ri `npx remotion render ...` ga bering.

- **3-versiya (2026-10-15, egasining 9 ta izohi):** abakus endi ilovaning `Soroban.tsx` chizmasiga
  mos (ramka/maydon/tayoq/bikon toshlar + raqam o'qigichi, `--abacus-*` tokenlari); telefon —
  bezel 2.2%, island, chizilgan status bar (`STATUS_H=64`), yon tugmalar; fon plitkalari butun
  video davomida bitta `WarmBackground` (sahna boshida sakramaydi); **Baloo 2 ning ascenderi
  baland** — qutidagi matnni `boxed` (line-height 1 + `translateY(0.07em)`) bilan markazga tushiriladi,
  barcha yorliqlar `Pill`/`IconRow` orqali; reyting ramkasi o'lchangan (qator 357/183/160 px,
  92–987 px capture'da); diagramma — gradientli ustunlar + trend chizig'i + foizlar; shior va
  "Biz bilan" bloklari qayta terildi.

- **4-versiya (2026-10-15):** egasiga 3-versiyadagi ustunli diagramma, oq kartali shior va "Biz
  bilan" ro'yxati yoqmadi. Almashtirildi: diagramma → zinapoya + sakrab chiqadigan kulgich plitka
  (`TileFace`, `Stairs`) + kubok/konfetti; shior → kartasiz plakat tipografiyasi (112px, sariq
  `#ffd166` urg'u); "Biz bilan" → uchta rangli, qiyshaytirilgan stiker-`Pill`. Egasining didi:
  **oq kartalar va "korporativ" diagramma emas, o'yinqaroq/plakat uslubi** — keyingi reklamalarda
  shu yo'nalishdan boshlash.


- **2026-10-15, ism almashuvi:** egasi yozma varaqdagi ustoz ismini "Mohira Ravshan qizi" qildirdi
  (1-versiya qayta render). `SHEET_ONLY=1 node capture/capture.mjs` — faqat varaqni qayta oladi,
  boshqa skrinshotlarga tegmaydi; namunaviy ustoz endi Mohira Ravshan qizi / Chaqqon akademiyasi /
  +998993041155. Ism lupasi kengaytirildi (w 250, scale 2.8). Eski varaq scratchpad'da qoldi, repoda yo'q.


- **Instagram podpisi (2026-10-15):** `marketing/posts/instagram-caption.txt` — birinchi qator savol
  (lentada ~125 belgi ko'rinadi), 6 ta funksiya bandi, "14 kun bepul, karta talab qilinmaydi"
  (landing jumlasi — tarif o'zgarsa tekshirish kerak), telefon + "havola bioda", 15 ta heshteg.
  Egasi videoni Reels sifatida joylamoqchi.

## 3D versiya (2026-10-15)

Egasi 4-versiyani "1-variant" deb qabul qildi va **3D variant** so'radi. `Reels3D` kompozitsiyasi:
three.js + `@remotion/three` (r3f 9, drei 10, three 0.170), `src/three/` (Stage, assets, objects,
Phone3D). Render **`--gl=angle`** bilan (Mac), ~10 daqiqa; `npm run build:3d` →
`out/chaqqon-trener-reels-3d.mp4`. Uslub: "yaltiroq o'yinchoq studiya" — clearcoat plastik,
yumshoq soya poli, fon kubiklari; kamera 30°, z=35.84 → **z=0 da 1 birlik = 100 px** (`px()`).

Tuzoqlar:
- **Kanvas ichidagi `delayRender` kadrga ulgurmaydi** — r3f alohida React ildizida; shrift/tekstura
  HTML darajasida (`AssetsProvider`) yuklanib, kontekst orqali uzatiladi (r3f kontekstni ko'priklaydi).
- Baloo 2 ni Google'dan TTF qilib olish: `curl -A "Mozilla/5.0 (Windows NT 5.1)"` bilan css2 so'rovi
  ttf URL beradi; `TTFLoader` (opentype) → `FontLoader.parse` → `TextGeometry`.
- `torusGeometry` allaqachon XY tekisligida — unga `rotation=[π/2,0,0]` bersangiz halqa yotib,
  obyekt ustidan chiziq bo'lib o'tadi (soat va tanga shu xatoga uchradi).
- Havoda turgan obyektlarning pol soyasi kadr pastida ajralgan dog' bo'ladi — soya polini faqat
  obyekt haqiqatan turgan sahnalarda yoqing (hook abakus, zinapoya); matn `castShadow` qilmasin.
- Telefon CSS 3D: 16 qatlam × 2.1 px — ekran piksel-aniq, tana qalin ko'rinadi; `PhoneScreen`
  `ui.tsx` dan ajratib olindi va ikkala versiya ishlatadi.
