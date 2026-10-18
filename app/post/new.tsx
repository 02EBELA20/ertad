import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useCategories } from '@/lib/categories';
import { toE164 } from '@/lib/phone';
import { createPost } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function NewPostScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { groups } = useCategories();
  const userId = session?.user.id ?? '';

  const [idea, setIdea] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [city, setCity] = useState(profile?.city ?? '');
  const [budget, setBudget] = useState('');
  const [phone, setPhone] = useState(session?.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : '');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validIds = new Set(groups.flatMap((g) => [g.parent.id, ...g.children.map((c) => c.id)]));

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/board');
  }

  async function draftWithAi() {
    const text = idea.trim();
    if (text.length < 5 || drafting) return;
    setDrafting(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('draft-post', { body: { text } });
    setDrafting(false);
    if (__DEV__) console.log('draft-post', { err, data });
    if (err || !data || !Array.isArray(data.ids)) {
      setError(ka.post.aiFailed);
      return;
    }
    const id = (data.ids as string[]).find((x) => validIds.has(x));
    if (!id && !data.body) {
      setError(ka.post.aiNoMatch);
      return;
    }
    if (id) setCategoryId(id);
    if (typeof data.body === 'string' && data.body) setBody(data.body);
    if (typeof data.budget === 'string' && data.budget) setBudget(data.budget);
    setAiDone(true);
  }

  async function publish() {
    if (busy) return;
    if (!categoryId) return setError(ka.post.needCategory);
    if (body.trim().length < 10) return setError(ka.post.needBody);
    if (city.trim().length < 2) return setError(ka.post.needCity);
    let e164 = '';
    if (phone.trim()) {
      const n = toE164(phone);
      if (!n) return setError(ka.post.badPhone);
      e164 = n;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createPost(userId, { categoryId, city, body, budget, phone: e164 });
      router.replace({ pathname: '/post/[id]', params: { id } });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setError(msg.includes('daily_limit') ? ka.post.limit : ka.post.failed);
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText weight="bold" style={styles.title}>
          {ka.post.newTitle}
        </AppText>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText muted>{ka.post.newHint}</AppText>

          <TextInput
            value={idea}
            onChangeText={(t) => setIdea(t.slice(0, 800))}
            placeholder={ka.post.textPlaceholder}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            multiline
            style={styles.idea}
          />
          <AppButton
            variant="secondary"
            title={ka.post.aiButton}
            onPress={draftWithAi}
            loading={drafting}
            disabled={idea.trim().length < 5}
          />
          {aiDone ? (
            <AppText muted style={styles.small}>
              {ka.post.aiDone}
            </AppText>
          ) : null}

          <CategoryPicker
            value={categoryId}
            onChange={setCategoryId}
            label={ka.post.category}
            placeholder={ka.post.categoryPlaceholder}
          />

          <View style={styles.field}>
            <AppText weight="medium" style={styles.label}>
              {ka.post.body}
            </AppText>
            <TextInput
              value={body}
              onChangeText={(t) => setBody(t.slice(0, 600))}
              multiline
              selectionColor={colors.accent}
              style={styles.bodyInput}
            />
            <AppText muted style={styles.small}>
              {body.length} / 600
            </AppText>
          </View>

          <AppInput label={ka.post.city} value={city} onChangeText={setCity} />
          <AppInput
            label={ka.post.budget}
            placeholder={ka.post.budgetPlaceholder}
            value={budget}
            onChangeText={(t) => setBudget(t.slice(0, 60))}
          />
          <AppInput
            label={ka.post.phone}
            hint={ka.post.phoneHint}
            placeholder={ka.auth.phonePlaceholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <AppButton title={ka.post.publish} onPress={publish} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 24, lineHeight: 34 },
  content: { padding: 20, paddingTop: 4, gap: 16 },
  idea: {
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'NotoSansGeorgian_400Regular',
    fontSize: 17,
    lineHeight: 26,
    padding: 16,
    textAlignVertical: 'top',
    // @ts-expect-error web only: remove the browser focus outline
    outlineStyle: 'none',
  },
  field: { gap: 6 },
  label: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  bodyInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'NotoSansGeorgian_400Regular',
    fontSize: 16,
    lineHeight: 24,
    padding: 14,
    textAlignVertical: 'top',
    // @ts-expect-error web only: remove the browser focus outline
    outlineStyle: 'none',
  },
  small: { fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger },
});
