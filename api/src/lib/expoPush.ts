/**
 * Send Expo push notifications (device tokens from `expo-notifications`).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 99) {
    chunks.push(messages.slice(i, i + 99));
  }

  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk.map((m) => ({
        to: m.to,
        sound: 'default',
        title: m.title,
        body: m.body,
        data: m.data,
        priority: 'high',
      }))),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('[expoPush] send failed', res.status, t);
    }
  }
}
