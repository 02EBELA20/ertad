import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { confirmAction } from '@/lib/confirm';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function ProfileScreen() {
  const { profile, session, signOut, deleteAccount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    confirmAction({
      title: ka.profile.deleteTitle,
      message: ka.profile.deleteMessage,
      confirmText: ka.profile.deleteConfirm,
      cancelText: ka.cancel,
      onConfirm: async () => {
        setBusy(true);
        setError(null);
        const err = await deleteAccount();
        setBusy(false);
        if (err) setError(`${ka.profile.deleteFailed}: ${err}`);
      },
    });
  }

  return (
    <Screen>
      <AppText weight="bold" style={styles.title}>
        {ka.tabs.profile}
      </AppText>

      <View style={styles.card}>
        <AppText weight="bold" style={styles.name}>
          {profile?.display_name}
        </AppText>
        <AppText muted>
          {ka.profile.city}: {profile?.city}
        </AppText>
        <AppText muted>
          {ka.profile.phone}: {session?.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : ''}
        </AppText>
      </View>

      <View style={styles.actions}>
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <AppButton variant="secondary" title={ka.profile.signOut} onPress={signOut} disabled={busy} />
        <AppButton variant="danger" title={ka.profile.deleteAccount} onPress={onDelete} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 38, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  name: { fontSize: 22, lineHeight: 32 },
  actions: { marginTop: 24, gap: 12 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
