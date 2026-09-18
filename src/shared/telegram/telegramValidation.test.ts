import { describe, expect, it } from 'vitest';
import { validateTelegramInitData } from '../../../supabase/functions/_shared/telegramValidation';

// Helper to construct a valid Telegram initData query string for testing
async function createTestInitData(params: Record<string, string>, botToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const searchParams = new URLSearchParams(params);
  const sortedKeys = Array.from(searchParams.keys()).sort();
  const dataCheckString = sortedKeys.map((key) => `${key}=${searchParams.get(key)}`).join('\n');

  const webAppDataKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const secretKeyBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

  const secretKey = await crypto.subtle.importKey(
    'raw',
    secretKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
  const hash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  searchParams.set('hash', hash);
  return searchParams.toString();
}

describe('validateTelegramInitData', () => {
  const TEST_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  it('validates genuine Telegram initData correctly', async () => {
    const now = Math.floor(Date.now() / 1000);
    const user = { id: 77712345, first_name: 'Jasurbek', username: 'jasur_dev' };
    const raw = await createTestInitData(
      {
        auth_date: now.toString(),
        query_id: 'AAHdF6IQAAAAAN0XohD9K...',
        user: JSON.stringify(user),
      },
      TEST_BOT_TOKEN,
    );

    const result = await validateTelegramInitData(raw, TEST_BOT_TOKEN);
    expect(result.valid).toBe(true);
    expect(result.user).toEqual(user);
    expect(result.authDate).toBe(now);
  });

  it('rejects tampered initData', async () => {
    const now = Math.floor(Date.now() / 1000);
    const user = { id: 77712345, first_name: 'Jasurbek' };
    const raw = await createTestInitData(
      {
        auth_date: now.toString(),
        user: JSON.stringify(user),
      },
      TEST_BOT_TOKEN,
    );

    // Tamper with data
    const tampered = raw.replace('Jasurbek', 'Hacker');
    const result = await validateTelegramInitData(tampered, TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_SIGNATURE');
  });

  it('rejects expired initData when maxAge is configured', async () => {
    const expiredTime = Math.floor(Date.now() / 1000) - 10000;
    const raw = await createTestInitData(
      {
        auth_date: expiredTime.toString(),
        user: JSON.stringify({ id: 12345, first_name: 'Old' }),
      },
      TEST_BOT_TOKEN,
    );

    const result = await validateTelegramInitData(raw, TEST_BOT_TOKEN, 3600); // 1 hour max age
    expect(result.valid).toBe(false);
    expect(result.error).toBe('DATA_EXPIRED');
  });

  it('rejects missing hash or empty string', async () => {
    const result = await validateTelegramInitData('user=123', TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_HASH');
  });
});
