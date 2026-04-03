const POSTMARK_API = 'https://api.postmarkapp.com/email';

export type PostmarkResult = { ok: true } | { ok: false; error: string };

/**
 * Send transactional email via Postmark. Requires `POSTMARK_TOKEN` in env.
 */
export async function sendPostmarkEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<PostmarkResult> {
  const token = process.env.POSTMARK_TOKEN;
  if (!token) {
    console.warn('[postmark] POSTMARK_TOKEN not set; skipping email');
    return { ok: false, error: 'POSTMARK_TOKEN not configured' };
  }

  const from = process.env.POSTMARK_FROM_EMAIL ?? 'Care <noreply@example.com>';

  const res = await fetch(POSTMARK_API, {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      From: from,
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody ?? stripHtml(params.htmlBody),
      MessageStream: 'outbound',
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: t || res.statusText };
  }
  return { ok: true };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
