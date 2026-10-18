import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { useCategories } from '@/lib/categories';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type Props = {
  /** selected category id (a subcategory, or a top-level one that has no children) */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** show an "all" chip that clears the selection (for filters) */
  allowAll?: boolean;
};

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <AppText weight="medium" style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CategoryPicker({ value, onChange, allowAll }: Props) {
  const { groups, loading, error, reload } = useCategories();
  const [openParent, setOpenParent] = useState<string | null>(null);

  if (loading) return <AppText muted>{ka.categories.loading}</AppText>;
  if (error) {
    return (
      <View style={styles.block}>
        <AppText muted>{ka.loadFailed}</AppText>
        <AppButton variant="secondary" title={ka.retry} onPress={reload} />
      </View>
    );
  }

  const current = groups.find(
    (g) => g.parent.id === openParent || g.children.some((c) => c.id === value) || g.parent.id === value,
  );
  const activeParentId = openParent ?? current?.parent.id ?? null;
  const activeGroup = groups.find((g) => g.parent.id === activeParentId);

  function pickParent(id: string, hasChildren: boolean) {
    setOpenParent(id);
    onChange(hasChildren ? null : id);
  }

  return (
    <View style={styles.block}>
      <View style={styles.wrap}>
        {allowAll ? (
          <Chip
            label={ka.categories.all}
            active={activeParentId === null && value === null}
            onPress={() => {
              setOpenParent(null);
              onChange(null);
            }}
          />
        ) : null}
        {groups.map((g) => (
          <Chip
            key={g.parent.id}
            label={g.parent.name_ka}
            active={g.parent.id === activeParentId}
            onPress={() => pickParent(g.parent.id, g.children.length > 0)}
          />
        ))}
      </View>

      {activeGroup && activeGroup.children.length > 0 ? (
        <View style={styles.sub}>
          <AppText muted style={styles.subTitle}>
            {ka.categories.chooseSub}
          </AppText>
          <View style={styles.wrap}>
            {activeGroup.children.map((c) => (
              <Chip key={c.id} label={c.name_ka} active={c.id === value} onPress={() => onChange(c.id)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, lineHeight: 22 },
  chipTextActive: { color: colors.onAccent },
  sub: { gap: 8 },
  subTitle: { fontSize: 13, lineHeight: 18 },
});
