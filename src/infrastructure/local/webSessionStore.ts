import type { Session } from '@/application/session';

export interface SessionStore {
  load(): Session | null;
  save(session: Session | null): void;
}

const KEY = 'chaqqon:session';

/** Keeps the session for the lifetime of the browser tab. */
export function createWebSessionStore(storage: Storage): SessionStore {
  return {
    load() {
      try {
        const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? 'null');
        return isSession(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(session) {
      if (session) storage.setItem(KEY, JSON.stringify(session));
      else storage.removeItem(KEY);
    },
  };
}

export function createMemorySessionStore(): SessionStore {
  let session: Session | null = null;
  return {
    load: () => session,
    save: (next) => {
      session = next;
    },
  };
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.role === 'teacher') return true;
  return candidate.role === 'student' && typeof candidate.studentId === 'string';
}
