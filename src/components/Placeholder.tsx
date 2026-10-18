import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Screen } from './Screen';
import { ka } from '@/i18n/ka';

export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <AppText weight="bold" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.center}>
        <AppText muted>{ka.soon}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 38 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
