import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useCategories } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type Suggestion = { id: string; slug: string; label: string };

export default function HomeScreen() {
  const router = useRouter();
  const { groups } = useCategories();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  function describe(id: string): Suggestion | null {
    for (const g of groups) {
      if (g.parent.id === id) return { id, slug: g.parent.slug, label: g.parent.name_ka };
      const child = g.children.find((c) => c.id === id);
      if (child) return { id, slug: g.parent.slug, label: `${g.parent.name_ka} · ${child.name_ka}` };
    }
    return null;
  }

  async function onAsk() {
    const q = text.trim();
    if (q.length < 2 || busy) return;
    setBusy(true);
    setFailed(false);
    setResults(null);
    const { data, error } = await supabase.functions.invoke('suggest-category', { body: { text: q } });
    setBusy(false);
    if (__DEV__) console.log('suggest-category', { error, data });
    if (error || !data || !Array.isArray(data.ids)) {
      setFailed(true);
      return;
    }
    const found = (data.ids as string[]).map(describe).filter((s): s is Suggestion => s !== null);
    setResults(found);
  }

  function open(categoryId: string | null) {
    if (categoryId) router.push({ pathname: '/board', params: { category: categoryId } });
    else router.push('/board');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.spark}>
              <MaterialCommunityIcons name="auto-fix" size={26} color={colors.accent} />
            </View>
            <AppText weight="bold" style={styles.title}>
              {ka.home.title}
            </AppText>
            <AppText muted>{ka.home.assistantHint}</AppText>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                if (results || failed) {
                  setResults(null);
                  setFailed(false);
                }
              }}
              placeholder={ka.home.placeholder}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              style={styles.input}
              multiline
              maxLength={300}
              returnKeyType="search"
              blurOnSubmit
              onSubmitEditing={onAsk}
            />
            <Pressable
              onPress={onAsk}
              disabled={busy || text.trim().length < 2}
              style={[styles.send, (busy || text.trim().length < 2) && styles.sendOff]}
              accessibilityRole="button"
              accessibilityLabel={ka.home.ask}
            >
              {busy ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Ionicons name="arrow-forward" size={22} color={colors.onAccent} />
              )}
            </Pressable>
          </View>

          {results && results.length > 0 ? (
            <View style={styles.block}>
              <AppText muted style={styles.small}>
                {ka.home.suggested}
              </AppText>
              {results.map((s) => (
                <Pressable key={s.id} onPress={() => open(s.id)} style={styles.result} accessibilityRole="button">
                  <View style={styles.resultIcon}>
                    <MaterialCommunityIcons name={categoryIcon(s.slug)} size={22} color={colors.accent} />
                  </View>
                  <AppText weight="medium" style={styles.flex}>
                    {s.label}
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {(results && results.length === 0) || failed ? (
            <View style={styles.block}>
              <AppText muted>{failed ? ka.home.failed : ka.home.noMatch}</AppText>
              <Pressable onPress={() => open(null)} style={styles.link} accessibilityRole="button">
                <AppText weight="medium" style={styles.linkText}>
                  {ka.home.browseAll}
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Pressable onPress={() => open(null)} accessibilityRole="button">
              <AppText muted style={styles.linkText}>
                {ka.home.browseAll}
              </AppText>
            </Pressable>
            <Pressable onPress={() => router.push('/become-specialist')} accessibilityRole="button">
              <AppText muted style={styles.linkText}>
                {ka.home.canDo}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 32, gap: 24 },
  hero: { gap: 10 },
  spark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 30, lineHeight: 42 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 10,
    paddingLeft: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 140,
    paddingTop: 12,
    paddingBottom: 8,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'NotoSansGeorgian_400Regular',
    // @ts-expect-error web only: remove the browser focus outline
    outlineStyle: 'none',
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  sendOff: { opacity: 0.4 },
  block: { gap: 10 },
  small: { fontSize: 13, lineHeight: 18 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  link: { paddingVertical: 4 },
  linkText: { fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
});
