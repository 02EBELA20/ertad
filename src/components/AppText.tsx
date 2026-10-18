import { Text, TextProps, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type Weight = 'regular' | 'medium' | 'bold';

const fontFamily: Record<Weight, string> = {
  regular: 'NotoSansGeorgian_400Regular',
  medium: 'NotoSansGeorgian_500Medium',
  bold: 'NotoSansGeorgian_700Bold',
};

type Props = TextProps & { weight?: Weight; muted?: boolean };

export function AppText({ weight = 'regular', muted, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        { fontFamily: fontFamily[weight] },
        muted && { color: colors.textMuted },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontSize: 16, lineHeight: 24 },
});
