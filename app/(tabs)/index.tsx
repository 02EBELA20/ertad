import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { CosmosBackground } from '@/components/cosmos/CosmosBackground';
import { OrbitFeed } from '@/components/OrbitFeed';
import { FeedItem, fetchHomeFeed } from '@/lib/feed';
import { useCategories } from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function HomeScreen() {
  const router = useRouter();
  const { groups } = useCategories();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<unknown[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // A fresh random set every time the home screen gets focus.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchHomeFeed(12)
        .then((items) => alive && setFeed(items))
        .catch(() => alive && setFeed([]));
      return () => {
        alive = false;
      };
    }, []),
  );

  function parentOf(id: string): string | null {
    for (const g of groups) {
      if (g.parent.id === id || g.children.some((c) => c.id === id)) return g.parent.id;
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
    if (__DEV__ && data.debug) setDebugInfo(JSON.stringify(data.debug).slice(0, 400));
    // Go straight to the main category of the best match; the user picks a subcategory there.
    const first = (data.ids as string[])[0];
    const parentId = first ? parentOf(first) : null;
    if (parentId) {
      setText('');
      router.push({ pathname: '/professionals', params: { category: parentId } });
      return;
    }
    setResults([]);
  }

  function open(categoryId: string | null) {
    if (categoryId) router.push({ pathname: '/professionals', params: { category: categoryId } });
    else router.push('/professionals');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CosmosBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.spark}>
              <MaterialCommunityIcons name="auto-fix" size={26} color={colors.accent} />
            </View>
            <AppText weight="bold" style={styles.title}>
              {ka.home.title}
            </AppText>
            <AppText style={styles.heroHint}>{ka.home.assistantHint}</AppText>
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

          {(results && results.length === 0) || failed ? (
            <View style={styles.block}>
              <AppText muted>{failed ? ka.home.failed : ka.home.noMatch}</AppText>
              {__DEV__ && debugInfo ? (
                <AppText muted style={styles.small}>
                  {debugInfo}
                </AppText>
              ) : null}
              <Pressable onPress={() => open(null)} style={styles.link} accessibilityRole="button">
                <AppText weight="medium" style={styles.linkText}>
                  {ka.home.browseAll}
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {feed.length > 0 ? (
            <OrbitFeed
              items={feed}
              groups={groups}
              onOpen={(item) =>
                item.kind === 'offer'
                  ? router.push({ pathname: '/provider/[id]', params: { id: item.ref_id } })
                  : router.push({ pathname: '/post/[id]', params: { id: item.ref_id } })
              }
            />
          ) : null}

          <View style={styles.footer}>
            <Pressable onPress={() => open(null)} accessibilityRole="button">
              <AppText style={[styles.linkText, { color: colors.accent }]}>
                {ka.home.browseAll}
              </AppText>
            </Pressable>
            <Pressable onPress={() => router.push('/become-specialist')} accessibilityRole="button">
              <AppText style={[styles.linkText, { color: colors.accent }]}>
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
  hero: { gap: 10, alignItems: 'center' },
  spark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,28,46,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 30, lineHeight: 42, textAlign: 'center', color: colors.accent },
  heroHint: { textAlign: 'center', color: 'rgba(240,215,160,0.85)', fontSize: 15, lineHeight: 22, maxWidth: 320 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 10,
    paddingLeft: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19,28,46,0.72)',
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
    backgroundColor: 'rgba(19,28,46,0.72)',
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 8 },
});
