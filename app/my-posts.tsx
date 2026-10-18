import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { PostCard } from '@/components/PostCard';
import { useCategories } from '@/lib/categories';
import { confirmAction } from '@/lib/confirm';
import { MyPost, daysLeft, deletePost, describeCategory, fetchMyPosts, timeAgo } from '@/lib/posts';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function MyPostsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { groups } = useCategories();
  const [items, setItems] = useState<MyPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setItems(await fetchMyPosts(session?.user.id ?? ''));
    } catch {
      setFailed(true);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }

  function remove(p: MyPost) {
    confirmAction({
      title: ka.post.removeTitle,
      message: ka.post.removeMessage,
      confirmText: ka.post.remove,
      cancelText: ka.cancel,
      onConfirm: async () => {
        try {
          await deletePost(p.id);
          setItems((cur) => (cur ?? []).filter((x) => x.id !== p.id));
        } catch {
          setFailed(true);
        }
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText weight="bold" style={styles.title}>
          {ka.post.myPosts}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {failed ? (
          <View style={styles.center}>
            <AppText muted>{ka.post.loadFailed}</AppText>
            <AppButton variant="secondary" title={ka.retry} onPress={load} />
          </View>
        ) : items === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <AppText muted>{ka.post.myPostsEmpty}</AppText>
            <AppButton title={ka.post.newTitle} onPress={() => router.push('/post/new')} />
          </View>
        ) : (
          items.map((p) => {
            const cat = describeCategory(groups, p.category_id);
            const expired = new Date(p.expires_at).getTime() < Date.now();
            const state =
              p.status === 'closed' ? ka.post.closedLabel : expired ? ka.post.expired : ka.post.daysLeft(daysLeft(p.expires_at));
            return (
              <View key={p.id} style={[styles.item, (p.status === 'closed' || expired) && { opacity: 0.6 }]}>
                <PostCard
                  categorySlug={cat.slug}
                  categoryName={cat.label}
                  body={p.body}
                  city={p.city}
                  budget={p.budget_note}
                  ago={`${timeAgo(p.created_at)} · ${state}`}
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                />
                <Pressable onPress={() => remove(p)} style={styles.remove} accessibilityRole="button">
                  <AppText weight="medium" style={styles.removeText}>
                    {ka.post.remove}
                  </AppText>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 24, lineHeight: 34 },
  content: { padding: 20, paddingTop: 4, gap: 14 },
  center: { alignItems: 'center', gap: 12, paddingTop: 32 },
  item: { gap: 6 },
  remove: { alignSelf: 'flex-end', paddingHorizontal: 6 },
  removeText: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
