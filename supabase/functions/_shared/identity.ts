/*
 * Contract shared by the web client and the Edge Functions: both must derive the
 * Supabase Auth identity of a username in exactly the same way.
 * Keep this file free of Deno and browser APIs.
 */

/** Synthetic e-mail domain (reserved for examples); no mail is ever sent to these addresses. */
export const AUTH_EMAIL_DOMAIN = 'chaqqon.example.com';

export function authEmailFor(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

/**
 * Supabase Auth requires at least 6 characters, while children sign in with 4-digit PINs.
 * The fixed prefix only satisfies that rule; it adds no secrecy.
 */
export function authPasswordFor(password: string): string {
  return `chaqqon:${password}`;
}
