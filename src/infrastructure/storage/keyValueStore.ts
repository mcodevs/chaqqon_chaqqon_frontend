import type { Unsubscribe } from '@/application/ports';

/** `key` is null when the change cannot be attributed to a single key (e.g. storage cleared). */
export type KeyChangeListener = (key: string | null) => void;

/** Async on purpose: a remote backend can replace the browser implementation without touching callers. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
  subscribe(listener: KeyChangeListener): Unsubscribe;
}

export function keyMatches(changedKey: string | null, predicate: (key: string) => boolean): boolean {
  return changedKey === null || predicate(changedKey);
}
