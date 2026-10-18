import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { categoryIcon } from '@/lib/categoryIcons';
import { colors } from '@/theme/colors';

export type PostCardProps = {
  categorySlug: string; // top-level category slug, picks the icon
  categoryName: string;
  body: string;
  city: string;
  budget?: string | null;
  ago: string;
  author?: string | null;
  mineLabel?: string;
  onPress?: () => void;
};

export function PostCard({
  categorySlug,
  categoryName,
  body,
  city,
  budget,
  ago,
  author,
  mineLabel,
  onPress,
}: PostCardProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={categoryIcon(categorySlug)} size={24} color={colors.accent} />
        </View>
        <View style={styles.head}>
          <AppText weight="bold" numberOfLines={1}>
            {categoryName}
          </AppText>
          <AppText muted style={styles.small}>
            {[author, ago].filter(Boolean).join(' · ')}
            {mineLabel ? `  ·  ${mineLabel}` : ''}
          </AppText>
        </View>
        {budget ? (
          <View style={styles.budget}>
            <AppText weight="medium" style={styles.budgetText}>
              {budget}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText numberOfLines={3} style={styles.body}>
        {body}
      </AppText>

      <View style={styles.footer}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <AppText muted style={styles.small}>
          {city}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  head: { flex: 1 },
  small: { fontSize: 13, lineHeight: 18 },
  budget: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  budgetText: { color: colors.accent, fontSize: 13, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
