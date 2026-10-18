import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { useCategories } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { fetchProvider, ProviderDetail } from '@/lib/provider';
import { startConversation } from '@/lib/chat';
import { Stars } from '@/components/Stars';
import { ReviewItem, ReviewSummary, fetchReviewSummary, fetchReviews } from '@/lib/reviews';
import { UserActionsSheet } from '@/components/UserActionsSheet';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.action, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.accent} />
      <AppText weight="medium" style={styles.actionText}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ProviderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups } = useCategories();
  const { session } = useAuth();
  const [opening, setOpening] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = id ? await fetchProvider(id) : null;
        if (!alive) return;
        setProvider(p);
        setState(p ? 'ready' : 'missing');
      } catch {
        if (alive) setState('missing');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchReviewSummary(id)
      .then((r) => alive && setSummary(r))
      .catch(() => {});
    fetchReviews(id)
      .then((r) => alive && setReviews(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  const labels = useMemo(() => {
    const out: { id: string; label: string; slug: string }[] = [];
    for (const cid of provider?.categoryIds ?? []) {
      for (const g of groups) {
        if (g.parent.id === cid) out.push({ id: cid, label: g.parent.name_ka, slug: g.parent.slug });
        const c = g.children.find((x) => x.id === cid);
        if (c) out.push({ id: cid, label: `${g.parent.name_ka} · ${c.name_ka}`, slug: g.parent.slug });
      }
    }
    return out;
  }, [provider, groups]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/professionals');
  }

  async function openChat() {
    if (!provider || opening) return;
    setOpening(true);
    setChatError(null);
    try {
      const cid = await startConversation(provider.user_id);
      router.push({ pathname: '/chat/[id]', params: { id: cid } });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setChatError(msg.includes('daily_limit') ? ka.chat.newLimit : ka.chat.openFailed);
    } finally {
      setOpening(false);
    }
  }

  const isMe = provider?.user_id === session?.user.id;
  const digits = provider?.contact_phone.replace(/\D/g, '') ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {provider && !isMe ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={ka.safety.report}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {provider && !isMe && session ? (
        <UserActionsSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          me={session.user.id}
          otherId={provider.user_id}
          otherName={provider.display_name}
          isBlocked={false}
          onBlockChange={(b) => {
            if (b) goBack();
          }}
        />
      ) : null}

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : state === 'missing' || !provider ? (
        <View style={styles.center}>
          <AppText muted>{ka.provider.notFound}</AppText>
          <AppButton variant="secondary" title={ka.categories.back} onPress={goBack} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Avatar path={provider.photo_path} size={112} />
            <AppText weight="bold" style={styles.name}>
              {provider.display_name || '—'}
            </AppText>
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <AppText muted>{provider.city}</AppText>
            </View>
            {summary ? (
              <View style={styles.locRow}>
                <Stars value={summary.avg} size={16} />
                <AppText muted>
                  {summary.avg.toFixed(1)} · {ka.review.count(summary.cnt)}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <ActionButton icon="phone" label={ka.provider.call} onPress={() => Linking.openURL(`tel:+${digits}`)} />
            <ActionButton
              icon="whatsapp"
              label={ka.provider.whatsapp}
              onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
            />
            <ActionButton
              icon="chat-outline"
              label={ka.provider.chat}
              onPress={openChat}
              disabled={isMe || opening}
            />
          </View>
          {chatError ? <AppText style={styles.chatError}>{chatError}</AppText> : null}

          <View style={styles.chips}>
            {labels.map((l) => (
              <View key={l.id} style={styles.chip}>
                <MaterialCommunityIcons name={categoryIcon(l.slug)} size={16} color={colors.accent} />
                <AppText style={styles.chipText}>{l.label}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <AppText weight="bold">{ka.provider.about}</AppText>
            <AppText>{provider.bio}</AppText>
          </View>

          {provider.price_note ? (
            <View style={styles.section}>
              <AppText weight="bold">{ka.provider.price}</AppText>
              <AppText>{provider.price_note}</AppText>
            </View>
          ) : null}

          <View style={styles.section}>
            <AppText weight="bold">{ka.review.section}</AppText>
            {reviews.length === 0 ? (
              <AppText muted>{ka.review.none}</AppText>
            ) : (
              reviews.map((r, i) => (
                <View key={i} style={styles.review}>
                  <View style={styles.reviewTop}>
                    <AppText weight="medium" style={styles.reviewName}>
                      {r.reviewer_name || '—'}
                    </AppText>
                    <Stars value={r.rating} size={13} />
                  </View>
                  {r.comment ? <AppText style={styles.reviewText}>{r.comment}</AppText> : null}
                </View>
              ))
            )}
          </View>

          {provider.license_number ? (
            <View style={styles.section}>
              <AppText weight="bold">{ka.provider.license}</AppText>
              <AppText>{provider.license_number}</AppText>
              <AppText muted style={styles.small}>
                {ka.provider.licenseNote}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  content: { padding: 20, paddingTop: 0, gap: 24 },
  hero: { alignItems: 'center', gap: 8 },
  name: { fontSize: 26, lineHeight: 36, textAlign: 'center' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, lineHeight: 20 },
  section: { gap: 6 },
  review: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewName: { flex: 1, fontSize: 14, lineHeight: 20 },
  reviewText: { fontSize: 14, lineHeight: 22 },
  chatError: { color: colors.danger, textAlign: 'center' },
  small: { fontSize: 13, lineHeight: 18 },
});
