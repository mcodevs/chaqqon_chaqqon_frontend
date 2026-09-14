import { describe, expect, it } from 'vitest';
import { createPbkdf2PasswordHasher } from './pbkdf2PasswordHasher';

describe('pbkdf2PasswordHasher', () => {
  const hasher = createPbkdf2PasswordHasher();

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('1234');
    expect(hash).not.toContain('1234$');
    expect(await hasher.verify('1234', hash)).toBe(true);
    expect(await hasher.verify('4321', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hasher.hash('same')).not.toBe(await hasher.hash('same'));
  });

  it('rejects malformed hashes', async () => {
    expect(await hasher.verify('1234', 'plain-text')).toBe(false);
  });
});
