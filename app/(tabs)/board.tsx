import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { CategoryPicker } from '@/components/CategoryPicker';
import { StatePicker } from '@/components/StatePicker';
import { PostCard } from '@/components/PostCard';
import { SubcategoryChips } from '@/components/SubcategoryChips';
import { useCategories } from '@/lib/categories';
import { BoardPost, describeCategory, fetchBoardPosts, timeAgo } from '@/lib/posts';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function BoardScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const { groups } = useCategories();
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [stateFilter, setStateFilter] = useState<string | null>(profile?.state ?? null);
  const [items, setItems] = useState<BoardPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  // A main category also matches everything under it.
  const filterIds = useMemo(() => {
    if (!category) return null;
    const g = groups.find((x) => x.parent.id === category);
    return g ? [g.parent.id, ...g.children.map((c) => c.id)] : [category];
  }, [category, groups]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setItems(await fetchBoardPosts(filterIds, stateFilter));
    } catch {
      setFailed(true);
    }
  }, [filterIds, stateFilter]);

  // Reload when the screen gets focus (e.g. after publishing) or the filter changes.
  useFocusEffect(
    useCallback(() => {
      if (category && groups.length === 0) return;
      load();
    }, [load, category, groups.length]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <AppText weight="bold" style={styles.title}>
              {ka.tabs.board}
            </AppText>
            <AppText muted>{ka.board.subtitle}</AppText>
          </View>
          <Pressable onPress={() => router.push('/post/new')} style={styles.add} accessibilityRole="button">
            <Ionicons name="add" size={20} color={colors.onAccent} />
            <AppText weight="bold" style={styles.addText}>
              {ka.post.add}
            </AppText>
          </Pressable>
        </View>

        <CategoryPicker value={category} onChange={setCategory} allowAll />
        <StatePicker value={stateFilter} onChange={setStateFilter} allowAll />
        <SubcategoryChips groups={groups} category={category} onChange={setCategory} />

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
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={colors.accent} />
            </View>
            <AppText weight="bold" style={styles.emptyTitle}>
              {ka.board.emptyTitle}
            </AppText>
            <AppText muted style={styles.emptyText}>
              {ka.board.emptyText}
            </AppText>
            <AppButton title={ka.post.newTitle} onPress={() => router.push('/post/new')} />
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((p) => {
              const cat = describeCategory(groups, p.category_id);
              return (
                <PostCard
                  key={p.id}
                  categorySlug={cat.slug}
                  categoryName={cat.label}
                  body={p.body}
                  city={p.city}
                  budget={p.budget_note}
                  ago={timeAgo(p.created_at)}
                  author={p.author_name}
                  mineLabel={p.author_id === session?.user.id ? ka.post.mine : undefined}
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 20, gap: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 28, lineHeight: 38 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  addText: { color: colors.onAccent, fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  center: { alignItems: 'center', gap: 12, paddingTop: 32, paddingHorizontal: 16 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 20, lineHeight: 30, textAlign: 'center' },
  emptyText: { textAlign: 'center' },
});
