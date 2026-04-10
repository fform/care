import { notFound } from 'next/navigation';

type InviteData = {
  circleName: string;
  circleDescription: string | null;
  heartName: string;
  inviterName: string;
  expiresAt: string | null;
};

/** Same default as `app/config.ts` production `apiUrl` — invite page SSR must reach the API that stored the invite. */
const DEFAULT_CARE_API_ORIGIN = 'https://care-api.up.railway.app';

async function fetchInvite(code: string): Promise<InviteData | null> {
  const base =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_CARE_API_ORIGIN;
  const res = await fetch(`${base.replace(/\/$/, '')}/public/invites/${encodeURIComponent(code)}`, {
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
/** Public beta until App Store listing exists */
const IOS_INSTALL_URL =
  process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL ?? 'https://testflight.apple.com/join/w8SjNkv4';
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
  const iosInstall = `${IOS_INSTALL_URL}`;

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
        <p
          style={{
            fontSize: 16,
            color: '#4a4a4a',
            marginBottom: data.circleDescription ? 12 : 24,
          }}
        >
          <strong>{data.inviterName}</strong> invited you to care for{' '}
          <strong>{data.heartName}</strong> in the circle <strong>{data.circleName}</strong> on Care.
        </p>
        {data.circleDescription ? (
          <p style={{ fontSize: 15, color: '#4a4a4a', marginBottom: 24, lineHeight: 1.45 }}>
            {data.circleDescription}
          </p>
        ) : null}

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
          If Care isn’t installed, use TestFlight (iOS) or Play Store (Android), sign in, then open this
          link again — or tap Open in Care if the app is already installed.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={iosInstall}
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
            Get Care (TestFlight)
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
