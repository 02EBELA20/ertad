import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { useCategories, CategoryGroup } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type Props = {
  /** selected category id (a subcategory, or a top-level one that has no children) */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** adds an "all" row that clears the selection (for filters) */
  allowAll?: boolean;
  label?: string;
  placeholder?: string;
  /** when set, the picker opens directly inside this top-level category */
  startGroupId?: string | null;
  /** opens the picker immediately (full-screen start of a flow) */
  autoOpen?: boolean;
  /** called when the picker is closed without choosing anything */
  onDismiss?: () => void;
};

function Row({
  label,
  onPress,
  chevron,
  selected,
}: {
  label: string;
  onPress: () => void;
  chevron?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <AppText weight={selected ? 'bold' : 'regular'} style={[styles.rowText, selected && styles.rowTextSelected]}>
        {label}
      </AppText>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      {selected && !chevron ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
    </Pressable>
  );
}

export function CategoryPicker({ value, onChange, allowAll, label, placeholder, startGroupId, autoOpen, onDismiss }: Props) {
  const { groups, loading, error, reload } = useCategories();
  const [open, setOpen] = useState(!!autoOpen);
  const chose = useRef(false);
  const [group, setGroup] = useState<CategoryGroup | null>(null);

  const selectedText = useMemo(() => {
    if (!value) return null;
    for (const g of groups) {
      if (g.parent.id === value) return g.parent.name_ka;
      const child = g.children.find((c) => c.id === value);
      if (child) return `${g.parent.name_ka} · ${child.name_ka}`;
    }
    return null;
  }, [groups, value]);

  function openPicker() {
    chose.current = false;
    setGroup(startGroupId ? (groups.find((g) => g.parent.id === startGroupId) ?? null) : null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setGroup(null);
    if (!chose.current) onDismiss?.();
    chose.current = false;
  }

  function choose(id: string | null) {
    chose.current = true;
    onChange(id);
    close();
  }

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText weight="medium" muted style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <Pressable onPress={openPicker} style={styles.field} accessibilityRole="button">
        <AppText numberOfLines={1} style={[styles.fieldText, !selectedText && { color: colors.textMuted }]}>
          {selectedText ?? placeholder ?? (allowAll ? ka.categories.all : ka.categories.choose)}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Pressable
              onPress={group ? () => setGroup(null) : close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={group ? ka.categories.back : ka.cancel}
            >
              <Ionicons name={group ? 'chevron-back' : 'close'} size={26} color={colors.text} />
            </Pressable>
            {group ? <MaterialCommunityIcons name={categoryIcon(group.parent.slug)} size={24} color={colors.accent} /> : null}
            <AppText weight="bold" style={styles.headerTitle} numberOfLines={1}>
              {group ? group.parent.name_ka : ka.categories.choose}
            </AppText>
          </View>

          <ScrollView>
            {loading ? (
              <AppText muted style={styles.msg}>
                {ka.categories.loading}
              </AppText>
            ) : error ? (
              <View style={styles.msg}>
                <AppText muted>{ka.loadFailed}</AppText>
                <AppButton variant="secondary" title={ka.retry} onPress={reload} />
              </View>
            ) : group ? (
              <>
                <Row label={ka.categories.wholeCategory} selected={value === group.parent.id} onPress={() => choose(group.parent.id)} />
                {group.children.map((c) => (
                  <Row key={c.id} label={c.name_ka} selected={value === c.id} onPress={() => choose(c.id)} />
                ))}
              </>
            ) : (
              <>
                {allowAll ? <Row label={ka.categories.all} selected={value === null} onPress={() => choose(null)} /> : null}
                <View style={styles.grid}>
                  {groups.map((g) => (
                    <Pressable
                      key={g.parent.id}
                      style={styles.tile}
                      accessibilityRole="button"
                      onPress={() => (g.children.length > 0 ? setGroup(g) : choose(g.parent.id))}
                    >
                      <View style={styles.tileIcon}>
                        <MaterialCommunityIcons name={categoryIcon(g.parent.slug)} size={30} color={colors.accent} />
                      </View>
                      <AppText weight="medium" style={styles.tileText} numberOfLines={2}>
                        {g.parent.name_ka}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, lineHeight: 20 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldText: { flex: 1 },
  modal: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { flex: 1, fontSize: 20, lineHeight: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  rowTextSelected: { color: colors.accent },
  msg: { padding: 20, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 20 },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  tileText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
