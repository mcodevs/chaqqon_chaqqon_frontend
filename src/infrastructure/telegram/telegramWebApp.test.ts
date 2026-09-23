import { describe, expect, it, vi } from 'vitest';
import { getTelegramInitData, initTelegramViewport, isTelegramMiniApp } from './telegramWebApp';

function fakeWindow(webApp?: Partial<TelegramWebApp>): Window {
  return { Telegram: webApp ? { WebApp: webApp as TelegramWebApp } : undefined } as unknown as Window;
}

describe('telegramWebApp helpers', () => {
  it('reports unavailable in a plain browser (no Telegram global)', () => {
    const win = fakeWindow();
    expect(getTelegramInitData(win)).toBeNull();
    expect(isTelegramMiniApp(win)).toBe(false);
  });

  it('treats empty initData as not running inside Telegram', () => {
    const win = fakeWindow({ initData: '' });
    expect(isTelegramMiniApp(win)).toBe(false);
  });

  it('returns initData and detects the Mini App when present', () => {
    const win = fakeWindow({ initData: 'auth_date=1&hash=x' });
    expect(getTelegramInitData(win)).toBe('auth_date=1&hash=x');
    expect(isTelegramMiniApp(win)).toBe(true);
  });

  it('calls ready() and expand() only when the SDK is present', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    initTelegramViewport(fakeWindow({ initData: 'x', ready, expand }));
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();

    expect(() => initTelegramViewport(fakeWindow())).not.toThrow();
  });
});
