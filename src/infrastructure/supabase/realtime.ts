import type { ChangeListener, Unsubscribe } from '@/application/ports';
import { createChangeNotifier } from '../shared/changeNotifier';
import type { AppSupabaseClient } from './client';

/** Tables published to Realtime by the migrations. */
export type RealtimeTable =
  | 'rooms'
  | 'room_progress'
  | 'practice_results'
  | 'student_payments'
  | 'market_items'
  | 'market_orders'
  | 'written_homework';

/** Calls `listener` whenever rows this user may see (per RLS) change in the given tables. */
export function subscribeToTables(
  client: AppSupabaseClient,
  tables: readonly RealtimeTable[],
  listener: ChangeListener,
): Unsubscribe {
  const channel = client.channel(`db-changes:${tables.join(',')}:${crypto.randomUUID()}`);
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => listener());
  }
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/** Own writes refresh at once; Realtime brings in everyone else's. */
export function liveSubscription(client: AppSupabaseClient, tables: readonly RealtimeTable[]) {
  const changes = createChangeNotifier();

  const subscribe = (listener: ChangeListener): Unsubscribe => {
    const stopLocal = changes.subscribe(listener);
    const stopRemote = subscribeToTables(client, tables, listener);
    return () => {
      stopLocal();
      stopRemote();
    };
  };

  return { notify: changes.notify, subscribe };
}
