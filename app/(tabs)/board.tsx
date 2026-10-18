import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { CategoryPicker } from '@/components/CategoryPicker';
import { PostCard } from '@/components/PostCard';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

// Stage 3 skeleton of the board. Real posts arrive in stage 5.
// The sample cards below are shown in development builds only, to judge the design.
export default function BoardScreen() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText weight="bold" style={styles.title}>
            {ka.tabs.board}
          </AppText>
          <AppText muted>{ka.board.subtitle}</AppText>
        </View>

        <CategoryPicker value={category} onChange={setCategory} allowAll />

        {__DEV__ ? (
          <View style={styles.list}>
            <AppText muted style={styles.demoLabel}>
              {ka.board.demo}
            </AppText>
            <PostCard
              categorySlug="auto"
              categoryName="ავტო მომსახურება · დიაგნოსტიკა"
              body="მანქანა ძრავიდან უცნაურ ხმას გამოსცემს და ვერ გავიგე რა სჭირდება. ვინმეს თუ შეუძლია დახედვა, მადლობელი ვიქნები."
              city="ბრუკლინი, ნიუ-იორკი"
              budget="$80-მდე"
              ago="2 საათის წინ"
            />
            <PostCard
              categorySlug="care"
              categoryName="ძიძა და მოვლა · ძიძა"
              body="ვეძებ ქართულად მოლაპარაკე ძიძას 4 წლის ბავშვისთვის, კვირაში 3 დღე, საღამოს 5-დან 9 საათამდე."
              city="სტეიტენ აილენდი"
              ago="გუშინ"
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={colors.accent} />
            </View>
            <AppText weight="bold" style={styles.emptyTitle}>
              {ka.board.emptyTitle}
            </AppText>
            <AppText muted style={styles.emptyText}>
              {ka.board.emptyText}
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 28, lineHeight: 38 },
  list: { gap: 12 },
  demoLabel: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 16 },
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
