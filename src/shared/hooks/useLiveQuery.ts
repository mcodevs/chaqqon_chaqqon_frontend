import { useEffect, useRef, useState } from 'react';
import type { ChangeListener, Unsubscribe } from '@/application/ports';

export interface LiveQuery<T> {
  load: () => Promise<T>;
  subscribe: (listener: ChangeListener) => Unsubscribe;
}

/**
 * Loads data and reloads it whenever the source reports a change.
 * `query` functions must be referentially stable (memoize them).
 * `data` is undefined until the first load completes.
 */
export function useLiveQuery<T>({ load, subscribe }: LiveQuery<T>): T | undefined {
  const [data, setData] = useState<T>();
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let latestRequest = 0;
    let disposed = false;

    const refresh = () => {
      const request = ++latestRequest;
      loadRef.current().then(
        (value) => {
          if (!disposed && request === latestRequest) {
            setData((prev) => {
              if (Object.is(prev, value)) return prev;
              try {
                if (JSON.stringify(prev) === JSON.stringify(value)) return prev;
              } catch {
                // Ignore serialization errors
              }
              return value;
            });
          }
        },
        (error: unknown) => console.error(error),
      );
    };

    refresh();
    const unsubscribe = subscribe(refresh);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [load, subscribe]);

  return data;
}
