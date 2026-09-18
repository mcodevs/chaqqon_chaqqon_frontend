import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bindTelegramBackButton,
  getTelegramInitData,
  getTelegramUser,
  initTelegramApp,
  isTelegramWebApp,
  triggerHaptic,
} from './telegramWebApp';

describe('telegramWebApp', () => {
  beforeEach(() => {
    delete (globalThis as { Telegram?: unknown }).Telegram;
  });

  afterEach(() => {
    delete (globalThis as { Telegram?: unknown }).Telegram;
    vi.restoreAllMocks();
  });

  it('returns false and null when outside Telegram', () => {
    expect(isTelegramWebApp()).toBe(false);
    expect(getTelegramUser()).toBeNull();
    expect(getTelegramInitData()).toBeNull();
  });

  it('detects Telegram Mini App when initData is present', () => {
    const mockUser = { id: 1234567, first_name: 'Alisher', username: 'alisher' };
    (globalThis as { Telegram?: unknown }).Telegram = {
      WebApp: {
        initData: 'query_id=123&user=mock&hash=abc',
        initDataUnsafe: { user: mockUser },
        version: '7.0',
        platform: 'ios',
        colorScheme: 'light',
        themeParams: {},
        isExpanded: false,
        viewportHeight: 600,
        viewportStableHeight: 600,
        headerColor: '#ffffff',
        backgroundColor: '#ffffff',
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    expect(isTelegramWebApp()).toBe(true);
    expect(getTelegramUser()).toEqual(mockUser);
    expect(getTelegramInitData()).toBe('query_id=123&user=mock&hash=abc');
  });

  it('calls ready and expand on initTelegramApp', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    (globalThis as { Telegram?: unknown }).Telegram = {
      WebApp: {
        initData: 'query_id=123',
        initDataUnsafe: {},
        version: '7.0',
        platform: 'android',
        colorScheme: 'light',
        themeParams: {},
        isExpanded: false,
        viewportHeight: 600,
        viewportStableHeight: 600,
        headerColor: '#ffffff',
        backgroundColor: '#ffffff',
        ready,
        expand,
        close: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    initTelegramApp();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback when available', () => {
    const impactOccurred = vi.fn();
    const notificationOccurred = vi.fn();
    const selectionChanged = vi.fn();

    (globalThis as { Telegram?: unknown }).Telegram = {
      WebApp: {
        initData: 'dummy',
        initDataUnsafe: {},
        version: '7.0',
        platform: 'android',
        colorScheme: 'light',
        themeParams: {},
        isExpanded: true,
        viewportHeight: 600,
        viewportStableHeight: 600,
        headerColor: '#ffffff',
        backgroundColor: '#ffffff',
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
        HapticFeedback: {
          impactOccurred,
          notificationOccurred,
          selectionChanged,
        },
      },
    };

    triggerHaptic('light');
    expect(impactOccurred).toHaveBeenCalledWith('light');

    triggerHaptic('success');
    expect(notificationOccurred).toHaveBeenCalledWith('success');

    triggerHaptic('selection');
    expect(selectionChanged).toHaveBeenCalledTimes(1);
  });

  it('handles back button binding and cleanup', () => {
    const show = vi.fn();
    const hide = vi.fn();
    const onClick = vi.fn();
    const offClick = vi.fn();

    (globalThis as { Telegram?: unknown }).Telegram = {
      WebApp: {
        initData: 'dummy',
        initDataUnsafe: {},
        version: '7.0',
        platform: 'android',
        colorScheme: 'light',
        themeParams: {},
        isExpanded: true,
        viewportHeight: 600,
        viewportStableHeight: 600,
        headerColor: '#ffffff',
        backgroundColor: '#ffffff',
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
        BackButton: {
          isVisible: false,
          show,
          hide,
          onClick,
          offClick,
        },
      },
    };

    const handler = vi.fn();
    const cleanup = bindTelegramBackButton(handler);

    expect(onClick).toHaveBeenCalledWith(handler);
    expect(show).toHaveBeenCalledTimes(1);

    cleanup();
    expect(offClick).toHaveBeenCalledWith(handler);
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
