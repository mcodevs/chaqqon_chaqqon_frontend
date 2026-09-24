import { createAdminClient } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';

/**
 * Internal endpoint: the database triggers call it through pg_net to fan a
 * message out to every Telegram chat linked to a profile. Guarded by a shared
 * secret header instead of a user JWT, since the caller is Postgres, not a user.
 */
Deno.serve(
  handle(async (request) => {
    const expected = Deno.env.get('TELEGRAM_NOTIFY_SECRET') ?? '';
    const provided = request.headers.get('x-notify-secret') ?? '';
    if (!expected || provided !== expected) return fail('UNAUTHORIZED', 401);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    if (!botToken) return fail('INTERNAL', 500);

    const body = await readJson(request);
    const profileId = typeof body?.profile_id === 'string' ? body.profile_id : '';
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!profileId || !text) return fail('BAD_REQUEST', 400);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('telegram_links')
      .select('chat_id')
      .eq('profile_id', profileId);
    if (error) throw error;

    const results = await Promise.all(
      (data ?? []).map((row) =>
        sendTelegramMessage(botToken, Number(row.chat_id), text, { parseMode: 'HTML' }),
      ),
    );

    return json({ ok: true, sent: results.filter(Boolean).length, total: results.length });
  }),
);
