import { describe, expect, it } from 'vitest';
import { verifyTelegramInitData } from '../../../supabase/functions/_shared/telegram';

const BOT_TOKEN = '123456:test-bot-token';

async function hmac(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
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

/** Builds a correctly signed `initData` string the way Telegram would. */
async function signInitData(
  fields: Record<string, string>,
  token = BOT_TOKEN,
): Promise<string> {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secretKey = await hmac(new TextEncoder().encode('WebAppData'), token);
  const hash = toHex(await hmac(secretKey, dataCheckString));
  const params = new URLSearchParams(fields);
  params.set('hash', hash);
  return params.toString();
}

describe('verifyTelegramInitData', () => {
  const user = JSON.stringify({ id: 42, first_name: 'Ali' });
  const freshAuthDate = String(Math.floor(Date.now() / 1000));

  it('accepts data signed with the right bot token and returns the user', async () => {
    const initData = await signInitData({ auth_date: freshAuthDate, user });
    const result = await verifyTelegramInitData(initData, BOT_TOKEN);
    expect(result?.id).toBe(42);
  });

  it('rejects a tampered hash', async () => {
    const initData = await signInitData({ auth_date: freshAuthDate, user });
    const tampered = initData.replace(/hash=[0-9a-f]+/, 'hash=deadbeef');
    expect(await verifyTelegramInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it('rejects data signed with a different token', async () => {
    const initData = await signInitData({ auth_date: freshAuthDate, user }, 'other-token');
    expect(await verifyTelegramInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects stale data past the max age', async () => {
    const old = String(Math.floor(Date.now() / 1000) - 60 * 60 * 48);
    const initData = await signInitData({ auth_date: old, user });
    expect(await verifyTelegramInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects empty input', async () => {
    expect(await verifyTelegramInitData('', BOT_TOKEN)).toBeNull();
    expect(await verifyTelegramInitData('auth_date=1&user=%7B%7D', '')).toBeNull();
  });
});
