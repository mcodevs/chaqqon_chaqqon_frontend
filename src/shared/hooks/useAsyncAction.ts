import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { toErrorMessage } from '@/shared/i18n/errorMessages';

/**
 * Runs an async use case and exposes its pending state and a user-facing error.
 * `run` resolves to `undefined` when the action failed.
 */
export function useAsyncAction<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  const actionRef = useRef(action);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    actionRef.current = action;
  });

  const run = useCallback(async (...args: Args): Promise<Result | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (caught) {
      setError(toErrorMessage(caught));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error };
}
