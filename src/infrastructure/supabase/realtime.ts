import type { ChangeListener, Unsubscribe } from '@/application/ports';
import type { AppSupabaseClient } from './client';

/** Tables published to Realtime by the migration. */
export type RealtimeTable = 'rooms' | 'room_progress' | 'practice_results';

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
