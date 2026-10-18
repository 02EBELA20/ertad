import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { CategoryPicker } from '@/components/CategoryPicker';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

// Temporary: the board arrives in stage 5. For now it shows the category picker
// so the two-level category list can be checked visually.
export default function BoardScreen() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText weight="bold" style={styles.title}>
          {ka.tabs.board}
        </AppText>
        <AppText muted>{ka.categories.boardHint}</AppText>
        <CategoryPicker value={category} onChange={setCategory} allowAll label={ka.categories.choose} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, lineHeight: 38 },
});
