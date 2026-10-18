import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { US_STATES } from '@/lib/states';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type Props = {
  value: string | null;
  onChange: (code: string | null) => void;
  /** adds an "all states" row (for filters) */
  allowAll?: boolean;
  label?: string;
  placeholder?: string;
};

export function StatePicker({ value, onChange, allowAll, label, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return US_STATES;
    return US_STATES.filter((s) => s.name.toLowerCase().includes(t) || s.code.toLowerCase() === t);
  }, [q]);

  const current = US_STATES.find((s) => s.code === value);
  const text = current ? `${current.name} (${current.code})` : allowAll ? ka.state.all : (placeholder ?? ka.state.choose);

  function close() {
    setOpen(false);
    setQ('');
  }
  function choose(code: string | null) {
    onChange(code);
    close();
  }

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText weight="medium" muted style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable onPress={() => setOpen(true)} style={styles.field} accessibilityRole="button">
        <Ionicons name="map-outline" size={18} color={colors.textMuted} />
        <AppText numberOfLines={1} style={[styles.fieldText, !current && !allowAll && { color: colors.textMuted }]}>
          {text}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.cancel}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
            <AppText weight="bold" style={styles.headerTitle}>
              {ka.state.choose}
            </AppText>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={ka.state.search}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              style={styles.search}
              autoCorrect={false}
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {allowAll && !q ? (
              <Pressable style={styles.row} onPress={() => choose(null)} accessibilityRole="button">
                <AppText weight={value === null ? 'bold' : 'regular'} style={[styles.rowText, value === null && styles.on]}>
                  {ka.state.all}
                </AppText>
                {value === null ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>
            ) : null}
            {list.map((s) => (
              <Pressable key={s.code} style={styles.row} onPress={() => choose(s.code)} accessibilityRole="button">
                <AppText weight={value === s.code ? 'bold' : 'regular'} style={[styles.rowText, value === s.code && styles.on]}>
                  {s.name} ({s.code})
                </AppText>
                {value === s.code ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>
            ))}
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
    gap: 10,
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
  searchWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  search: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
    // @ts-expect-error web only: remove the browser focus outline
    outlineStyle: 'none',
  },
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
  on: { color: colors.accent },
});
