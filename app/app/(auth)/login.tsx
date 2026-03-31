import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { GoogleLogo, AppleLogo, Envelope, Lock, ArrowRight } from 'phosphor-react-native';
import { Button, Input, Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { googleOAuthClientId, googleOAuthUrlScheme, signInWithApple } from '@/lib/auth';

/** Google sign-in using `useAuthRequest` + `useAutoDiscovery` (Expo auth guide pattern). */
function GoogleOAuthButton({
  clientId,
  onError,
}: {
  clientId: string;
  onError: (message: string) => void;
}) {
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: googleOAuthUrlScheme(),
        path: 'oauth2redirect',
      }),
    []
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    discovery
  );

  const { loginWithOAuth } = useAuthStore();
  const handledSuccess = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'cancel' || response.type === 'dismiss') return;
    if (response.type === 'error') {
      const err = response.error as { message?: string } | undefined;
      onError(err?.message ?? 'Google sign-in failed');
      return;
    }
    if (response.type !== 'success' || !response.params?.code) return;
    const code = response.params.code as string;
    if (handledSuccess.current === code) return;
    handledSuccess.current = code;

    let cancelled = false;
    (async () => {
      try {
        await loginWithOAuth('google', { code, redirectUri });
        if (!cancelled) router.replace('/(tabs)');
      } catch (e: unknown) {
        if (!cancelled) onError(e instanceof Error ? e.message : 'Something went wrong');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [response, loginWithOAuth, redirectUri, onError]);

  return (
    <Pressable
      style={styles.socialButton}
      disabled={!request}
      onPress={() => {
        onError('');
        void promptAsync();
      }}
    >
      <GoogleLogo size={20} weight="bold" color={colors.textPrimary} />
      <Text variant="label" style={styles.socialLabel}>
        Continue with Google
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { loginWithEmail, loginWithOAuth, register, isLoading } = useAuthStore();
  const googleClientId = useMemo(() => googleOAuthClientId(), []);

  async function handleEmailSubmit() {
    setError(null);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await register(email, password, name);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    }
  }

  function setGoogleError(message: string) {
    setError(message || null);
  }

  async function handleApple() {
    setError(null);
    try {
      const result = await signInWithApple();
      await loginWithOAuth('apple', {
        identityToken: result.identityToken,
        fullName: result.fullName,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      // ERR_CANCELED = user dismissed the sheet — not an error worth showing
      if (err?.code !== 'ERR_CANCELED') {
        setError(err.message ?? 'Something went wrong');
      }
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo / wordmark area */}
      <MotiView
        from={{ opacity: 0, translateY: -16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, delay: 50 }}
        style={styles.header}
      >
        <Text variant="displayMedium" color={colors.textPrimary}>
          Care
        </Text>
        <Text variant="bodyMedium" color={colors.textSecondary} style={styles.tagline}>
          Caregiving, together.
        </Text>
      </MotiView>

      {/* Social buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, delay: 150 }}
        style={styles.socialRow}
      >
        {googleClientId ? (
          <GoogleOAuthButton clientId={googleClientId} onError={setGoogleError} />
        ) : (
          <Pressable
            style={styles.socialButton}
            onPress={() =>
              setError('Google sign-in is not configured (set GOOGLE_IOS_CLIENT_ID in config.ts).')
            }
          >
            <GoogleLogo size={20} weight="bold" color={colors.textPrimary} />
            <Text variant="label" style={styles.socialLabel}>
              Continue with Google
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.socialButton} onPress={handleApple}>
          <AppleLogo size={20} weight="bold" color={colors.textPrimary} />
          <Text variant="label" style={styles.socialLabel}>
            Continue with Apple
          </Text>
        </Pressable>
      </MotiView>

      {/* Divider */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 300, delay: 250 }}
        style={styles.divider}
      >
        <View style={styles.dividerLine} />
        <Text variant="caption" color={colors.textDisabled} style={styles.dividerText}>
          or
        </Text>
        <View style={styles.dividerLine} />
      </MotiView>

      {/* Email / password form */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, delay: 300 }}
        style={styles.form}
      >
        {mode === 'register' && (
          <Input
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Margaret"
            autoCapitalize="words"
            textContentType="name"
          />
        )}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          leftIcon={<Envelope size={18} color={colors.textDisabled} />}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          leftIcon={<Lock size={18} color={colors.textDisabled} />}
        />

        {error && (
          <Text variant="bodySmall" color={colors.concern}>
            {error}
          </Text>
        )}

        <Button
          label={mode === 'login' ? 'Sign in' : 'Create account'}
          onPress={handleEmailSubmit}
          loading={isLoading}
          icon={<ArrowRight size={16} weight="bold" color={colors.textInverse} />}
          iconPosition="right"
        />

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <View style={styles.toggleRow}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Text variant="label" color={colors.primary}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </View>
        </Pressable>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[20],
    paddingBottom: spacing[12],
    gap: spacing[6],
  },
  header: { alignItems: 'center', gap: spacing[1] },
  tagline: { textAlign: 'center' },
  socialRow: { gap: spacing[3] },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  socialLabel: { color: colors.textPrimary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { flexShrink: 0 },
  form: { gap: spacing[4] },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
});
