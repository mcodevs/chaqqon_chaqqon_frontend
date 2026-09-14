import type { KeyChangeListener, KeyValueStore } from './keyValueStore';

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  const listeners = new Set<KeyChangeListener>();
  const notify = (key: string) => listeners.forEach((listener) => listener(key));

  return {
    async get<T>(key: string) {
      const raw = data.get(key);
      return raw === undefined ? null : (JSON.parse(raw) as T);
    },
    async set(key, value) {
      data.set(key, JSON.stringify(value));
      notify(key);
    },
    async remove(key) {
      data.delete(key);
      notify(key);
    },
    async keys(prefix) {
      return [...data.keys()].filter((key) => key.startsWith(prefix));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
