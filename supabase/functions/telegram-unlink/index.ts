import { createAdminClient, getCallerId } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { verifyTelegramInitData } from '../_shared/telegram.ts';

/**
 * Removes the link between the signed-in account and this device's Telegram chat,
 * called on logout. Only this device is unlinked; other linked phones keep working.
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
      .delete()
      .eq('profile_id', callerId)
      .eq('chat_id', user.id);
    if (error) throw error;

    return json({ ok: true });
  }),
);
