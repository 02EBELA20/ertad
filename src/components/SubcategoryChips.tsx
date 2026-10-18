import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { CategoryGroup } from '@/lib/categories';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

/** Horizontal chips: "all" (the main category) plus its subcategories. */
export function SubcategoryChips({
  groups,
  category,
  onChange,
}: {
  groups: CategoryGroup[];
  category: string | null;
  onChange: (id: string) => void;
}) {
  const group = groups.find((g) => g.parent.id === category || g.children.some((c) => c.id === category));
  if (!group || group.children.length === 0) return null;
  const items = [{ id: group.parent.id, name_ka: ka.professionals.allInCategory }, ...group.children];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((c) => {
        const on = category === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
          >
            <AppText weight="medium" style={[styles.chipText, on && { color: colors.onAccent }]}>
              {c.name_ka}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
