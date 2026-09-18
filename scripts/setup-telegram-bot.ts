/**
 * Configures @chaqqon_chaqqon_bot via Telegram Bot API:
 * - Sets the Chat Menu Button to open the Web App directly
 * - Sets bot description and short description
 * - Sets bot commands (/start, /help)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8857626762:AAHUfEua_Us0zh0Pzxh1otjqoNDjW_3ZKl0';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://chaqqon-chaqqon.vercel.app';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegramApi(method: string, body?: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API ${method} failed: ${data.description}`);
  }
  return data.result;
}

async function main() {
  console.log('🤖 Configuring Telegram Bot...');

  // 1. Check bot info
  const me = await callTelegramApi('getMe');
  console.log(`✓ Connected as @${me.username} (${me.first_name})`);

  // 2. Set Bot Commands
  await callTelegramApi('setMyCommands', {
    commands: [
      { command: 'start', description: "Ilovani ishga tushirish va Mini App'ni ochish" },
      { command: 'help', description: 'Bot va tizim haqida maʼlumot' },
    ],
  });
  console.log('✓ Bot commands registered');

  // 3. Set Chat Menu Button (Persistent button in chat)
  await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: "🚀 O'yinni boshlash",
      web_app: { url: WEB_APP_URL },
    },
  });
  console.log(`✓ Menu button set to open Web App: ${WEB_APP_URL}`);

  // 4. Set Descriptions
  await callTelegramApi('setMyDescription', {
    description:
      "Chaqqon-Chaqqon — mental arifmetika, soroban va tezkor hisob-kitob bo'yicha mashqlar va musobaqalar platformasi. Pastdagi tugma orqali Mini App'ni oching va darhol boshlang! 🧠⚡️",
  });
  await callTelegramApi('setMyShortDescription', {
    short_description: "Mental arifmetika va soroban Mini App'i 🧠⚡️",
  });
  // 5. Set Webhook for Supabase Edge Function
  const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://mwvulvsdsmmfurdzjkli.supabase.co/functions/v1/telegram-bot';
  try {
    await callTelegramApi('setWebhook', { url: WEBHOOK_URL });
    console.log(`✓ Webhook set to: ${WEBHOOK_URL}`);
  } catch (err) {
    console.warn(`! Webhook setting skipped or failed:`, err);
  }

  console.log('🎉 Telegram bot configured successfully!');
}

main().catch((err) => {
  console.error('Failed to configure bot:', err);
  process.exit(1);
});
