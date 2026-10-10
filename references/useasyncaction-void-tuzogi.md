---
name: useasyncaction-void-tuzogi
description: "useAsyncAction.run() void amalda ham, xatoda ham undefined qaytaradi — natijaga qarab shoxlanadigan joyda amalni `return true` bilan o'rash shart"
metadata:
  type: project
---

# `useAsyncAction` — void amal tuzog'i

2026-10-10 da topildi va tuzatildi.

`src/shared/hooks/useAsyncAction.ts` dagi `run()` amal **xato tashlasa** `undefined` qaytaradi. Lekin
amalning o'zi `Promise<void>` bo'lsa, muvaffaqiyatda ham `undefined` keladi — ikkalasini ajratib
bo'lmaydi. Shuning uchun `if (await x.run(...))` shoxi void amalda **hech qachon** ishlamaydi.

**Bo'lgan xato:** `EditStudentForm` `students.updateProfile` ni (void) to'g'ridan-to'g'ri o'ragan edi →
saqlash muvaffaqiyatli bo'lsa ham `onSaved()` chaqirilmas, tahrir formasi ochiq qolardi.

## Qoida

Natijaga qarab shoxlanadigan joyda void amalni `true` qaytaradigan qilib o'rang (admin formalaridagi
naqsh, masalan `AdminTariffsPage.tsx`):

```ts
const save = useAsyncAction(async (...args: Parameters<typeof service.method>) => {
  await service.method(...args);
  return true;
});
```

Qiymat qaytaradigan amallar (`Session`, `Credentials`, `Payment`, `PracticeResult`...) uchun o'rash
kerak emas. Natija ishlatilmaydigan chaqiruvlar (`void x.run(...)`) ham xavfsiz.

2026-10-10 dagi audit: `src/features` dagi barcha `.run(` chaqiruvlari tekshirildi — boshqa buzilgan
joy yo'q edi.

## Brauzerda local sinash: toza origin

`npm run dev:local` (5174) `localStorage` da ishlaydi. Agar `localhost:5174` da avvalgi sessiyadan
paroli noma'lum hisoblar qolgan bo'lsa, ularni o'chirmang — **`http://verify.localhost:5174`** ni
oching: o'sha server, lekin alohida origin, bo'sh xotira (superadmin → ustoz → o'quvchi noldan).
`127.0.0.1` / `[::1]` brauzer panelida ochilmadi; `*.localhost` ishlaydi.

---

Related: [[vault-konvensiyasi]] · [MEMORY.md](../MEMORY.md)
