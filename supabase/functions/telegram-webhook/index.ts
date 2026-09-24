import { handle, json } from '../_shared/http.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';

/**
 * Telegram Bot webhook. Replies to /start (and any plain message) with a short
 * greeting and a button that opens the Mini App. Register it once with:
 *   https://api.telegram.org/bot<token>/setWebhook?url=<this function url>
 * Optionally protected by a secret: if TELEGRAM_WEBHOOK_SECRET is set, the
 * request's X-Telegram-Bot-Api-Secret-Token header must match it.
 */
const APP_URL = 'https://chaqqon-chaqqon.vercel.app';

const WELCOME =
  '👋 <b>Assalomu alaykum!</b>\n\n' +
  '<b>Chaqqon-chaqqon</b> — mental arifmetika platformasiga xush kelibsiz.\n\n' +
  'Quyidagi tugma orqali ilovani oching va hisobingizga kiring 👇\n\n' +
  'Kirganingizdan so‘ng bu yerga xabar bo‘lib keladi:\n' +
  '📝 uy vazifalari\n' +
  '🧮 interaktiv topshiriqlar\n' +
  '🎁 do‘kon xaridlari va sovg‘alar';

Deno.serve(
  handle(async (request) => {
    const expected = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    if (expected) {
      const provided = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
      if (provided !== expected) return json({ ok: true }); // ignore forgeries quietly
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    if (!botToken) return json({ ok: true });

    let update: { message?: { chat?: { id?: number }; text?: string } } | null = null;
    try {
      update = await request.json();
    } catch {
      return json({ ok: true });
    }

    const chatId = update?.message?.chat?.id;
    if (typeof chatId === 'number') {
      await sendTelegramMessage(botToken, chatId, WELCOME, {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [[{ text: '🚀 Ilovani ochish', web_app: { url: APP_URL } }]],
        },
      });
    }

    // Telegram only needs a 200; it ignores the body.
    return json({ ok: true });
  }),
);
