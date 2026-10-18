import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@/theme/colors';

type Props = TextInputProps & { label: string; hint?: string };

export function AppInput({ label, hint, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <AppText weight="medium" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, style]}
      />
      {hint ? (
        <AppText muted style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 18,
    fontFamily: 'NotoSansGeorgian_400Regular',
  },
  hint: { fontSize: 13, lineHeight: 18 },
});
