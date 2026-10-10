---
name: maxsus-domen
description: "chaqqon-chaqqon.uz (Ahost) Vercel'ga ulandi 2026-10-11 — DNS Ahost'da, www → apex 308, telegram-webhook APP_URL yangi domenda; qolgan qo'l ishlari"
metadata:
  type: project
---

# Maxsus domen: chaqqon-chaqqon.uz

Domen Ahost'dan olindi. **2026-10-11 dan jonli:** `https://chaqqon-chaqqon.uz` ochiladi, SSL bor,
build eski `chaqqon-chaqqon.vercel.app` dagi bilan bir xil. Eski manzil ham ishlashda davom etadi.

## Sozlama

- DNS **Ahost'da** qoladi, Vercel nameserver'lariga ko'chirilmaydi. Delegatsiya:
  `rdns1-3.ahost.uz`.
- Apex: `A @ → 76.76.21.21`, buni foydalanuvchi qo'ygan. Vercel yangi IP'larni (`216.198.79.1`,
  `64.29.17.1`) tavsiya qiladi, lekin bu ixtiyoriy: hozirgi sozlama "valid configuration".
- `www.chaqqon-chaqqon.uz` Vercel loyihasiga qo'shilgan va apex'ga **308** bilan yo'naltirilgan
  (API: `PATCH /v9/projects/{id}/domains/www...` `redirect`). Ishlashi uchun Ahost'da
  `CNAME www → e3c547b311eb8b86.vercel-dns-017.com` kerak (zaxira qiymat: `cname.vercel-dns.com`).
  2026-10-11 holatiga bu yozuv hali yo'q edi.
- Tekshirish: `npx -y vercel domains verify www.chaqqon-chaqqon.uz`.

## Yangi domenga o'tkazilganlar

- `supabase/functions/telegram-webhook/index.ts` dagi `APP_URL` → `https://chaqqon-chaqqon.uz`
  (commit `6ef0d61`). Edge function MCP `deploy_edge_function` orqali **5-versiya** sifatida chiqarildi,
  `verify_jwt=false` saqlangan, smoke-test: POST `{}` → 200, GET → 405.
- 2026-10-11 holatiga `6ef0d61` **push qilinmagan**, chunki undan oldin push qilinmagan `801b2eb` turgan
  edi. Push'ni foydalanuvchi hal qiladi.

## Qolgan qo'l ishlari (foydalanuvchi)

- BotFather `/setmenubutton`: Mini App URL'ini yangi domenga almashtirish.
- Brauzerdagi login sessiyasi origin'ga bog'liq, shuning uchun yangi domenda hamma bir marta qaytadan
  kiradi. `vercel.app` ni yangi domenga redirect qilish hozircha qilinmagan; bu foydalanuvchining
  qarori.

## Tuzoqlar

- Supabase CLI'da login yo'q (`AccessTokenRequiredError`). Edge function MCP orqali deploy qilinadi:
  `functions/<slug>/index.ts` + `functions/_shared/*.ts` tuzilmasida, `verify_jwt` jonli
  versiyadagidek beriladi.
- 2026-10-10 da `npx vercel whoami` qotib qolishining sababi npm tarmoq xatosi edi (paket yuklanmadi),
  login emas. Keyingi kun CLI muammosiz ishladi (`vercel` 63.1.2, `mcodevs`).
- Vault papkasi repo ildizi bilan bir xil: bu nota repoda `references/maxsus-domen.md` bo'lib
  ko'rinadi.

---

Related: [[vault-konvensiyasi]] · [[platforma-kop-ustoz]] · [MEMORY.md](../MEMORY.md)
