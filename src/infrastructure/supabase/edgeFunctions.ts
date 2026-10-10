import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError, type AppErrorCode } from '@/application/errors';
import type { AppSupabaseClient } from './client';

export const POSTGRES_UNIQUE_VIOLATION = '23505';

/** Error codes the Edge Functions return that the app can explain to the user. */
const EXPLAINABLE_CODES = [
  'FORBIDDEN',
  'USERNAME_TAKEN',
  'INVALID_USERNAME',
  'PASSWORD_TOO_SHORT',
  'INVALID_BIRTH_YEAR',
  'STUDENT_NOT_FOUND',
  'STUDENT_LIMIT',
  'TEACHER_BLOCKED',
  'TEACHER_NOT_FOUND',
  'TARIFF_NOT_FOUND',
  'INVALID_DATE',
  'INVALID_AMOUNT',
] as const satisfies readonly AppErrorCode[];

type ExplainableCode = (typeof EXPLAINABLE_CODES)[number];

function isExplainableCode(value: unknown): value is ExplainableCode {
  return typeof value === 'string' && (EXPLAINABLE_CODES as readonly string[]).includes(value);
}

export type FunctionName = 'manage-teachers' | 'manage-students' | 'telegram-link' | 'telegram-unlink';

/** Calls an Edge Function; known failure codes become `AppError`s. */
export async function invokeFunction<T = unknown>(
  client: AppSupabaseClient,
  name: FunctionName,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (error) throw await toFunctionError(error);
  return data as T;
}

async function toFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    const payload: unknown = await error.context.json().catch(() => null);
    const code =
      typeof payload === 'object' && payload !== null ? (payload as { error?: unknown }).error : null;
    if (isExplainableCode(code)) return new AppError(code);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * A database rule that refused a write by raising one of these codes by name, as the platform
 * migration's functions and triggers do. Anything else stays the original error.
 */
export function raisedAppError(error: { message?: string }, codes: readonly AppErrorCode[]): Error {
  const code = codes.find((candidate) => error.message?.includes(candidate));
  return code
    ? new AppError(code)
    : error instanceof Error
      ? error
      : new Error(error.message ?? String(error));
}
