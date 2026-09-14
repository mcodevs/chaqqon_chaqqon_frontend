export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/** Hash format: `pbkdf2-sha256$<iterations>$<salt hex>$<key hex>`. */
export function createPbkdf2PasswordHasher(crypto: Crypto = globalThis.crypto): PasswordHasher {
  const derive = async (password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) => {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      material,
      KEY_BITS,
    );
    return new Uint8Array(bits);
  };

  return {
    async hash(password) {
      const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
      const key = await derive(password, salt, ITERATIONS);
      return [ALGORITHM, ITERATIONS, toHex(salt), toHex(key)].join('$');
    },

    async verify(password, hash) {
      const [algorithm, iterations, saltHex, keyHex] = hash.split('$');
      if (algorithm !== ALGORITHM || !saltHex || !keyHex) return false;
      const key = await derive(password, fromHex(saltHex), Number(iterations));
      return constantTimeEqual(key, fromHex(keyHex));
    },
  };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
