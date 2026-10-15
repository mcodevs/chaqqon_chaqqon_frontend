# Trenerlar uchun Reels (9:16, 84 s)

Ovoz: `../posts/video_rnnoise.m4a` (RNNoise bilan tozalangan) → `public/voice.m4a`.
Matn: `../posts/video_script.txt`.

| Qadam | Buyruq | Nima qiladi |
|---|---|---|
| 1 | `npm run capture` | `npm run dev:local` (5174) ishlab turganda platformaga namunaviy ustoz, 10 o'quvchi va natijalarni qo'shib, ekranlarni `public/screens/` ga oladi. Supabase'ga tegmaydi. |
| 2 | `npm run music` | Original fon musiqasini sintez qiladi (`public/music.wav`) — mualliflik huquqi muammosi yo'q. |
| 3 | `npm run studio` | Remotion studiyasida ko'rib chiqish/tahrirlash. |
| 4 | `npm run build` | Ovozsiz render, so'ng `scripts/mix.sh`: ovoz + musiqa (ovoz paytida musiqa pasayadi), −14 LUFS. Natija: `out/chaqqon-trener-reels.mp4`. |

Sahna vaqtlari `src/timeline.ts` da — Whisper so'z vaqtlaridan olingan. Ovoz almashsa, shu yerni yangilang.

Namunaviy hisoblar (faqat capture brauzerining vaqtinchalik profilida yashaydi): `capture/capture.mjs` boshida.

## 3D versiya (`Reels3D`)

Xuddi shu ovoz va vaqt jadvali, lekin har bir asosiy element haqiqiy 3D obyekt (three.js, `@remotion/three`):

| Nima | Qayerda |
|---|---|
| Studiya: kamera (30°, 35.84 birlik — z=0 da 1 birlik = 100 px), yorug'lik, soya poli, fon kubiklari | `src/three/Stage.tsx` |
| Resurslar: Baloo 2 TTF → three Font, teksturalar; **HTML darajasida** yuklanadi (kanvas ichidagi `delayRender` kadrga ulgurmaydi) | `src/three/assets.ts` |
| Obyektlar: `Text3D` (ekstruziya), `Slab`, `Abacus3D` (ilovaning sorobani), `Coin` (logo tanga), `TileChar`, `Star`, `Clock3D` | `src/three/objects.tsx` |
| Qalinlikka ega telefon — CSS 3D qatlamlar, ekran piksel-aniq qoladi | `src/three/Phone3D.tsx` |
| Sahnalar | `src/Reels3D.tsx` |

```bash
npm run build:3d      # render (--gl=angle shart) + mix → out/chaqqon-trener-reels-3d.mp4
```
