import type { KeyChangeListener, KeyValueStore } from './keyValueStore';

interface WebStorageStoreOptions {
  storage: Storage;
  namespace: string;
  /** Window to listen on for changes made in other tabs. */
  eventTarget?: Window;
}

/**
 * JSON key-value store on top of localStorage. Changes are broadcast within
 * the tab directly and across tabs via the native `storage` event.
 */
export function createWebStorageStore({
  storage,
  namespace,
  eventTarget,
}: WebStorageStoreOptions): KeyValueStore {
  const prefix = `${namespace}:`;
  const listeners = new Set<KeyChangeListener>();
  const notify = (key: string | null) => listeners.forEach((listener) => listener(key));

  eventTarget?.addEventListener('storage', (event) => {
    if (event.storageArea !== storage) return;
    if (event.key === null) notify(null);
    else if (event.key.startsWith(prefix)) notify(event.key.slice(prefix.length));
  });

  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = storage.getItem(prefix + key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      storage.setItem(prefix + key, JSON.stringify(value));
      notify(key);
    },

    async remove(key: string): Promise<void> {
      storage.removeItem(prefix + key);
      notify(key);
    },

    async keys(keyPrefix: string): Promise<string[]> {
      const fullPrefix = prefix + keyPrefix;
      const result: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(fullPrefix)) result.push(key.slice(prefix.length));
      }
      return result;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
