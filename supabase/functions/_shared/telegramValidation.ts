/**
 * Validates Telegram Mini App initData according to the official specification:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * Uses standard Web Crypto API (crypto.subtle) so it works in both Deno Edge Functions
 * and Node.js (Vitest) without dependencies.
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
}

export async function validateTelegramInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSeconds = 86400 * 3, // 3 days tolerance
): Promise<{ valid: boolean; user?: TelegramUser; authDate?: number; error?: string }> {
  if (!initDataRaw || !botToken) {
    return { valid: false, error: 'MISSING_DATA' };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) {
    return { valid: false, error: 'MISSING_HASH' };
  }

  // Remove hash and sort remaining keys alphabetically
  params.delete('hash');
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

  try {
    const encoder = new TextEncoder();

    // 1. secret_key = HMAC_SHA256(botToken, "WebAppData")
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const secretKeyBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

    // 2. data_hash = HMAC_SHA256(dataCheckString, secret_key)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));

    // Convert signature to hex
    const calculatedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false, error: 'INVALID_SIGNATURE' };
    }

    const authDateStr = params.get('auth_date');
    const authDate = authDateStr ? Number.parseInt(authDateStr, 10) : 0;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (maxAgeSeconds > 0 && authDate > 0 && nowSeconds - authDate > maxAgeSeconds) {
      return { valid: false, error: 'DATA_EXPIRED' };
    }

    const userRaw = params.get('user');
    let user: TelegramUser | undefined;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as TelegramUser;
      } catch {
        // user string wasn't JSON
      }
    }

    return { valid: true, user, authDate };
  } catch (err) {
    return { valid: false, error: `CRYPTO_ERROR: ${err instanceof Error ? err.message : String(err)}` };
  }
}
