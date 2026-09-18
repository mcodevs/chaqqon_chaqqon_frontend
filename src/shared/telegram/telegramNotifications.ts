/**
 * Client helpers to trigger Telegram notifications via the telegram-bot Edge Function.
 * Calls are asynchronous and fail silently so UI flows are never blocked.
 */

export interface MarketNotificationPayload {
  studentId: string;
  itemTitle: string;
  costStars: number;
  status: 'delivered' | 'cancelled';
}

export interface PaymentNotificationPayload {
  studentId: string;
  paidUntil: string;
}

export async function sendTelegramNotification(action: string, data: Record<string, unknown>): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  try {
    await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
  } catch (err) {
    console.warn(`Failed to send telegram notification (${action}):`, err);
  }
}

export function notifyCompetitionStarted(participantIds: string[]): void {
  if (participantIds.length === 0) return;
  void sendTelegramNotification('send-competition-notification', { participantIds });
}

export function notifyMarketOrderStatus(payload: MarketNotificationPayload): void {
  void sendTelegramNotification('send-market-notification', payload as unknown as Record<string, unknown>);
}

export function notifyPaymentRecorded(payload: PaymentNotificationPayload): void {
  void sendTelegramNotification('send-payment-notification', payload as unknown as Record<string, unknown>);
}
