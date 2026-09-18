import { createAdminClient } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { authEmailFor } from '../_shared/identity.ts';
import { validateTelegramInitData } from '../_shared/telegramValidation.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8857626762:AAHUfEua_Us0zh0Pzxh1otjqoNDjW_3ZKl0';

Deno.serve(
  handle(async (request) => {
    const body = await readJson(request);
    const initDataRaw = typeof body?.initData === 'string' ? body.initData : null;

    if (!initDataRaw) {
      return fail('BAD_REQUEST', 400);
    }

    const validation = await validateTelegramInitData(initDataRaw, BOT_TOKEN);
    if (!validation.valid || !validation.user) {
      return json({ error: validation.error || 'INVALID_INIT_DATA' }, 401);
    }

    const telegramUser = validation.user;
    const admin = createAdminClient();

    // Check if this Telegram ID is already linked to a profile
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, role, username, first_name')
      .eq('telegram_user_id', telegramUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile by telegram_user_id:', error);
      return fail('INTERNAL', 500);
    }

    if (!profile) {
      // Not yet linked. Return Telegram user info so client can prompt for one-time login & link
      return json({
        linked: false,
        telegramUser: {
          id: telegramUser.id,
          username: telegramUser.username ?? null,
          firstName: telegramUser.first_name,
        },
      });
    }

    // Profile found! Generate a magiclink token so client can authenticate cleanly
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authEmailFor(profile.username),
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate auth token:', linkError);
      return fail('INTERNAL', 500);
    }

    return json({
      linked: true,
      tokenHash: linkData.properties.hashed_token,
      role: profile.role,
      username: profile.username,
      userId: profile.id,
    });
  }),
);
