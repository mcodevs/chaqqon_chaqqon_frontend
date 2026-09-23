/*
 * Telegram helpers shared by the link/unlink/notify functions.
 * Pure Web APIs only (crypto, fetch, TextEncoder) so the verification logic
 * can be unit-tested from the web test runner, like `identity.ts`.
 */

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies Telegram Mini App `initData` against the bot token and returns the
 * authenticated user, or null when the signature is missing, wrong, or stale.
 * See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60,
): Promise<TelegramUser | null> {
  if (!initData || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash) return null;

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  // secret_key = HMAC_SHA256(key="WebAppData", message=bot_token)
  const secretKey = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken);
  const computed = toHex(await hmacSha256(secretKey, dataCheckString));
  if (computed !== hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (Number.isFinite(authDate) && maxAgeSeconds > 0) {
    const ageSeconds = Date.now() / 1000 - authDate;
    if (ageSeconds > maxAgeSeconds) return null;
  }

  const userJson = params.get('user');
  if (!userJson) return null;
  try {
    const user = JSON.parse(userJson) as TelegramUser;
    return typeof user.id === 'number' ? user : null;
  } catch {
    return null;
  }
}

/** Sends a plain-text message to a chat. Resolves false on any Telegram API error. */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
