import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { CosmosBackground } from '@/components/cosmos/CosmosBackground';

export function Screen({ children, cosmic }: { children: ReactNode; cosmic?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {cosmic ? <CosmosBackground /> : null}
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
});
