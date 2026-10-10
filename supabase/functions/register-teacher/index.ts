import { fail, handle } from '../_shared/http.ts';

/**
 * Retired. The app had one teacher, who created their own account here on first launch. Teachers now
 * apply from the landing page and the superadmin creates their account (see manage-teachers), so
 * this answers every call with a refusal. It can be deleted from the Supabase dashboard.
 */
Deno.serve(handle(async () => fail('FORBIDDEN', 410)));
