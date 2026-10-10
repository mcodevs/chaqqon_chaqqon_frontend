import type { TelegramGateway } from '@/application/ports';
import { getTelegramInitData } from '../telegram/telegramWebApp';
import type { AppSupabaseClient } from './client';
import { invokeFunction } from './edgeFunctions';

/**
 * Links/unlinks the current account to this device's Telegram chat via Edge
 * Functions that verify the signed `initData`. Outside Telegram every call is a
 * no-op, so a normal browser session is completely unaffected.
 */
export function createSupabaseTelegramGateway(client: AppSupabaseClient, win: Window): TelegramGateway {
  return {
    isAvailable: () => getTelegramInitData(win) !== null,

    async link() {
      const initData = getTelegramInitData(win);
      if (!initData) return;
      await invokeFunction(client, 'telegram-link', { initData });
    },

    async unlink() {
      const initData = getTelegramInitData(win);
      if (!initData) return;
      await invokeFunction(client, 'telegram-unlink', { initData });
    },

    async sendDocument(file, filename, caption) {
      const initData = getTelegramInitData(win);
      if (!initData) return;
      let binary = '';
      for (let i = 0; i < file.length; i += 0x8000) {
        binary += String.fromCharCode(...file.subarray(i, i + 0x8000));
      }
      await invokeFunction(client, 'telegram-send-document', {
        initData,
        filename,
        caption,
        fileBase64: btoa(binary),
      });
    },
  };
}
