import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { confirmAction } from '@/lib/confirm';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { Avatar } from '@/components/Avatar';
import { useCategories } from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import { useMyProvider } from '@/lib/provider';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function ProfileScreen() {
  const { profile, session, signOut, deleteAccount } = useAuth();
  const router = useRouter();
  const { groups } = useCategories();
  const { provider, reload } = useMyProvider(session?.user.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryNames = (provider?.categoryIds ?? [])
    .map((id) => {
      for (const g of groups) {
        if (g.parent.id === id) return g.parent.name_ka;
        const c = g.children.find((x) => x.id === id);
        if (c) return c.name_ka;
      }
      return null;
    })
    .filter(Boolean)
    .join(', ');

  async function toggleVisible(value: boolean) {
    if (!session) return;
    await supabase.from('providers').update({ visible: value }).eq('user_id', session.user.id);
    reload();
  }

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
      <ScrollView showsVerticalScrollIndicator={false}>
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

      {provider ? (
        <View style={[styles.card, { marginTop: 16, gap: 14 }]}>
          <View style={styles.specRow}>
            <Avatar path={provider.photo_path} size={56} />
            <View style={styles.specText}>
              <AppText weight="bold">{ka.specialist.mine}</AppText>
              <AppText muted style={styles.small} numberOfLines={2}>
                {categoryNames}
              </AppText>
            </View>
          </View>
          <View style={styles.specRow}>
            <AppText style={styles.specText}>{ka.specialist.visibleLabel}</AppText>
            <Switch
              value={provider.visible}
              onValueChange={toggleVisible}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          <AppButton variant="secondary" title={ka.specialist.edit} onPress={() => router.push('/become-specialist')} />
        </View>
      ) : (
        <Pressable style={styles.cta} onPress={() => router.push('/become-specialist')} accessibilityRole="button">
          <View style={styles.specText}>
            <AppText weight="bold">{ka.specialist.cta}</AppText>
            <AppText muted style={styles.small}>
              {ka.specialist.ctaHint}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </Pressable>
      )}

      <View style={styles.actions}>
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <AppButton variant="secondary" title={ka.profile.signOut} onPress={signOut} disabled={busy} />
        <AppButton variant="danger" title={ka.profile.deleteAccount} onPress={onDelete} loading={busy} />
      </View>
      </ScrollView>
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
  small: { fontSize: 13, lineHeight: 18 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  specText: { flex: 1, gap: 2 },
  cta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
