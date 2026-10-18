import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <AppText weight="bold" style={styles.title}>
        {ka.home.title}
      </AppText>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
          onPress={() => router.push('/board')}
        >
          <AppText weight="bold" style={[styles.btnTitle, { color: colors.onAccent }]}>
            {ka.home.need}
          </AppText>
          <AppText style={{ color: colors.onAccent }}>{ka.home.needHint}</AppText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, styles.secondary, pressed && styles.pressed]}
          onPress={() => router.push('/profile')}
        >
          <AppText weight="bold" style={styles.btnTitle}>
            {ka.home.canDo}
          </AppText>
          <AppText muted>{ka.home.canDoHint}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 38, marginBottom: 24 },
  buttons: { flex: 1, gap: 16, paddingBottom: 24 },
  btn: { flex: 1, borderRadius: 20, padding: 24, justifyContent: 'flex-end', gap: 4 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnTitle: { fontSize: 32, lineHeight: 42 },
  pressed: { opacity: 0.85 },
});
