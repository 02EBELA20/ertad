import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { CategoryPicker } from '@/components/CategoryPicker';
import { SubcategoryChips } from '@/components/SubcategoryChips';
import { ProviderCard } from '@/components/ProviderCard';
import { useCategories } from '@/lib/categories';
import { fetchProviders, ProviderListItem } from '@/lib/provider';
import { ReviewSummary, fetchSummaries } from '@/lib/reviews';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function ProfessionalsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const { groups } = useCategories();

  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [items, setItems] = useState<ProviderListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [ratings, setRatings] = useState<Map<string, ReviewSummary>>(new Map());

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  // A top-level category with children also matches everything under it.
  const filterIds = useMemo(() => {
    if (!category) return null;
    const g = groups.find((x) => x.parent.id === category);
    return g ? [g.parent.id, ...g.children.map((c) => c.id)] : [category];
  }, [category, groups]);

  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) {
      m.set(g.parent.id, g.parent.name_ka);
      for (const c of g.children) m.set(c.id, c.name_ka);
    }
    return m;
  }, [groups]);

  const load = useCallback(async () => {
    setItems(null);
    setFailed(false);
    try {
      const list = await fetchProviders(filterIds);
      setItems(list);
      fetchSummaries(list.map((p) => p.user_id))
        .then(setRatings)
        .catch(() => {});
    } catch {
      setFailed(true);
    }
  }, [filterIds]);

  useEffect(() => {
    // wait until categories are known when a filter is set, so the parent expands to its children
    if (category && groups.length === 0) return;
    load();
  }, [load, category, groups.length]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText weight="bold" style={styles.title}>
          {ka.professionals.title}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <CategoryPicker value={category} onChange={setCategory} allowAll />

        <SubcategoryChips groups={groups} category={category} onChange={setCategory} />

        {failed ? (
          <View style={styles.center}>
            <AppText muted>{ka.professionals.loadFailed}</AppText>
            <AppButton variant="secondary" title={ka.retry} onPress={load} />
          </View>
        ) : items === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="account-search-outline" size={34} color={colors.accent} />
            </View>
            <AppText weight="bold" style={styles.emptyTitle}>
              {ka.professionals.empty}
            </AppText>
            <AppText muted style={styles.emptyText}>
              {ka.professionals.emptyHint}
            </AppText>
            <AppButton title={ka.professionals.becomeOne} onPress={() => router.push('/become-specialist')} />
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((p) => (
              <ProviderCard
                key={p.user_id}
                name={p.display_name || '—'}
                photoPath={p.photo_path}
                labels={p.categoryIds.map((id) => names.get(id)).filter((n): n is string => !!n)}
                city={p.city}
                priceNote={p.price_note}
                bio={p.bio}
                mine={p.user_id === session?.user.id}
                mineLabel={ka.professionals.yours}
                rating={ratings.get(p.user_id) ?? null}
                onPress={() => router.push({ pathname: '/provider/[id]', params: { id: p.user_id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 24, lineHeight: 34 },
  content: { padding: 20, paddingTop: 4, gap: 20 },
  list: { gap: 12 },
  chips: { gap: 8, paddingRight: 20 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, lineHeight: 20 },
  center: { alignItems: 'center', gap: 12, paddingTop: 32 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 18, lineHeight: 28, textAlign: 'center' },
  emptyText: { textAlign: 'center' },
});
