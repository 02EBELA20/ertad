import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useCategories } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { toE164 } from '@/lib/phone';
import { LICENSED_SLUGS, fetchMyProvider, saveMyProvider } from '@/lib/provider';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

const TOTAL = 5;

export default function BecomeSpecialistScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { groups } = useCategories();
  const userId = session?.user.id ?? '';

  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState(session?.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : '');
  const [license, setLicense] = useState('');
  const [keepPhotoPath, setKeepPhotoPath] = useState<string | null>(null);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [newPhotoMime, setNewPhotoMime] = useState<string | null>(null);
  const [allowFeed, setAllowFeed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [visible, setVisible] = useState(true);

  const [about, setAbout] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill when editing an existing specialist profile.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = userId ? await fetchMyProvider(userId) : null;
        if (!alive) return;
        if (p) {
          setIsEdit(true);
          setCategoryIds(p.categoryIds);
          setCity(p.city);
          setBio(p.bio);
          setPrice(p.price_note ?? '');
          setPhone(p.contact_phone);
          setLicense(p.license_number ?? '');
          setKeepPhotoPath(p.photo_path);
          setAllowFeed(p.allow_feed);
          setVisible(p.visible);
          setConsent(true);
        }
      } catch {
        // new profile flow still works; saving will report any real problem
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // id -> {label, slug, parentSlug}
  const lookup = useMemo(() => {
    const m = new Map<string, { label: string; slug: string; topSlug: string }>();
    for (const g of groups) {
      m.set(g.parent.id, { label: g.parent.name_ka, slug: g.parent.slug, topSlug: g.parent.slug });
      for (const c of g.children) {
        m.set(c.id, { label: `${g.parent.name_ka} · ${c.name_ka}`, slug: c.slug, topSlug: g.parent.slug });
      }
    }
    return m;
  }, [groups]);

  const needsLicense = categoryIds.some((id) => LICENSED_SLUGS.includes(lookup.get(id)?.slug ?? ''));

  function addCategory(id: string | null) {
    if (!id) return;
    setError(null);
    setCategoryIds((cur) => {
      if (cur.includes(id)) return cur;
      if (cur.length >= 3) {
        setError(ka.specialist.maxCategories);
        return cur;
      }
      return [...cur, id];
    });
  }

  async function draftWithAi() {
    const text = about.trim();
    if (text.length < 5 || drafting) return;
    setDrafting(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('draft-provider-profile', { body: { text } });
    setDrafting(false);
    if (__DEV__) console.log('draft-provider-profile', { err, data });
    if (err || !data || !Array.isArray(data.ids)) {
      setError(ka.specialist.aiFailed);
      return;
    }
    const ids = (data.ids as string[]).filter((id) => lookup.has(id)).slice(0, 3);
    if (ids.length === 0 && !data.bio) {
      setError(ka.specialist.aiNoMatch);
      return;
    }
    if (ids.length > 0) setCategoryIds(ids);
    if (typeof data.bio === 'string' && data.bio) setBio(data.bio);
    if (typeof data.price === 'string' && data.price) setPrice(data.price);
    setAiDone(true);
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(ka.specialist.photoPermission);
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]) {
        setNewPhotoUri(res.assets[0].uri);
        setNewPhotoMime(res.assets[0].mimeType ?? null);
      }
    } catch {
      setError(ka.specialist.photoFailed);
    }
  }

  function removePhoto() {
    setNewPhotoUri(null);
    setNewPhotoMime(null);
    setKeepPhotoPath(null);
  }

  function validate(n: number): string | null {
    if (n === 1 && categoryIds.length === 0) return ka.specialist.needCategory;
    if (n === 2 && city.trim().length < 2) return ka.specialist.needCity;
    if (n === 3 && bio.trim().length < 10) return ka.specialist.needBio;
    if (n === 4) {
      if (!toE164(phone)) return ka.specialist.needPhone;
      if (needsLicense && license.trim().length < 2) return ka.specialist.needLicense;
    }
    if (n === 5 && !consent) return ka.specialist.needConsent;
    return null;
  }

  function next() {
    const msg = validate(step);
    if (msg) return setError(msg);
    setError(null);
    setStep(step + 1);
  }

  async function publish() {
    const msg = validate(5);
    if (msg) return setError(msg);
    const e164 = toE164(phone);
    if (!e164 || !userId) return setError(ka.specialist.needPhone);
    setBusy(true);
    setError(null);
    try {
      await saveMyProvider(userId, {
        city: city.trim(),
        bio: bio.trim(),
        price_note: price.trim() || null,
        contact_phone: e164,
        license_number: needsLicense ? license.trim() : null,
        visible,
        allow_feed: allowFeed,
        categoryIds,
        newPhotoUri,
        newPhotoMime,
        keepPhotoPath,
      });
      router.replace('/profile');
    } catch (e) {
      setError(`${ka.specialist.saveFailed}: ${e instanceof Error ? e.message : ''}`);
    }
    setBusy(false);
  }

  function goBack() {
    setError(null);
    if (step > 1) setStep(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }

  if (!loaded) return <SafeAreaView style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.specialist.back}>
            <Ionicons name={step > 1 ? 'chevron-back' : 'close'} size={26} color={colors.text} />
          </Pressable>
          <View style={styles.bars}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <View key={i} style={[styles.bar, i < step && styles.barOn]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText muted style={styles.small}>
            {ka.specialist.stepOf(step, TOTAL)}
          </AppText>

          {step === 1 ? (
            <View style={styles.section}>
              <AppText weight="bold" style={styles.title}>
                {ka.specialist.step1Title}
              </AppText>
              <AppText muted>{ka.specialist.aiHint}</AppText>

              <AppInput
                label={ka.specialist.aboutLabel}
                placeholder={ka.specialist.aboutPlaceholder}
                value={about}
                onChangeText={setAbout}
                multiline
                maxLength={800}
                style={styles.multiline}
              />
              <AppButton
                variant="secondary"
                title={ka.specialist.aiFill}
                onPress={draftWithAi}
                loading={drafting}
                disabled={about.trim().length < 5}
              />
              {aiDone ? (
                <AppText muted style={styles.small}>
                  {ka.specialist.aiDone}
                </AppText>
              ) : null}

              {categoryIds.length > 0 ? (
                <AppText muted style={styles.small}>
                  {ka.specialist.step1Hint}
                </AppText>
              ) : null}

              {categoryIds.map((id) => {
                const info = lookup.get(id);
                return (
                  <View key={id} style={styles.chosen}>
                    <MaterialCommunityIcons name={categoryIcon(info?.topSlug ?? '')} size={22} color={colors.accent} />
                    <AppText weight="medium" style={styles.flex}>
                      {info?.label ?? ''}
                    </AppText>
                    <Pressable
                      onPress={() => setCategoryIds((cur) => cur.filter((c) => c !== id))}
                      hitSlop={10}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}

              {categoryIds.length < 3 ? (
                <CategoryPicker value={null} onChange={addCategory} placeholder={categoryIds.length === 0 ? ka.specialist.manualCategory : ka.specialist.addCategory} />
              ) : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.section}>
              <AppText weight="bold" style={styles.title}>
                {ka.specialist.step2Title}
              </AppText>
              <AppInput
                label={ka.specialist.cityLabel}
                placeholder={ka.specialist.cityPlaceholder}
                value={city}
                onChangeText={setCity}
                autoFocus
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.section}>
              <AppText weight="bold" style={styles.title}>
                {ka.specialist.step3Title}
              </AppText>
              <AppInput
                label={ka.specialist.bioLabel}
                hint={ka.specialist.bioHint}
                placeholder={ka.specialist.bioPlaceholder}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={600}
                style={styles.multiline}
              />
              <AppInput
                label={ka.specialist.priceLabel}
                placeholder={ka.specialist.pricePlaceholder}
                value={price}
                onChangeText={setPrice}
                maxLength={60}
              />
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.section}>
              <AppText weight="bold" style={styles.title}>
                {ka.specialist.step4Title}
              </AppText>
              <AppInput
                label={ka.specialist.phoneLabel}
                hint={ka.specialist.phoneHint}
                placeholder={ka.auth.phonePlaceholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              {needsLicense ? (
                <>
                  <AppInput
                    label={ka.specialist.licenseLabel}
                    value={license}
                    onChangeText={setLicense}
                    maxLength={60}
                    autoCapitalize="characters"
                  />
                  <AppText muted style={styles.small}>
                    {ka.specialist.licenseNote}
                  </AppText>
                </>
              ) : null}
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.section}>
              <AppText weight="bold" style={styles.title}>
                {ka.specialist.step5Title}
              </AppText>

              <View style={styles.photoRow}>
                <Avatar path={keepPhotoPath} uri={newPhotoUri} size={96} />
                <View style={styles.photoActions}>
                  <AppButton
                    variant="secondary"
                    title={newPhotoUri || keepPhotoPath ? ka.specialist.photoChange : ka.specialist.photoAdd}
                    onPress={pickPhoto}
                  />
                  {newPhotoUri || keepPhotoPath ? (
                    <AppButton variant="ghost" title={ka.specialist.photoRemove} onPress={removePhoto} />
                  ) : null}
                </View>
              </View>
              <AppText muted style={styles.small}>
                {ka.specialist.photoHint}
              </AppText>

              <View style={styles.switchRow}>
                <AppText style={styles.flex}>{ka.specialist.allowFeed}</AppText>
                <Switch
                  value={allowFeed}
                  onValueChange={setAllowFeed}
                  trackColor={{ true: colors.accent, false: colors.border }}
                />
              </View>

              <Pressable style={styles.switchRow} onPress={() => setConsent(!consent)} accessibilityRole="checkbox">
                <View style={[styles.checkbox, consent && styles.checkboxOn]}>
                  {consent ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}
                </View>
                <AppText style={styles.flex}>{ka.specialist.consent}</AppText>
              </Pressable>
            </View>
          ) : null}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step < TOTAL ? (
            <AppButton title={ka.specialist.next} onPress={next} />
          ) : (
            <AppButton title={isEdit ? ka.specialist.save : ka.specialist.publish} onPress={publish} loading={busy} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14 },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  barOn: { backgroundColor: colors.accent },
  content: { padding: 20, gap: 16 },
  section: { gap: 16 },
  title: { fontSize: 28, lineHeight: 38 },
  small: { fontSize: 13, lineHeight: 18 },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 120, paddingTop: 14, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoActions: { flex: 1, gap: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { padding: 20, paddingTop: 8 },
});
