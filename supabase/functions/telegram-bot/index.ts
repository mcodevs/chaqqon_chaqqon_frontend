import { createAdminClient } from '../_shared/clients.ts';
import { corsHeaders } from '../_shared/http.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8857626762:AAHUfEua_Us0zh0Pzxh1otjqoNDjW_3ZKl0';
const WEB_APP_URL = Deno.env.get('WEB_APP_URL') || 'https://chaqqon-chaqqon.vercel.app';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: Record<string, unknown>) {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await request.json();

    // 1. Internal notification trigger (e.g. from app / teacher when room is opened)
    if (payload?.action === 'send-competition-notification') {
      const admin = createAdminClient();
      let query = admin
        .from('profiles')
        .select('id, telegram_chat_id, first_name')
        .eq('role', 'student')
        .not('telegram_chat_id', 'is', null);

      if (Array.isArray(payload?.participantIds) && payload.participantIds.length > 0) {
        query = query.in('id', payload.participantIds);
      }

      const { data: students } = await query;

      if (students && students.length > 0) {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🚀 Musobaqaga kirish",
                web_app: { url: `${WEB_APP_URL}/student/competition` },
              },
            ],
          ],
        };

        await Promise.allSettled(
          students.map((s) => {
            if (!s.telegram_chat_id) return Promise.resolve(null);
            const name = s.first_name?.trim() || "O'quvchi";
            const text =
              `🏆 <b>Yangi Musobaqa Boshlandi!</b>\n\n` +
              `Salom, <b>${name}</b>! Ustoz musobaqa xonasini ochdi va sizni qo'shdi.\n\n` +
              `⚡️ Do'stlaringiz bilan kuch sinashish uchun darhol o'yinga kiring!`;

            return sendTelegramMessage(s.telegram_chat_id, text, keyboard);
          }),
        );
      }

      return new Response(JSON.stringify({ ok: true, count: students?.length ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Market Order Status Notification (delivered or cancelled)
    if (payload?.action === 'send-market-notification' && payload?.studentId) {
      const admin = createAdminClient();
      const { data: student } = await admin
        .from('profiles')
        .select('telegram_chat_id, first_name')
        .eq('id', payload.studentId)
        .maybeSingle();

      if (student?.telegram_chat_id) {
        const name = student.first_name?.trim() || "O'quvchi";
        const itemTitle = payload.itemTitle || "sovg'a";
        const isDelivered = payload.status === 'delivered';

        const text = isDelivered
          ? `🎁 <b>Sovg'angiz Topshirildi!</b>\n\n` +
            `Tabriklaymiz, <b>${name}</b>! Siz buyurtma qilgan <b>«${itemTitle}»</b> sovg'asi ustozingiz tomonidan topshirildi! 🎉\n\n` +
            `⭐ Yulduzchalar yig'ishda davom eting va yangi sovg'alarga ega bo'ling!`
          : `↩️ <b>Buyurtma Bekor Qilindi</b>\n\n` +
            `Salom, <b>${name}</b>. Sizning <b>«${itemTitle}»</b> sovg'asiga bergan buyurtmangiz bekor qilindi.\n\n` +
            `⭐ <b>${payload.costStars ?? ''} ta yulduzcha</b> balansingizga to'liq qaytarildi.`;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🎁 Do'konni ochish",
                web_app: { url: `${WEB_APP_URL}/student/market` },
              },
            ],
          ],
        };

        await sendTelegramMessage(student.telegram_chat_id, text, keyboard);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Payment Recorded Notification
    if (payload?.action === 'send-payment-notification' && payload?.studentId) {
      const admin = createAdminClient();
      const { data: student } = await admin
        .from('profiles')
        .select('telegram_chat_id, first_name')
        .eq('id', payload.studentId)
        .maybeSingle();

      if (student?.telegram_chat_id) {
        const name = student.first_name?.trim() || "O'quvchi";
        const paidUntil = payload.paidUntil || '';

        const text =
          `✅ <b>To'lov Muvaffaqiyatli Qabul Qilindi!</b>\n\n` +
          `Salom, <b>${name}</b>! Sizning to'lovingiz qabul qilindi.\n\n` +
          `📅 Platformadan foydalanish muddatingiz <b>${paidUntil}</b> gacha uzaytirildi.\n\n` +
          `🚀 Mashg'ulotlaringizda omad va muvaffaqiyat tilaymiz!`;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🚀 Mashg'ulotni boshlash",
                web_app: { url: `${WEB_APP_URL}/student` },
              },
            ],
          ],
        };

        await sendTelegramMessage(student.telegram_chat_id, text, keyboard);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Telegram Webhook Update (messages from users)
    if (payload?.message) {
      const msg = payload.message;
      const chatId = msg.chat?.id;
      const text = (msg.text || '').trim();
      const firstName = msg.from?.first_name || "O'quvchi";

      if (text.startsWith('/start')) {
        const welcomeText =
          `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
          `🧠 <b>Chaqqon-Chaqqon</b> — mental arifmetika, soroban va tezkor hisoblash platformasining rasmiy botiga xush kelibsiz!\n\n` +
          `Bu yerda siz:\n` +
          `✨ Tezkor hisoblash mahoratingizni oshirishingiz\n` +
          `🏆 Jonli musobaqalarda qatnashib peshqadam bo'lishingiz\n` +
          `⭐ Yulduzchalar yig'ib ajoyib sovg'alar olishingiz mumkin!\n\n` +
          `Pastdagi tugmani bosing va o'yinni boshlang:`;

        const replyMarkup = {
          inline_keyboard: [
            [
              {
                text: "🚀 Chaqqon-Chaqqon'ni ochish",
                web_app: { url: WEB_APP_URL },
              },
            ],
          ],
        };

        await sendTelegramMessage(chatId, welcomeText, replyMarkup);
      } else if (text.startsWith('/help')) {
        const helpText =
          `ℹ️ <b>Yordam va Yo'riqnoma:</b>\n\n` +
          `1️⃣ <b>Kirish:</b> «🚀 Chaqqon-Chaqqon'ni ochish» tugmasini bosing.\n` +
          `2️⃣ <b>Bog'lash:</b> Birinchi marta kirganingizda ustoz bergan login va parolingizni kiriting — profilingiz Telegram hisobingizga biriktiriladi.\n` +
          `3️⃣ <b>Avtomatik kirish:</b> Keyingi safar parolsiz, darhol o'z profilingizga kirasiz!\n\n` +
          `Savollar yoki takliflar bo'lsa, ustozingizga murojaat qiling.`;

        await sendTelegramMessage(chatId, helpText);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, // Always 200 to Telegram so it doesn't endlessly retry bad updates
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
