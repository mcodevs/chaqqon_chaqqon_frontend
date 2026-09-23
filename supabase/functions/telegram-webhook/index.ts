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
  'Assalomu alaykum! 👋\n\n' +
  'Chaqqon-chaqqon — mental arifmetika platformasiga xush kelibsiz.\n' +
  'Quyidagi tugma orqali ilovani oching va hisobingizga kiring. ' +
  'Kirganingizdan so‘ng uy vazifasi, do‘kon xaridlari va boshqa muhim ' +
  'yangiliklar shu yerga xabar bo‘lib keladi.';

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
        inline_keyboard: [[{ text: '🚀 Ilovani ochish', web_app: { url: APP_URL } }]],
      });
    }

    // Telegram only needs a 200; it ignores the body.
    return json({ ok: true });
  }),
);
