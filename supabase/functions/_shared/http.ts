export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Error codes the web client maps onto its own `AppErrorCode`s. */
export type FunctionErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TEACHER_EXISTS'
  | 'USERNAME_TAKEN'
  | 'INVALID_USERNAME'
  | 'PASSWORD_TOO_SHORT'
  | 'INVALID_AGE'
  | 'STUDENT_NOT_FOUND'
  | 'INTERNAL';

export type Body = Record<string, unknown>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function fail(code: FunctionErrorCode, status: number): Response {
  return json({ error: code }, status);
}

export async function readJson(request: Request): Promise<Body | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Body) : null;
  } catch {
    return null;
  }
}

/** Wraps a POST handler with CORS preflight, method checks and a safe 500. */
export function handle(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return fail('BAD_REQUEST', 405);
    try {
      return await handler(request);
    } catch (error) {
      console.error(error);
      return fail('INTERNAL', 500);
    }
  };
}
