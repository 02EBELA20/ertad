import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { UserActionsSheet } from '@/components/UserActionsSheet';
import { useCategories } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { startConversation } from '@/lib/chat';
import { confirmAction } from '@/lib/confirm';
import { PostDetail, closePost, daysLeft, describeCategory, fetchPost, pausePost, resumePost, timeAgo } from '@/lib/posts';
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

export default function PostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { groups } = useCategories();
  const me = session?.user.id ?? '';

  const [post, setPost] = useState<PostDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = id ? await fetchPost(id) : null;
        if (!alive) return;
        setPost(p);
        setState(p ? 'ready' : 'missing');
      } catch {
        if (alive) setState('missing');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/board');
  }

  async function openChat() {
    if (!post || opening) return;
    setOpening(true);
    setError(null);
    try {
      const cid = await startConversation(post.author_id);
      router.push({ pathname: '/chat/[id]', params: { id: cid } });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setError(msg.includes('daily_limit') ? ka.chat.newLimit : ka.chat.openFailed);
    } finally {
      setOpening(false);
    }
  }

  function onClose() {
    if (!post) return;
    confirmAction({
      title: ka.post.closeTitle,
      message: ka.post.closeMessage,
      confirmText: ka.post.closeConfirm,
      cancelText: ka.cancel,
      onConfirm: async () => {
        try {
          await closePost(post.id);
          setPost({ ...post, status: 'closed' });
        } catch {
          setError(ka.post.failed);
        }
      },
    });
  }

  async function togglePause() {
    if (!post) return;
    try {
      if (post.status === 'open') await pausePost(post.id);
      else await resumePost(post.id);
      const fresh = await fetchPost(post.id);
      if (fresh) setPost(fresh);
    } catch {
      setError(ka.post.failed);
    }
  }

  const isMine = post?.author_id === me;
  const cat = post ? describeCategory(groups, post.category_id) : { label: '', slug: '' };
  const digits = post?.contact_phone?.replace(/\D/g, '') ?? '';
  const left = post ? daysLeft(post.expires_at) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {post && !isMine ? (
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

      {post && !isMine && me ? (
        <UserActionsSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          me={me}
          otherId={post.author_id}
          otherName={post.author_name}
          postId={post.id}
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
      ) : state === 'missing' || !post ? (
        <View style={styles.center}>
          <AppText muted>{ka.post.notFound}</AppText>
          <AppButton variant="secondary" title={ka.categories.back} onPress={goBack} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.catRow}>
            <View style={styles.catIcon}>
              <MaterialCommunityIcons name={categoryIcon(cat.slug)} size={26} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <AppText weight="bold">{cat.label}</AppText>
              <AppText muted style={styles.small}>
                {timeAgo(post.created_at)}
              </AppText>
            </View>
            {post.budget_note ? (
              <View style={styles.budget}>
                <AppText weight="medium" style={styles.budgetText}>
                  {post.budget_note}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText style={styles.body}>{post.body}</AppText>

          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <AppText muted>{post.city}</AppText>
          </View>

          <View style={styles.author}>
            <Avatar path={post.author_photo} size={44} />
            <AppText weight="medium" style={styles.flex}>
              {post.author_name || '—'}
              {isMine ? `  ·  ${ka.post.mine}` : ''}
            </AppText>
          </View>

          {post.status === 'closed' ? (
            <AppText muted>{ka.post.closedLabel}</AppText>
          ) : post.status === 'paused' ? (
            <AppText muted>{ka.post.pausedLabel}</AppText>
          ) : (
            <AppText muted style={styles.small}>
              {ka.post.daysLeft(left)}
            </AppText>
          )}

          {!isMine && post.status === 'open' ? (
            <View style={styles.actions}>
              {post.contact_phone ? (
                <>
                  <ActionButton icon="phone" label={ka.provider.call} onPress={() => Linking.openURL(`tel:+${digits}`)} />
                  <ActionButton
                    icon="whatsapp"
                    label={ka.provider.whatsapp}
                    onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
                  />
                </>
              ) : null}
              <ActionButton icon="chat-outline" label={ka.provider.chat} onPress={openChat} disabled={opening} />
            </View>
          ) : null}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          {isMine && post.status !== 'closed' ? (
            <>
              <AppButton
                variant="secondary"
                title={post.status === 'open' ? ka.post.pause : ka.post.resume}
                onPress={togglePause}
              />
              {post.status === 'open' ? (
                <AppText muted style={styles.small}>
                  {ka.post.pauseHint}
                </AppText>
              ) : null}
              <AppButton variant="ghost" title={ka.post.close} onPress={onClose} />
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  content: { padding: 20, paddingTop: 4, gap: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  small: { fontSize: 13, lineHeight: 18 },
  budget: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  budgetText: { color: colors.accent, fontSize: 13, lineHeight: 18 },
  body: { fontSize: 18, lineHeight: 28 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
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
  error: { color: colors.danger },
});
