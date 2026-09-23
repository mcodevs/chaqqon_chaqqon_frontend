import { createAdminClient, getCallerId } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { verifyTelegramInitData } from '../_shared/telegram.ts';

/**
 * Links the signed-in account to the Telegram chat the Mini App runs in, so the
 * account can be reached on this device. Idempotent: several parents' phones may
 * be linked to the same child, and re-opening never duplicates a link.
 */
Deno.serve(
  handle(async (request) => {
    const admin = createAdminClient();
    const callerId = await getCallerId(admin, request);
    if (!callerId) return fail('UNAUTHORIZED', 401);

    const body = await readJson(request);
    const initData = typeof body?.initData === 'string' ? body.initData : '';
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

    const user = await verifyTelegramInitData(initData, botToken);
    if (!user) return fail('BAD_REQUEST', 400);

    const { error } = await admin
      .from('telegram_links')
      .upsert({ profile_id: callerId, chat_id: user.id }, { onConflict: 'profile_id,chat_id' });
    if (error) throw error;

    return json({ ok: true });
  }),
);
