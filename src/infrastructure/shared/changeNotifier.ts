import type { ChangeListener, Unsubscribe } from '@/application/ports';

/** In-process change broadcast, for changes made by this client. */
export function createChangeNotifier() {
  const listeners = new Set<ChangeListener>();

  return {
    notify: () => listeners.forEach((listener) => listener()),
    subscribe(listener: ChangeListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
