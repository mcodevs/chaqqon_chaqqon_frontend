import { describe, expect, it } from 'vitest';
import {
  AUTH_EMAIL_DOMAIN,
  authEmailFor,
  authPasswordFor,
} from '../../../supabase/functions/_shared/identity';

describe('auth identity contract', () => {
  it('derives one e-mail per username regardless of casing and spacing', () => {
    expect(authEmailFor(' Ali10 ')).toBe(`ali10@${AUTH_EMAIL_DOMAIN}`);
    expect(authEmailFor('ali10')).toBe(authEmailFor('ALI10'));
  });

  it('turns a 4-digit PIN into a password Supabase Auth accepts', () => {
    expect(authPasswordFor('1234').length).toBeGreaterThanOrEqual(6);
    expect(authPasswordFor('1234')).not.toBe(authPasswordFor('4321'));
  });
});
