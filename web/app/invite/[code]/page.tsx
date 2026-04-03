import { notFound } from 'next/navigation';

type InviteData = {
  circleName: string;
  heartName: string;
  inviterName: string;
  expiresAt: string | null;
};

async function fetchInvite(code: string): Promise<InviteData | null> {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return null;
  }
  const res = await fetch(`${base.replace(/\/$/, '')}/public/invites/${code}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404 || res.status === 410) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as { data: InviteData };
  return json.data;
}

const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME ?? 'fformcare';
const IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? 'https://apps.apple.com/app/id0000000000';
const ANDROID_PLAY_URL =
  process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ??
  'https://play.google.com/store/apps/details?id=com.fform.care';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await fetchInvite(code);
  if (!data) {
    notFound();
  }

  const deepLink = `${APP_SCHEME}://invite/${code}`;
  const play = `${ANDROID_PLAY_URL}`;
  const ios = `${IOS_APP_STORE_URL}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        padding: '48px 24px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1a1a1a',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>You’re invited</h1>
        <p style={{ fontSize: 16, color: '#4a4a4a', marginBottom: 24 }}>
          <strong>{data.inviterName}</strong> invited you to care for{' '}
          <strong>{data.heartName}</strong> in the circle <strong>{data.circleName}</strong> on Care.
        </p>

        <a
          href={deepLink}
          style={{
            display: 'block',
            textAlign: 'center',
            background: '#F59E0B',
            color: '#fff',
            fontWeight: 600,
            padding: '14px 20px',
            borderRadius: 999,
            textDecoration: 'none',
            marginBottom: 16,
          }}
        >
          Open in Care app
        </a>

        <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          If you don’t have the app yet, install it and sign in — then open this page again or paste
          your invite from email.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={ios}
            style={{
              flex: '1 1 140px',
              textAlign: 'center',
              border: '1px solid #ccc',
              borderRadius: 12,
              padding: '12px 16px',
              textDecoration: 'none',
              color: '#1a1a1a',
              background: '#fff',
            }}
          >
            App Store
          </a>
          <a
            href={play}
            style={{
              flex: '1 1 140px',
              textAlign: 'center',
              border: '1px solid #ccc',
              borderRadius: 12,
              padding: '12px 16px',
              textDecoration: 'none',
              color: '#1a1a1a',
              background: '#fff',
            }}
          >
            Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
