import { describe, expect, it } from 'vitest';
import { readBackendConfig } from './config';

describe('readBackendConfig', () => {
  it('uses Supabase when both variables are set', () => {
    expect(
      readBackendConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' key ',
      }),
    ).toEqual({ kind: 'supabase', url: 'https://abc.supabase.co', publishableKey: 'key' });
  });

  it('falls back to browser storage when nothing is set', () => {
    expect(readBackendConfig({})).toEqual({ kind: 'local' });
    expect(readBackendConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toEqual({
      kind: 'local',
    });
  });

  it('refuses a half-configured backend', () => {
    expect(() => readBackendConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toThrow();
  });
});
