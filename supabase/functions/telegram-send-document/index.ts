import { createAdminClient, getCallerId, roleOf } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { verifyTelegramInitData } from '../_shared/telegram.ts';

/** Telegram accepts bot uploads up to 50 MB; a worksheet packet is a few hundred KB at most. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Sends a file the teacher made in the Mini App (the printed-worksheet PDF) to their own Telegram
 * chat, because the print dialog does not open inside Telegram. The chat is the one the signed
 * initData names, so a caller can only ever send to themselves.
 */
Deno.serve(
  handle(async (request) => {
    const admin = createAdminClient();
    const callerId = await getCallerId(admin, request);
    if (!callerId) return fail('UNAUTHORIZED', 401);
    if ((await roleOf(admin, callerId)) !== 'teacher') return fail('FORBIDDEN', 403);

    const body = await readJson(request);
    const initData = typeof body?.initData === 'string' ? body.initData : '';
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const user = await verifyTelegramInitData(initData, botToken);
    if (!user) return fail('BAD_REQUEST', 400);

    const filename =
      typeof body?.filename === 'string' ? body.filename.replace(/[^\w.-]/g, '_').slice(0, 80) : '';
    const caption = typeof body?.caption === 'string' ? body.caption.slice(0, 900) : '';
    const fileBase64 = typeof body?.fileBase64 === 'string' ? body.fileBase64 : '';
    if (!filename.endsWith('.pdf') || !fileBase64) return fail('BAD_REQUEST', 400);

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
    } catch {
      return fail('BAD_REQUEST', 400);
    }
    if (bytes.length > MAX_BYTES || !new TextDecoder().decode(bytes.subarray(0, 5)).startsWith('%PDF')) {
      return fail('BAD_REQUEST', 400);
    }

    const form = new FormData();
    form.append('chat_id', String(user.id));
    if (caption) form.append('caption', caption);
    form.append('document', new Blob([bytes], { type: 'application/pdf' }), filename);
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) return fail('INTERNAL', 502);

    return json({ ok: true });
  }),
);
