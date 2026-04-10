/**
 * Invite helpers when a circle is focused: QR (web invite URL), share sheet, test accept modal.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Users } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, radius, spacing } from '@care/shared/theme';
import type { Circle } from '@care/shared/types';
import appConfig from '../../config';
import { ApiRequestError } from '@/lib/api';
import { useCirclesStore } from '@/store/circles.store';

function invitePageUrl(secretCode: string): string {
  const base = appConfig.webUrl.replace(/\/$/, '');
  return `${base}/invite/${secretCode}`;
}

type Props = {
  circle: Circle;
};

export function CircleInvitePanel({ circle }: Props) {
  const ensureLinkInvite = useCirclesStore((s) => s.ensureLinkInvite);
  const acceptInvite = useCirclesStore((s) => s.acceptInvite);

  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    ensureLinkInvite(circle.id)
      .then((r) => {
        if (!cancelled) {
          setSecretCode(r.secretCode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not create an invite link. Try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [circle.id, ensureLinkInvite]);

  const pageUrl = useMemo(
    () => (secretCode ? invitePageUrl(secretCode) : ''),
    [secretCode]
  );

  const onShare = useCallback(async () => {
    if (!pageUrl) return;
    const message = `Join ${circle.name} on Care — ${pageUrl}`;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: pageUrl }
          : { message, title: `Invite to ${circle.name}` }
      );
    } catch {
      // user dismissed
    }
  }, [circle.name, pageUrl]);

  const onPreviewAccept = useCallback(async () => {
    if (!secretCode) return;
    setAccepting(true);
    try {
      await acceptInvite(secretCode);
      setPreviewOpen(false);
      Alert.alert('Invite accepted', 'If you were new to this circle, you are in now.');
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : 'Something went wrong.';
      Alert.alert('Could not accept', msg);
    } finally {
      setAccepting(false);
    }
  }, [acceptInvite, secretCode]);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Invite people</Text>
        <Text style={styles.cardHint}>
          Scan the code or share the link. Others open a page that launches Care or TestFlight.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : secretCode ? (
          <View style={styles.qrBlock}>
            <View style={styles.qrWrap}>
              <QRCode value={pageUrl} size={168} color={colors.textPrimary} backgroundColor={colors.surface} />
            </View>
            <Text style={styles.url} numberOfLines={2} selectable>
              {pageUrl}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.primaryBtn}
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share invite link"
              >
                <Text style={styles.primaryBtnText}>Share link</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setPreviewOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Preview invite accept screen"
              >
                <Text style={styles.secondaryBtnText}>Preview accept screen</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={previewOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <SafeAreaView style={styles.modalOuter} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>You’re invited</Text>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View style={[styles.avatar, { backgroundColor: circle.color }]}>
              <Users size={40} color={colors.textInverse} weight="duotone" />
            </View>
            <Text style={styles.modalCircleName}>{circle.name}</Text>
            {circle.description ? (
              <Text style={styles.modalDesc}>{circle.description}</Text>
            ) : (
              <Text style={styles.modalDescMuted}>Caring for {circle.heartName}</Text>
            )}
            <Text style={styles.modalTestNote}>
              Test flow: Accept uses the invite link you generated for this circle (same as opening
              the link from Messages or email).
            </Text>
            <Pressable
              style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
              onPress={onPreviewAccept}
              disabled={accepting}
              accessibilityRole="button"
            >
              {accepting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.acceptBtnText}>Accept</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 19,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  cardHint: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    lineHeight: 17,
  },
  loader: { marginVertical: spacing[4] },
  errorText: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.warning,
  },
  qrBlock: { alignItems: 'center', gap: spacing[3] },
  qrWrap: {
    padding: spacing[3],
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  url: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  actions: { width: '100%', gap: spacing[2], marginTop: spacing[1] },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 19,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  secondaryBtnText: {
    fontSize: 18,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
  },

  modalOuter: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  modalCircleName: {
    fontSize: 28,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 19,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalDescMuted: {
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalTestNote: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: spacing[2],
  },
  acceptBtn: {
    marginTop: 'auto',
    marginBottom: spacing[8],
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptBtnText: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },
});
