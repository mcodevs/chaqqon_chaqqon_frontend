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
