import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { View as MotiView } from 'moti/build/components/view';
import { GoogleLogo, AppleLogo, Envelope, Lock, ArrowRight } from 'phosphor-react-native';
import { Button, Input, Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { signInWithApple } from '@/lib/auth';
import config, { APP_URL_SCHEME } from '../../config';

/** Google: API runs OAuth + PKCE; app completes via handoff JWT (`POST /auth/google/handoff`). */
function GoogleOAuthButton({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const redirectUrl = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: APP_URL_SCHEME,
        path: 'oauth/google',
      }),
    []
  );

  const { loginWithGoogleHandoff } = useAuthStore();

  const disabled = Platform.OS === 'web' || !config.apiUrl;

  return (
    <Pressable
      style={styles.socialButton}
      disabled={disabled}
      onPress={() => {
        onError('');
        void (async () => {
          try {
            const result = await WebBrowser.openAuthSessionAsync(
              `${config.apiUrl}/auth/google`,
              redirectUrl
            );
            if (result.type === 'cancel' || result.type === 'dismiss') {
              return;
            }
            if (result.type !== 'success' || !('url' in result) || !result.url) {
              onError('Google sign-in did not complete');
              return;
            }
            const parsed = Linking.parse(result.url);
            const oauthErr = parsed.queryParams?.error;
            if (oauthErr !== undefined && oauthErr !== null) {
              const msg = Array.isArray(oauthErr) ? oauthErr[0] : String(oauthErr);
              onError(msg || 'Google authorization failed');
              return;
            }
            const handoffRaw = parsed.queryParams?.handoff;
            const handoff = Array.isArray(handoffRaw) ? handoffRaw[0] : handoffRaw;
            if (!handoff || typeof handoff !== 'string') {
              onError('Google sign-in did not return a session');
              return;
            }
            await loginWithGoogleHandoff(handoff);
            router.replace('/(tabs)');
          } catch (e: unknown) {
            onError(e instanceof Error ? e.message : 'Something went wrong');
          }
        })();
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

  const { loginWithEmail, register, isLoading } = useAuthStore();
  const googleConfigured = Platform.OS !== 'web' && !!config.apiUrl;

  async function handleEmailSubmit() {
    setError(null);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await register(email, password, name);
      }
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  function setGoogleError(message: string) {
    setError(message || null);
  }

  async function handleApple() {
    setError(null);
    try {
      await signInWithApple();
      setError('Apple sign-in is not available from the API yet. Use Google or email.');
    } catch (err: unknown) {
      if ((err as { code?: string })?.code !== 'ERR_CANCELED') {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    }
  }

  return (
    <ScrollView
      testID="login-screen"
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
        {googleConfigured ? (
          <GoogleOAuthButton onError={setGoogleError} />
        ) : (
          <Pressable
            style={styles.socialButton}
            onPress={() =>
              setError(
                Platform.OS === 'web'
                  ? 'Google sign-in from the app uses the native build.'
                  : 'Google sign-in requires the API URL (EXPO_PUBLIC_API_URL).'
              )
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
          testID="login-email-input"
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
          testID="login-password-input"
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
          testID="login-submit"
          label={mode === 'login' ? 'Sign in' : 'Create account'}
          onPress={handleEmailSubmit}
          loading={isLoading}
          icon={<ArrowRight size={16} weight="bold" color={colors.textInverse} />}
          iconPosition="right"
        />

        <Pressable
          testID="login-mode-toggle"
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
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
